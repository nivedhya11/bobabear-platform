import assert from "node:assert/strict";
import { test } from "node:test";
import { containsSecret, redactText, redactValue, safeJson, safePrint } from "./redact.mjs";

const SECRETS = {
  uri: "postgresql://boba_bear_app:super-secret-db-pass@postgres:5432/boba_bear",
  password: "super-secret-db-pass",
  accessKey: "DO00EXAMPLEACCESSKEY",
  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  token: "rzp_live_exampletokenvalue",
  ageKey: "AGE-SECRET-KEY-1EXAMPLEPRIVATEIDENTITYMATERIAL0000000000000000",
  pgbackrest: "cipher-passphrase-example-value",
};

test("redacts URI userinfo passwords", () => {
  const out = redactText(`DATABASE_URL=${SECRETS.uri}`);
  assert.equal(containsSecret(out, SECRETS.password), false);
  assert.match(out, /\[REDACTED\]/);
});

test("redacts access keys, secret keys, tokens, age private keys, and pgBackRest passphrases", () => {
  const raw = {
    DATABASE_URL: SECRETS.uri,
    SPACES_ACCESS_KEY: SECRETS.accessKey,
    SPACES_SECRET_KEY: SECRETS.secretKey,
    token: SECRETS.token,
    password: SECRETS.password,
    AGE_SECRET_KEY: SECRETS.ageKey,
    PGBACKREST_CIPHER_PASS: SECRETS.pgbackrest,
    nested: { secret: SECRETS.secretKey },
  };
  const json = safeJson(raw);
  const human = safePrint(raw);
  for (const secret of Object.values(SECRETS)) {
    assert.equal(containsSecret(json, secret), false, secret);
    assert.equal(containsSecret(human, secret), false, secret);
  }
  const redacted = redactValue(raw);
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.SPACES_SECRET_KEY, "[REDACTED]");
  assert.equal(redacted.AGE_SECRET_KEY, "[REDACTED]");
});

test("does not stringify raw environment objects into output", () => {
  const envLike = { PATH: "/usr/bin", DATABASE_URL: SECRETS.uri, HOME: "/home/operator" };
  const out = safePrint({ message: "status", env: envLike });
  assert.equal(containsSecret(out, SECRETS.password), false);
});

test("failure messages are redacted", () => {
  const message = `restore failed using ${SECRETS.uri} token=${SECRETS.token}`;
  const out = redactText(message);
  assert.equal(containsSecret(out, SECRETS.password), false);
  assert.equal(containsSecret(out, SECRETS.token), false);
});
