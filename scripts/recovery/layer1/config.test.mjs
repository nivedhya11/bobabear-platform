import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  assertPgbackrestVersion,
  parseVersion,
  renderPgbackrestConf,
  LAYER1_RETENTION_DAYS_MIN,
  PGBACKREST_VERSION_MIN,
} from "./config.mjs";

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
  const versionProbe = spawnSync("docker", ["run", "--rm", image, "pgbackrest", "version"], {
    encoding: "utf8",
    timeout: 60_000,
  });
  if (versionProbe.status !== 0) {
    t.skip(`pinned pgBackRest image unavailable (${image}); config content assertions above still apply`);
    return;
  }
  assert.equal(assertPgbackrestVersion(versionProbe.stdout ?? "").ok, true);

  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pgbackrest-conf-"));
  try {
    const confPath = path.join(root, "pgbackrest.conf");
    // Cipher pass placeholder must be concrete for parser acceptance.
    writeFileSync(confPath, conf.replace("${PGBACKREST_CIPHER_PASS}", "test-cipher-pass-not-for-prod"), "utf8");
    const help = spawnSync(
      "docker",
      ["run", "--rm", "-v", `${root}:/conf:ro`, image, "pgbackrest", `--config=/conf/pgbackrest.conf`, "help", "backup"],
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
