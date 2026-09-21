import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  assertPgbackrestVersion,
  layer1ArchiveCommand,
  layer1ComposePgbackrestSecretBindings,
  parseVersion,
  renderAuthoritativePgbackrestConf,
  renderPgbackrestConf,
  significantPgbackrestLines,
  LAYER1_RETENTION_DAYS_MIN,
  PGBACKREST_REPO_SECRET_ENV,
  PGBACKREST_RUNTIME_CONFIG_PATH,
  PGBACKREST_VERSION_MIN,
  PHYSICAL_SPACES_ENV,
} from "./config.mjs";
import { resolveContainerCli } from "../docker-exec.mjs";

test("pgBackRest version assert accepts >= 2.55 and forbids 2.50", () => {
  assert.equal(PGBACKREST_VERSION_MIN, "2.55.0");
  assert.equal(assertPgbackrestVersion("2.55.0").ok, true);
  assert.equal(assertPgbackrestVersion("2.56.1").ok, true);
  assert.equal(assertPgbackrestVersion("2.50").ok, false);
  assert.equal(assertPgbackrestVersion("2.54.9").ok, false);
  assert.equal(parseVersion("pgBackRest 2.55.1").minor, 55);
});

test("renderPgbackrestConf uses time-based retention >= 35 days (not count/diff-as-days)", () => {
  const conf = renderPgbackrestConf({
    generation: 2,
    stanza: "boba",
    cipherPassEnvVar: "PGBACKREST_CIPHER_PASS",
  });
  assert.match(conf, /repo1-path=repo-gen-2/);
  assert.match(conf, /repo1-cipher-type=aes-256-cbc/);
  assert.match(conf, /repo1-retention-full-type=time/);
  assert.match(conf, new RegExp(`repo1-retention-full=${LAYER1_RETENTION_DAYS_MIN}`));
  // Differential COUNT must not be mislabeled as days.
  assert.doesNotMatch(conf, /repo1-retention-diff=/);
  // archive-type is backup type (full|diff|incr), not time — must be omitted.
  assert.doesNotMatch(conf, /repo1-retention-archive-type=/);
  assert.doesNotMatch(conf, /repo1-retention-archive=/);
  assert.doesNotMatch(conf, /repo1-retention-full=5\b/);
  assert.match(conf, /\[boba\]/);
});

test("rendered pgBackRest retention options are accepted by pinned image when available", (t) => {
  const conf = renderPgbackrestConf({
    generation: 1,
    stanza: "boba",
    repoPath: "/tmp/boba-pgbackrest-repo-gen-1",
    cipherPassEnvVar: "PGBACKREST_CIPHER_PASS",
    pgData: "/tmp/boba-pgdata-does-not-need-to-exist",
  });
  assert.match(conf, /repo1-retention-full-type=time/);
  assert.match(conf, /repo1-retention-full=35/);
  assert.doesNotMatch(conf, /repo1-retention-diff=/);
  assert.doesNotMatch(conf, /repo1-retention-archive-type=time/);

  const image = process.env.BOBA_POSTGRES_IMAGE ?? "boba-bear-postgres:local";
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip(`pinned pgBackRest image unavailable (${image}); config content assertions above still apply`);
    return;
  }
  const imageCandidates = image === "boba-bear-postgres:local"
    ? ["boba-bear-postgres:local", "localhost/boba-bear-postgres:local"]
    : [image];
  let versionProbe = { status: 1, stdout: "", stderr: "" };
  for (const candidate of imageCandidates) {
    versionProbe = spawnSync(cli, ["run", "--rm", candidate, "pgbackrest", "version"], {
      encoding: "utf8",
      timeout: 60_000,
    });
    if (versionProbe.status === 0) break;
  }
  if (versionProbe.status !== 0) {
    t.skip(`pinned pgBackRest image unavailable (${image}); config content assertions above still apply`);
    return;
  }
  assert.equal(assertPgbackrestVersion(versionProbe.stdout ?? "").ok, true);
  const resolvedImage =
    imageCandidates.find((candidate) => {
      const probe = spawnSync(cli, ["image", "inspect", candidate], {
        encoding: "utf8",
        timeout: 20_000,
      });
      return probe.status === 0;
    }) ?? image;

  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pgbackrest-conf-"));
  try {
    const confPath = path.join(root, "pgbackrest.conf");
    // Cipher pass placeholder must be concrete for parser acceptance.
    writeFileSync(confPath, conf.replace("${PGBACKREST_CIPHER_PASS}", "test-cipher-pass-not-for-prod"), "utf8");
    const help = spawnSync(
      cli,
      ["run", "--rm", "-v", `${root}:/conf:ro,Z`, resolvedImage, "pgbackrest", `--config=/conf/pgbackrest.conf`, "help", "backup"],
      { encoding: "utf8", timeout: 60_000 },
    );
    // help exits 0 when config path/options are accepted by the binary.
    assert.equal(help.status, 0, help.stderr || help.stdout);
    assert.doesNotMatch(help.stderr ?? "", /repo1-retention-archive-type/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renderPgbackrestConf rejects retention below 35 days", () => {
  assert.throws(
    () => renderPgbackrestConf({ generation: 1, retentionFullDays: 34 }),
    /35 days/,
  );
});

test("authoritative Layer 1 render is physical Spaces and fail-closed without it", () => {
  const missing = renderAuthoritativePgbackrestConf({
    BOBA_PGBACKREST_GENERATION: "1",
    PGBACKREST_CIPHER_PASS: "cipher-test-only",
  });
  assert.equal(missing.ok, false);
  assert.match(missing.reason ?? "", /physical Spaces/i);

  const reused = renderAuthoritativePgbackrestConf({
    BOBA_PGBACKREST_GENERATION: "2",
    PGBACKREST_CIPHER_PASS: "cipher-test-only",
    BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET: "shared-bucket",
    BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT: "nyc3.digitaloceanspaces.com",
    BOBA_RECOVERY_PHYSICAL_SPACES_REGION: "nyc3",
    BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID: "same-key",
    BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY: "same-secret",
    BOBA_RECOVERY_LOGICAL_SPACES_BUCKET: "shared-bucket",
    BOBA_LOGICAL_SPACES_ACCESS_KEY_ID: "same-key",
    BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY: "same-secret",
  });
  assert.equal(reused.ok, false);
  assert.match(reused.reason ?? "", /distinct/i);

  const ok = renderAuthoritativePgbackrestConf({
    BOBA_PGBACKREST_GENERATION: "3",
    PGBACKREST_CIPHER_PASS: "cipher-test-only-do-not-embed",
    BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET: "boba-physical",
    BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
    BOBA_RECOVERY_PHYSICAL_SPACES_REGION: "nyc3",
    BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID: "phys-key",
    BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY: "phys-secret",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.repoMode, "s3");
  assert.equal(ok.configPath, PGBACKREST_RUNTIME_CONFIG_PATH);
  assert.match(ok.conf, /repo1-type=s3/);
  assert.match(ok.conf, /repo1-path=\/repo-gen-3/);
  assert.match(ok.conf, /repo1-s3-bucket=boba-physical/);
  assert.match(ok.conf, /repo1-s3-endpoint=nyc3\.digitaloceanspaces\.com/);
  assert.match(ok.conf, /repo1-retention-full-type=time/);
  assert.match(ok.conf, /repo1-retention-full=35/);
  assert.doesNotMatch(ok.conf, /^repo1-retention-diff=/m);
  assert.doesNotMatch(ok.conf, /^repo1-retention-archive(?:-type)?=/m);
  assert.doesNotMatch(ok.conf, /cipher-test-only-do-not-embed|phys-key|phys-secret/);
  assert.match(ok.archiveCommand, new RegExp(`--config=${PGBACKREST_RUNTIME_CONFIG_PATH}`));

  const posix = renderAuthoritativePgbackrestConf({
    BOBA_PGBACKREST_REPO_MODE: "posix",
    BOBA_PGBACKREST_GENERATION: "1",
    PGBACKREST_CIPHER_PASS: "cipher-test-only",
  });
  assert.equal(posix.ok, true);
  assert.equal(posix.repoMode, "posix");
  assert.match(posix.conf, /repo1-type=posix/);
});

test("shell render-conf matches node authoritative config for archive-push consistency", () => {
  const env = {
    BOBA_PGBACKREST_GENERATION: "1",
    PGBACKREST_CIPHER_PASS: "cipher-test-only",
    BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET: "boba-physical",
    BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
    BOBA_RECOVERY_PHYSICAL_SPACES_REGION: "nyc3",
    BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID: "phys-key",
    BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY: "phys-secret",
  };
  const node = renderAuthoritativePgbackrestConf(env);
  assert.equal(node.ok, true);
  const shell = spawnSync("bash", ["docker/postgres/pgbackrest/render-conf.sh"], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  assert.equal(shell.status, 0, shell.stderr);
  assert.equal(significantPgbackrestLines(node.conf), significantPgbackrestLines(shell.stdout));
  assert.equal(layer1ArchiveCommand("boba"), node.archiveCommand);
});

test("entrypoint refuses archive start without concrete config render", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-entry-"));
  try {
    const renderBin = path.join(root, "render.sh");
    writeFileSync(renderBin, "#!/usr/bin/env bash\necho fail closed >&2\nexit 1\n", "utf8");
    spawnSync("chmod", ["+x", renderBin]);
    const result = spawnSync("bash", ["docker/postgres/pgbackrest/entrypoint-wrapper.sh", "true"], {
      encoding: "utf8",
      env: {
        ...process.env,
        BOBA_PGBACKREST_ARCHIVE: "1",
        BOBA_PGBACKREST_RENDER_BIN: renderBin,
        PATH: `${root}:${process.env.PATH}`,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /concrete config render failed|refusing to start/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("archive-push and scheduled commands share config path and repo secret authority names", () => {
  assert.equal(layer1ArchiveCommand("boba"), `pgbackrest --config=${PGBACKREST_RUNTIME_CONFIG_PATH} --stanza=boba archive-push %p`);
  const bindings = layer1ComposePgbackrestSecretBindings();
  assert.deepEqual(
    bindings.map((b) => [b.container, b.host, b.requiredFor]),
    [
      [PGBACKREST_REPO_SECRET_ENV.cipherPass, PHYSICAL_SPACES_ENV.cipherPass, "cipher"],
      [PGBACKREST_REPO_SECRET_ENV.s3Key, PHYSICAL_SPACES_ENV.accessKeyId, "s3"],
      [PGBACKREST_REPO_SECRET_ENV.s3KeySecret, PHYSICAL_SPACES_ENV.secretAccessKey, "s3"],
    ],
  );
});
