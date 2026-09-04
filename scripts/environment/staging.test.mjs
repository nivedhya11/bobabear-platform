import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  BOBA_BUILD_IMAGES,
  BOBA_RUNTIME_SERVICES,
  STAGING_PUBLIC_ORIGIN,
  assertImageRevisions,
  assertRunningProvenance,
  assertServiceabilitySmokeResponse,
  closedStdinInherit,
  createStagingWorkforceUser,
  discardMismatchedOperatorCandidateTag,
  ensureStagingEnvFiles,
  isFullGitSha,
  normalizeEnvAssignment,
  normalizeStagingAuthOriginEnv,
  readSecretStdinBuffer,
  runPodmanWithSecretStdin,
  spawnIgnoringStdin,
  spawnWithStdinBuffer,
  stopAndRemoveLegacyPostgres,
  zeroSecretBuffer,
} from "./staging.mjs";

const candidateSha = "6d925496deebcf19e5a82659e3e33dc81faccac3";

test("staging status declares an exact merged Git-tree artifact source", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /console\.log\("STAGING_ARTIFACT_SOURCE EXACT_MERGED_GIT_TREE"\)/);
  assert.match(
    source,
    /console\.log\("EXACT_GIT_TREE_MECHANISM git archive HEAD to isolated temporary build context"\)/,
  );
  assert.match(source, /console\.log\("LIVE_UNTRACKED_CONTENT_CAN_AFFECT_STAGING_ARTIFACT NO"\)/);
  assert.match(source, /git -C .* archive .* \| tar -x -C/);
});

test("staging serviceability smoke fails closed for indeterminate or unexpected responses", () => {
  assert.doesNotThrow(() =>
    assertServiceabilitySmokeResponse("origin", "SERVICEABLE", {
      httpStatus: 200,
      decisionStatus: "SERVICEABLE",
    }),
  );
  assert.throws(
    () =>
      assertServiceabilitySmokeResponse("origin", "SERVICEABLE", {
        httpStatus: 200,
        decisionStatus: "INDETERMINATE",
        reason: "CONFIGURATION_INCONSISTENT",
      }),
    /CONFIGURATION_INCONSISTENT/,
  );
});

test("staging deploy passes the rootless Podman project to the customer-auth smoke", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /--compose-provider[\s\S]*podman-compose/);
  assert.match(source, /--compose-project[\s\S]*STAGING_PROJECT/);
  assert.match(source, /--compose-file[\s\S]*compose\.yaml/);
});

test("staging deploy retains the current-main Podman hardening safeguards", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /git -C .* archive .* \| tar -x -C/);
  assert.match(source, /podman-compose", \["-f", "compose\.yaml", "-p", STAGING_PROJECT/);
  assert.match(source, /\["up", "-d", "--force-recreate", "--no-deps", \.\.\.services\]/);
  assert.match(source, /ensurePersistentPostgres\(buildDir, initDir\)/);
  assert.match(source, /POSTGRES_INIT_MOUNT_REFRESH YES/);
  assert.match(source, /POSTGRES_VOLUME_PRESERVED YES/);
  assert.match(source, /upAndWait\(buildDir, BOBA_RUNTIME_SERVICES, \{ BOBA_POSTGRES_INIT_DIR: initDir \}\)/);
  assert.doesNotMatch(source, /upAndWait\(buildDir, \["postgres"\]\)/);
  assert.doesNotMatch(source, /--wait/);
  assert.match(source, /State\.Health\.Status/);
  assert.match(source, /boba-bear_app_1/);
  assert.match(source, /PERSISTENT_DB_VOLUME \$\{STAGING_PROJECT\}_postgres-data/);
  assert.doesNotMatch(source, /postgres-data.*rmSync|rmSync.*postgres-data/);
});

test("all final BOBA image targets persist the OCI revision label", () => {
  const source = readFileSync(path.resolve("Dockerfile"), "utf8");
  for (const target of ["tooling", "customer-auth-runtime", "workforce-auth-runtime", "customer-commerce-runtime", "operations-runtime", "web-runtime"]) {
    assert.match(source, new RegExp(`FROM .* AS ${target}\\nARG BOBA_BUILD_SHA\\nLABEL org\\.opencontainers\\.image\\.revision=\\$\\{BOBA_BUILD_SHA\\}`));
  }
});

test("Compose forwards BOBA_BUILD_SHA to every BOBA build, never PostgreSQL", () => {
  const source = readFileSync(path.resolve("compose.yaml"), "utf8");
  const builds = [...source.matchAll(/    build:\n([\s\S]*?)(?=    image:)/g)].map((match) => match[1]);
  assert.equal(builds.length, 16);
  for (const build of builds) {
    assert.match(build, /BOBA_BUILD_SHA: "\$\{BOBA_BUILD_SHA:-unversioned-local\}"/);
  }
  const postgres = source.match(/  postgres:\n([\s\S]*?)(?=\n  [a-z-]+:)/)?.[1] ?? "";
  assert.doesNotMatch(postgres, /BOBA_BUILD_SHA|org\.opencontainers\.image\.revision/);
});

test("staging PostgreSQL uses a durable configurable init mount", () => {
  const compose = readFileSync(path.resolve("compose.yaml"), "utf8");
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  const postgres = compose.match(/  postgres:\n([\s\S]*?)(?=\n  [a-z-]+:)/)?.[1] ?? "";
  assert.match(postgres, /\$\{BOBA_POSTGRES_INIT_DIR:-\.\/docker\/postgres\/init\}/);
  assert.match(source, /STAGING_RUNTIME_ASSETS_DIR/);
  assert.match(source, /materializeStagingPostgresInit\(buildDir, sha\)/);
  assert.match(source, /cpSync\(source, destination, \{ recursive: true, preserveTimestamps: true \}\)/);
  assert.match(source, /rmSync\(buildDir, \{ recursive: true, force: true \}\)/);
  assert.match(source, /BOBA_POSTGRES_INIT_DIR: initDir/);
});

test("staging recovery is limited to the known legacy PostgreSQL bind-mount defect", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /recover-postgres/);
  assert.match(source, /assertLegacyPostgresRecoveryTarget/);
  assert.match(source, /startsWith\("\/tmp\/boba-staging-build-"\)/);
  assert.match(source, /mount\.Name === volume && mount\.Destination === "\/var\/lib\/postgresql"/);
  assert.match(source, /stopAndRemoveLegacyPostgres\(legacy\)/);
  assert.doesNotMatch(source, /volume", "rm"/);
});

test("staging recovery tolerates absent dependent runtimes and recreates only with the durable init path", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  const recovery = source.match(/function recoverPostgres\(candidate\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(recovery, /catch \{ \/\* absent containers are permitted \*\//);
  assert.match(recovery, /podmanCompose\(buildDir, \["up", "-d", "postgres"\], \{ BOBA_POSTGRES_INIT_DIR: initDir \}\)/);
  assert.match(recovery, /upAndWait\(buildDir, BOBA_RUNTIME_SERVICES, \{ BOBA_POSTGRES_INIT_DIR: initDir \}\)/);
  assert.doesNotMatch(recovery, /"postgres".*BOBA_RUNTIME_SERVICES/);
});

test("staging recovery stops a running PostgreSQL container before removing it", () => {
  const commands = [];
  const legacy = { container: "boba-staging_postgres_1", database: { State: { Status: "running" } } };
  stopAndRemoveLegacyPostgres(legacy, () => ({ State: { Status: "exited" } }), (args) => commands.push(args));
  assert.deepEqual(commands, [["stop", "-t", "30", "boba-staging_postgres_1"], ["rm", "boba-staging_postgres_1"]]);
});

test("staging recovery removes an already stopped PostgreSQL container without stopping it again", () => {
  const commands = [];
  const legacy = { container: "boba-staging_postgres_1", database: { State: { Status: "exited" } } };
  stopAndRemoveLegacyPostgres(legacy, () => { throw new Error("not inspected"); }, (args) => commands.push(args));
  assert.deepEqual(commands, [["rm", "boba-staging_postgres_1"]]);
});

test("staging recovery refuses PostgreSQL removal until a running target has stopped", () => {
  const commands = [];
  const legacy = { container: "boba-staging_postgres_1", database: { State: { Status: "running" } } };
  assert.throws(
    () => stopAndRemoveLegacyPostgres(legacy, () => ({ State: { Status: "running" } }), (args) => commands.push(args)),
    /did not stop cleanly/,
  );
  assert.deepEqual(commands, [["stop", "-t", "30", "boba-staging_postgres_1"]]);
});

test("staging recovery fails closed for an unexpected PostgreSQL state", () => {
  const commands = [];
  const legacy = { container: "boba-staging_postgres_1", database: { State: { Status: "paused" } } };
  assert.throws(
    () => stopAndRemoveLegacyPostgres(legacy, () => ({ State: { Status: "paused" } }), (args) => commands.push(args)),
    /not safely removable/,
  );
  assert.deepEqual(commands, []);
});

test("staging workforce operator uses direct Podman without Compose dependency reconciliation", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  const compose = readFileSync(path.resolve("compose.yaml"), "utf8");
  assert.match(source, /const image = `boba-bear-staging-workforce-operator:\$\{candidate\.head\}`/);
  assert.match(source, /buildPodman\(\s*\n\s*\[\s*\n\s*"build",\s*\n\s*"--pull=never",\s*\n\s*"--file",\s*\n\s*"Dockerfile",\s*\n\s*"--target",\s*\n\s*"tooling"/);
  assert.match(source, /"--label",\s*\n\s*`\$\{OCI_REVISION_LABEL\}=\$\{candidate\.head\}`/);
  assert.match(source, /LOCAL_OPERATOR_BASE_IMAGE_REQUIRED/);
  assert.match(source, /discardStaleTag\(image, candidate\.head\)/);
  assert.doesNotMatch(source.match(/function createStagingWorkforceUser\(args, deps = \{\}\) \{([\s\S]*?)\n\}/)?.[1] ?? "", /--no-cache/);
  assert.match(source, /runOperator\(runArgs, secretBuffer/);
  assert.match(source, /--env-file/);
  assert.match(source, /POSTGRES_RUNNING YES/);
  assert.match(source, /POSTGRES_HEALTHY YES/);
  const operator = source.match(/function createStagingWorkforceUser\(args, deps = \{\}\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(operator, /podmanCompose/);
  assert.doesNotMatch(operator, /boba-bear-tooling:local/);
  assert.doesNotMatch(compose, /  workforce-user-create:/);
});

test("staging requires a full Git SHA for deployment provenance", () => {
  assert.equal(isFullGitSha(candidateSha), true);
  assert.equal(isFullGitSha(candidateSha.slice(0, 12)), false);
  assert.equal(isFullGitSha("unversioned-local"), false);
});

test("built image provenance rejects missing and wrong revisions while accepting an exact match", () => {
  const revisions = Object.fromEntries(Object.values(BOBA_BUILD_IMAGES).map((image) => [image, candidateSha]));
  assert.doesNotThrow(() => assertImageRevisions(candidateSha, BOBA_BUILD_IMAGES, (image) => revisions[image]));
  revisions[BOBA_BUILD_IMAGES.tooling] = "";
  assert.throws(() => assertImageRevisions(candidateSha, BOBA_BUILD_IMAGES, (image) => revisions[image]), /tooling.*MISSING/);
  revisions[BOBA_BUILD_IMAGES.tooling] = "0d925496deebcf19e5a82659e3e33dc81faccac3";
  assert.throws(() => assertImageRevisions(candidateSha, BOBA_BUILD_IMAGES, (image) => revisions[image]), /tooling.*found/);
});

test("all persistent BOBA services require their inspected running image revision to match", () => {
  const records = BOBA_RUNTIME_SERVICES.map((service) => ({ service, revision: candidateSha }));
  assert.doesNotThrow(() => assertRunningProvenance(candidateSha, records));
  records[2].revision = "";
  assert.throws(() => assertRunningProvenance(candidateSha, records), /workforce-auth.*MISSING/);
});

test("staging status reports inspected image IDs and labels instead of a Git-only deployment claim", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /const imageId = podmanInspect\(container, "\{\{\.Image\}\}"\)/);
  assert.match(source, /const revision = imageRevision\(imageId\)/);
  assert.match(source, /CURRENT_MAIN_SHA \$\{candidate\.originMain\}/);
  assert.match(source, /CANDIDATE_MATCH YES/);
});

test("closedStdinInherit ignores stdin for preflight children", () => {
  assert.deepEqual(closedStdinInherit(), ["ignore", "inherit", "inherit"]);
});

test("spawnIgnoringStdin never inherits parent stdin", () => {
  const calls = [];
  spawnIgnoringStdin("true", [], { cwd: "/" }, (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0 };
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options.stdio, ["ignore", "inherit", "inherit"]);
});

test("spawnWithStdinBuffer feeds password bytes only through stdin pipe", () => {
  const secret = Buffer.from("founder-temporary-password");
  const calls = [];
  spawnWithStdinBuffer("podman", ["run", "image"], secret, { env: { PATH: "/usr/bin" } }, (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0 };
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options.stdio, ["pipe", "inherit", "inherit"]);
  assert.equal(calls[0].options.input, secret);
  assert.equal(JSON.stringify(calls[0].args).includes("founder-temporary-password"), false);
  assert.equal(JSON.stringify(calls[0].options.env).includes("founder-temporary-password"), false);
});

test("zeroSecretBuffer clears in-memory password bytes", () => {
  const secret = Buffer.from("founder-temporary-password");
  zeroSecretBuffer(secret);
  assert.equal(secret.equals(Buffer.alloc(secret.length, 0)), true);
});

test("readSecretStdinBuffer reads fd 0 once without encoding to string logs", () => {
  const expected = Buffer.from("stdin-password-bytes");
  const actual = readSecretStdinBuffer(() => expected);
  assert.equal(actual, expected);
});

test("runPodmanWithSecretStdin propagates non-zero operator exit", () => {
  const secret = Buffer.from("x".repeat(16));
  assert.throws(
    () =>
      runPodmanWithSecretStdin(["run", "img"], secret, {}, () => ({
        status: 7,
        error: undefined,
      })),
    /podman run failed/,
  );
});

test("createStagingWorkforceUser delivers password to final podman run only", () => {
  const secret = Buffer.from("exact-founder-password-bytes");
  const events = [];
  let stdinConsumed = false;
  let bufferZeroed = false;

  createStagingWorkforceUser(
    ["--email=ops@example.test", "--name=Ops", "--password-stdin"],
    {
      assertTarget: () => {
        events.push("assertTarget");
        return { network: "boba-staging_default" };
      },
      readCandidateFn: () => {
        events.push("readCandidate");
        return {
          branch: "main",
          head: candidateSha,
          originMain: candidateSha,
          trackedDirty: "",
          fingerprint: "abc",
        };
      },
      assertPreconditions: () => {
        events.push("assertPreconditions");
      },
      materializeTree: () => {
        events.push("materializeTree");
        return "/tmp/boba-staging-build-test";
      },
      ensureEnv: () => {
        events.push("ensureEnv");
      },
      readBaseImage: () => "docker.io/library/node:22.23.1-bookworm-slim",
      assertLocalBase: (image) => {
        events.push({ phase: "assertLocalBase", image });
      },
      discardStaleTag: (image, sha) => {
        events.push({ phase: "discardStaleTag", image, sha });
      },
      buildPodman: (args) => {
        events.push({ phase: "build", args: [...args], stdinConsumed });
        assert.equal(stdinConsumed, false);
        assert.match(args.join(" "), /build .*--target tooling/);
        assert.equal(args.includes("--pull=never"), true);
        assert.equal(args.includes("--no-cache"), false);
        assert.equal(args.filter((arg) => arg === "--label").length, 1);
        assert.equal(args[args.indexOf("--label") + 1], `org.opencontainers.image.revision=${candidateSha}`);
        assert.ok(args.indexOf("--label") < args.indexOf("--tag"));
        assert.ok(args.indexOf("--pull=never") < args.indexOf("--file"));
      },
      revisionOf: () => candidateSha,
      readStdin: () => {
        assert.equal(stdinConsumed, false);
        stdinConsumed = true;
        events.push("readStdin");
        return secret;
      },
      runOperator: (args, buffer, options) => {
        events.push({
          phase: "run",
          args: [...args],
          buffer,
          options,
          stdinConsumed,
        });
        assert.equal(stdinConsumed, true);
        assert.equal(buffer, secret);
        assert.equal(args.includes("run"), true);
        assert.equal(args.filter((arg) => arg === "--interactive").length, 1);
        assert.equal(args.includes("--tty"), false);
        assert.equal(args.includes("-t"), false);
        assert.ok(args.indexOf("--interactive") < args.indexOf(`boba-bear-staging-workforce-operator:${candidateSha}`));
        assert.equal(args.join(" ").includes("workforce:user:create"), true);
        assert.equal(args.join(" ").includes("exact-founder-password-bytes"), false);
        assert.equal(JSON.stringify(options ?? {}).includes("exact-founder-password-bytes"), false);
      },
      zeroBuffer: (buffer) => {
        bufferZeroed = true;
        zeroSecretBuffer(buffer);
        events.push("zeroBuffer");
      },
      exists: () => true,
      removeDir: () => {
        events.push("removeDir");
      },
      envDir: "/tmp/env-dir",
    },
  );

  assert.deepEqual(
    events.map((event) => (typeof event === "string" ? event : event.phase)),
    [
      "assertTarget",
      "readCandidate",
      "assertPreconditions",
      "materializeTree",
      "ensureEnv",
      "assertLocalBase",
      "discardStaleTag",
      "build",
      "readStdin",
      "run",
      "zeroBuffer",
      "removeDir",
    ],
  );
  assert.equal(stdinConsumed, true);
  assert.equal(bufferZeroed, true);
  assert.equal(secret.equals(Buffer.alloc(secret.length, 0)), true);
  const discarded = events.find((event) => event.phase === "discardStaleTag");
  assert.equal(discarded.image, `boba-bear-staging-workforce-operator:${candidateSha}`);
  assert.equal(discarded.sha, candidateSha);

  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /spawnIgnoringStdin\(\s*"bash"/);
  assert.match(source, /spawnIgnoringStdin\("npm", step\.args/);
  assert.match(source, /function runPodman\(args, options = \{\}\) \{\n  const result = spawnIgnoringStdin\("podman"/);
  assert.match(source, /secretBuffer = readStdin\(\)/);
  assert.doesNotMatch(source, /runPodman\(\["run", "--rm"/);
});

test("staging workforce operator rejects an older cached revision before reading secret stdin", () => {
  let stdinRead = false;
  assert.throws(
    () =>
      createStagingWorkforceUser([], {
        assertTarget: () => ({ network: "boba-staging_default" }),
        readCandidateFn: () => ({ head: candidateSha }),
        assertPreconditions: () => {},
        materializeTree: () => "/tmp/boba-staging-build-test",
        ensureEnv: () => {},
        readBaseImage: () => "docker.io/library/node:22.23.1-bookworm-slim",
        assertLocalBase: () => {},
        discardStaleTag: () => {},
        buildPodman: (args) => {
          assert.equal(args[args.indexOf("--label") + 1], `org.opencontainers.image.revision=${candidateSha}`);
        },
        revisionOf: () => "ee00366b4106440b659dce91a150f40eda0c5f00",
        readStdin: () => {
          stdinRead = true;
          return Buffer.alloc(0);
        },
        exists: () => true,
        removeDir: () => {},
      }),
    /lacks exact merged-main provenance/,
  );
  assert.equal(stdinRead, false);
});

test("staging workforce operator fails closed when the Node base image is not local", () => {
  let built = false;
  assert.throws(
    () =>
      createStagingWorkforceUser([], {
        assertTarget: () => ({ network: "boba-staging_default" }),
        readCandidateFn: () => ({ head: candidateSha }),
        assertPreconditions: () => {},
        materializeTree: () => "/tmp/boba-staging-build-test",
        ensureEnv: () => {},
        readBaseImage: () => "docker.io/library/node:22.23.1-bookworm-slim",
        assertLocalBase: () => {
          throw new Error("LOCAL_OPERATOR_BASE_IMAGE_REQUIRED: docker.io/library/node:22.23.1-bookworm-slim");
        },
        discardStaleTag: () => {
          throw new Error("should not untag without a local base image");
        },
        buildPodman: () => {
          built = true;
        },
        readStdin: () => Buffer.alloc(0),
        exists: () => true,
        removeDir: () => {},
      }),
    /LOCAL_OPERATOR_BASE_IMAGE_REQUIRED/,
  );
  assert.equal(built, false);
});

test("mismatched operator candidate tags are untagged without deleting a prior valid tag", () => {
  const current = `boba-bear-staging-workforce-operator:${candidateSha}`;
  const prior = "boba-bear-staging-workforce-operator:ee00366b4106440b659dce91a150f40eda0c5f00";
  const untagged = [];
  discardMismatchedOperatorCandidateTag(current, candidateSha, {
    exists: (image) => image === current,
    inspectRevision: () => "ee00366b4106440b659dce91a150f40eda0c5f00",
    untag: (image) => untagged.push(image),
  });
  assert.deepEqual(untagged, [current]);
  discardMismatchedOperatorCandidateTag(current, candidateSha, {
    exists: () => true,
    inspectRevision: () => candidateSha,
    untag: (image) => untagged.push(image),
  });
  assert.deepEqual(untagged, [current]);
  discardMismatchedOperatorCandidateTag(prior, "ee00366b4106440b659dce91a150f40eda0c5f00", {
    exists: () => true,
    inspectRevision: () => "ee00366b4106440b659dce91a150f40eda0c5f00",
    untag: (image) => untagged.push(image),
  });
  assert.deepEqual(untagged, [current]);
});

test("createStagingWorkforceUser does not mutate persistent staging services", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  const operator = source.match(/function createStagingWorkforceUser\(args, deps = \{\}\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(operator, /podmanCompose|upAndWait|force-recreate|recover-postgres|volume", "rm"|compose down/);
  assert.match(operator, /--read-only/);
  assert.match(operator, /no-new-privileges:true/);
});

test("normalizeEnvAssignment replaces, appends once, and stays idempotent", () => {
  const wrong = "WORKFORCE_AUTH_BASE_URL=http://127.0.0.1:8080\nWORKFORCE_AUTH_SECRET=s3cret-value-do-not-log\n";
  const replaced = normalizeEnvAssignment(wrong, "WORKFORCE_AUTH_BASE_URL", STAGING_PUBLIC_ORIGIN);
  assert.equal(
    replaced,
    "WORKFORCE_AUTH_BASE_URL=http://localhost:8080\nWORKFORCE_AUTH_SECRET=s3cret-value-do-not-log\n",
  );
  assert.equal(
    normalizeEnvAssignment(replaced, "WORKFORCE_AUTH_BASE_URL", STAGING_PUBLIC_ORIGIN),
    replaced,
  );

  const missing = "WORKFORCE_AUTH_SECRET=s3cret-value-do-not-log\n";
  const appended = normalizeEnvAssignment(missing, "WORKFORCE_AUTH_BASE_URL", STAGING_PUBLIC_ORIGIN);
  assert.equal(
    appended,
    "WORKFORCE_AUTH_SECRET=s3cret-value-do-not-log\nWORKFORCE_AUTH_BASE_URL=http://localhost:8080\n",
  );
  assert.equal(
    normalizeEnvAssignment(appended, "WORKFORCE_AUTH_BASE_URL", STAGING_PUBLIC_ORIGIN),
    appended,
  );
  assert.equal([...appended.matchAll(/^WORKFORCE_AUTH_BASE_URL=/gm)].length, 1);
});

test("normalizeStagingAuthOriginEnv covers customer and workforce auth files only", () => {
  const customer = normalizeStagingAuthOriginEnv(
    ".env.customer-auth.docker.local",
    "CUSTOMER_AUTH_BASE_URL=http://127.0.0.1:8080\n",
  );
  assert.equal(customer, "CUSTOMER_AUTH_BASE_URL=http://localhost:8080\n");

  const workforce = normalizeStagingAuthOriginEnv(
    ".env.workforce-auth.docker.local",
    "WORKFORCE_AUTH_BASE_URL=http://127.0.0.1:8080\n",
  );
  assert.equal(workforce, "WORKFORCE_AUTH_BASE_URL=http://localhost:8080\n");

  const untouched = "OTHER=1\n";
  assert.equal(normalizeStagingAuthOriginEnv(".env.runtime.docker.local", untouched), untouched);
});

test("ensureStagingEnvFiles canonicalizes workforce and customer auth origins into both copies", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-root-"));
  const stagingEnvDir = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-persist-"));
  const buildDir = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-build-"));
  const secret = "workforce-secret-BYTES-never-logged-0123456789abcdef";
  const pii = "workforce-pii-BYTES-never-logged-fedcba9876543210";
  const customerSecret = "customer-secret-BYTES-never-logged-0123456789abcdef";
  const envFiles = [
    ".env.docker.local",
    ".env.runtime.docker.local",
    ".env.migration.docker.local",
    ".env.customer-auth.docker.local",
    ".env.workforce-auth.docker.local",
    ".env.customer-commerce.docker.local",
    ".env.operations.docker.local",
  ];

  try {
    for (const file of envFiles) {
      writeFileSync(path.join(root, file), `# live ${file}\nKEEP=1\n`, { mode: 0o600 });
    }
    writeFileSync(
      path.join(stagingEnvDir, ".env.workforce-auth.docker.local"),
      [
        "WORKFORCE_AUTH_SECRET=" + secret,
        "WORKFORCE_AUTH_BASE_URL=http://127.0.0.1:8080",
        "WORKFORCE_AUTH_PII_HASH_SECRET=" + pii,
        "WORKFORCE_AUTH_TRUST_PROXY_HOPS=1",
        "WORKFORCE_AUTH_SERVICE_HOST=0.0.0.0",
        "WORKFORCE_AUTH_SERVICE_PORT=8082",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    writeFileSync(
      path.join(stagingEnvDir, ".env.customer-auth.docker.local"),
      [
        "CUSTOMER_AUTH_SECRET=" + customerSecret,
        "CUSTOMER_AUTH_BASE_URL=http://127.0.0.1:8080",
        "CUSTOMER_AUTH_SERVICE_PORT=8081",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    for (const file of envFiles) {
      if (
        file === ".env.workforce-auth.docker.local" ||
        file === ".env.customer-auth.docker.local"
      ) {
        continue;
      }
      writeFileSync(path.join(stagingEnvDir, file), `# persist ${file}\nKEEP=1\n`, { mode: 0o600 });
    }

    const liveWorkforceBefore = readFileSync(path.join(root, ".env.workforce-auth.docker.local"), "utf8");
    const liveCustomerBefore = readFileSync(path.join(root, ".env.customer-auth.docker.local"), "utf8");

    ensureStagingEnvFiles(buildDir, {
      stagingEnvDir,
      root,
      envFiles,
      initMissing: false,
    });
    ensureStagingEnvFiles(buildDir, {
      stagingEnvDir,
      root,
      envFiles,
      initMissing: false,
    });

    const workforcePersistent = readFileSync(
      path.join(stagingEnvDir, ".env.workforce-auth.docker.local"),
      "utf8",
    );
    const workforceBuild = readFileSync(path.join(buildDir, ".env.workforce-auth.docker.local"), "utf8");
    const customerPersistent = readFileSync(
      path.join(stagingEnvDir, ".env.customer-auth.docker.local"),
      "utf8",
    );
    const customerBuild = readFileSync(path.join(buildDir, ".env.customer-auth.docker.local"), "utf8");

    assert.equal(workforcePersistent, workforceBuild);
    assert.equal(customerPersistent, customerBuild);
    assert.match(workforcePersistent, /^WORKFORCE_AUTH_BASE_URL=http:\/\/localhost:8080$/m);
    assert.equal([...workforcePersistent.matchAll(/^WORKFORCE_AUTH_BASE_URL=/gm)].length, 1);
    assert.doesNotMatch(workforcePersistent, /127\.0\.0\.1:8080/);
    assert.match(workforcePersistent, new RegExp(`^WORKFORCE_AUTH_SECRET=${secret}$`, "m"));
    assert.match(workforcePersistent, new RegExp(`^WORKFORCE_AUTH_PII_HASH_SECRET=${pii}$`, "m"));
    assert.match(workforcePersistent, /^WORKFORCE_AUTH_TRUST_PROXY_HOPS=1$/m);
    assert.match(workforcePersistent, /^WORKFORCE_AUTH_SERVICE_PORT=8082$/m);
    assert.match(customerPersistent, /^CUSTOMER_AUTH_BASE_URL=http:\/\/localhost:8080$/m);
    assert.equal([...customerPersistent.matchAll(/^CUSTOMER_AUTH_BASE_URL=/gm)].length, 1);
    assert.match(customerPersistent, new RegExp(`^CUSTOMER_AUTH_SECRET=${customerSecret}$`, "m"));

    assert.equal(readFileSync(path.join(root, ".env.workforce-auth.docker.local"), "utf8"), liveWorkforceBefore);
    assert.equal(readFileSync(path.join(root, ".env.customer-auth.docker.local"), "utf8"), liveCustomerBefore);
    assert.doesNotMatch(liveWorkforceBefore, /localhost:8080/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(stagingEnvDir, { recursive: true, force: true });
    rmSync(buildDir, { recursive: true, force: true });
  }
});

test("ensureStagingEnvFiles appends missing WORKFORCE_AUTH_BASE_URL exactly once", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-root-"));
  const stagingEnvDir = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-persist-"));
  const buildDir = mkdtempSync(path.join(os.tmpdir(), "boba-staging-env-build-"));
  const envFiles = [".env.workforce-auth.docker.local"];
  try {
    writeFileSync(path.join(root, ".env.workforce-auth.docker.local"), "OTHER=1\n", { mode: 0o600 });
    writeFileSync(
      path.join(stagingEnvDir, ".env.workforce-auth.docker.local"),
      "WORKFORCE_AUTH_SECRET=keep-me-secret\n",
      { mode: 0o600 },
    );
    ensureStagingEnvFiles(buildDir, { stagingEnvDir, root, envFiles, initMissing: false });
    ensureStagingEnvFiles(buildDir, { stagingEnvDir, root, envFiles, initMissing: false });
    const content = readFileSync(path.join(buildDir, ".env.workforce-auth.docker.local"), "utf8");
    assert.equal(
      content,
      "WORKFORCE_AUTH_SECRET=keep-me-secret\nWORKFORCE_AUTH_BASE_URL=http://localhost:8080\n",
    );
    assert.equal([...content.matchAll(/^WORKFORCE_AUTH_BASE_URL=/gm)].length, 1);
    assert.equal(readFileSync(path.join(root, ".env.workforce-auth.docker.local"), "utf8"), "OTHER=1\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(stagingEnvDir, { recursive: true, force: true });
    rmSync(buildDir, { recursive: true, force: true });
  }
});

test("staging auth-origin normalization never logs secrets", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /STAGING_AUTH_ORIGIN_NORMALIZATIONS[\s\S]*WORKFORCE_AUTH_BASE_URL/);
  assert.match(source, /STAGING_AUTH_ORIGIN_NORMALIZATIONS[\s\S]*CUSTOMER_AUTH_BASE_URL/);
  assert.match(source, /normalizeStagingAuthOriginEnv\(file,/);
  assert.doesNotMatch(
    source,
    /console\.(log|info|debug|warn|error)\([^)]*(AUTH_SECRET|PII_HASH_SECRET|password|PASSWORD)/,
  );
});
