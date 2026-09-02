import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  BOBA_BUILD_IMAGES,
  BOBA_RUNTIME_SERVICES,
  assertImageRevisions,
  assertRunningProvenance,
  assertServiceabilitySmokeResponse,
  isFullGitSha,
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
  assert.match(source, /runPodman\(\["rm", legacy\.container\]\)/);
  assert.doesNotMatch(source, /volume", "rm"/);
});

test("staging workforce operator uses direct Podman without Compose dependency reconciliation", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  const compose = readFileSync(path.resolve("compose.yaml"), "utf8");
  assert.match(source, /const image = `boba-bear-staging-workforce-operator:\$\{candidate\.head\}`/);
  assert.match(source, /runPodman\(\["build", "--file", "Dockerfile", "--target", "tooling"/);
  assert.match(source, /runPodman\(\["run", "--rm", "--network", network/);
  assert.match(source, /--env-file/);
  assert.match(source, /POSTGRES_RUNNING YES/);
  assert.match(source, /POSTGRES_HEALTHY YES/);
  const operator = source.match(/function createStagingWorkforceUser\(args\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
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
