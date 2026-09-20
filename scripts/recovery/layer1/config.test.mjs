import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertPgbackrestVersion,
  parseVersion,
  renderPgbackrestConf,
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

test("renderPgbackrestConf embeds repo-gen path and retention >= 35 days", () => {
  const conf = renderPgbackrestConf({
    generation: 2,
    stanza: "boba",
    cipherPassEnvVar: "PGBACKREST_CIPHER_PASS",
  });
  assert.match(conf, /repo1-path=repo-gen-2/);
  assert.match(conf, /repo1-cipher-type=aes-256-cbc/);
  assert.match(conf, /repo1-retention-full=5/);
  assert.match(conf, /repo1-retention-diff=35/);
  assert.match(conf, /\[boba\]/);
});
