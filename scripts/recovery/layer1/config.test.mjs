import assert from "node:assert/strict";
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
  assert.match(conf, /repo1-retention-archive-type=time/);
  assert.match(conf, new RegExp(`repo1-retention-archive=${LAYER1_RETENTION_DAYS_MIN}`));
  // Differential COUNT must not be mislabeled as days.
  assert.doesNotMatch(conf, /repo1-retention-diff=/);
  assert.doesNotMatch(conf, /repo1-retention-full=5\b/);
  assert.match(conf, /\[boba\]/);
});

test("renderPgbackrestConf rejects retention below 35 days", () => {
  assert.throws(
    () => renderPgbackrestConf({ generation: 1, retentionFullDays: 34 }),
    /35 days/,
  );
});
