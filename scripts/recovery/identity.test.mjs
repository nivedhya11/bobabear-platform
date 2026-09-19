import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateTargetIdentitySafety } from "./identity.mjs";

const allowed = {
  sourceIdentity: "prod-postgres-volume-abc",
  targetIdentity: "recovery-postgres-volume-xyz",
  sourceClassification: "production",
  targetClassification: "recovery",
  targetPgdataPath: "/tmp/boba-recovery/pgdata",
};

test("clearly isolated recovery target is allowed", () => {
  assert.deepEqual(evaluateTargetIdentitySafety(allowed), { allowed: true });
});

test("source equal to target is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetIdentity: allowed.sourceIdentity,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "SOURCE_EQUALS_TARGET");
});

test("missing target identity is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetIdentity: "",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TARGET_IDENTITY_MISSING");
});

test("ambiguous classification is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetClassification: "ambiguous",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "CLASSIFICATION_AMBIGUOUS");
});

test("unresolved classification is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetClassification: "unknown",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TARGET_CLASSIFICATION_UNRESOLVED");
});

test("production target is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetClassification: "production",
    targetIdentity: "another-prod-volume",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "PRODUCTION_OR_AUTHORITATIVE_TARGET");
});

test("known production PGDATA path is denied", () => {
  const result = evaluateTargetIdentitySafety({
    ...allowed,
    targetPgdataPath: "/var/lib/postgresql/data",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "PRODUCTION_PGDATA_FORBIDDEN");
});

test("equivalent production PGDATA paths with . or .. are denied", () => {
  for (const targetPgdataPath of [
    "/var/lib/postgresql/data/.",
    "/var/lib/postgresql/data/sub/..",
    "/var/lib/postgresql/data/base",
  ]) {
    const result = evaluateTargetIdentitySafety({ ...allowed, targetPgdataPath });
    assert.equal(result.allowed, false, targetPgdataPath);
    assert.equal(result.code, "PRODUCTION_PGDATA_FORBIDDEN", targetPgdataPath);
  }
});
