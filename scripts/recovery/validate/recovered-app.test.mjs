import assert from "node:assert/strict";
import { test } from "node:test";
import { startRecoveredApplication } from "./recovered-app.mjs";

function baseProvisioned(overrides = {}) {
  return {
    kind: "logical",
    runId: "run-20260921T000000Z-aaaaaaaaaaaaaaaa",
    targetIdentity: "recovery-target-run-20260921T000000Z-aaaaaaaaaaaaaaaa",
    databaseUrl: "postgresql://boba_recovery:x@127.0.0.1:55432/boba_recovery",
    migratorDatabaseUrl: "postgresql://boba_bear_migrator:x@127.0.0.1:55432/boba_recovery",
    appDatabaseUrl: "postgresql://boba_bear_app:x@127.0.0.1:55432/boba_recovery",
    appDatabaseUrlInternal: "postgresql://boba_bear_app:x@boba-rec-tgt-aaa:5432/boba_recovery",
    containerName: "boba-rec-tgt-aaa",
    containerCli: "podman",
    volumeOrPathId: "podman:boba-rec-tgt-aaa",
    hostPort: 55432,
    networkName: "boba-rec-net-aaa",
    networkInternalVerified: true,
    productionDnsAbsentVerified: true,
    created: true,
    ownershipDescriptor: {},
    ...overrides,
  };
}

test("recovered app refuses ambiguous target identity", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: "wrong-identity",
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "TARGET_AMBIGUOUS");
});

test("recovered app refuses unavailable DB", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    databaseAvailable: false,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "DB_UNAVAILABLE");
});

test("recovered app refuses incomplete migrations", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    migrationsComplete: false,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MIGRATION_INCOMPLETE");
});

test("recovered app refuses production provider credentials", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    env: { RAZORPAY_KEY_SECRET: "live-secret-must-block" },
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PRODUCTION_CREDENTIALS_PRESENT");
});

test("recovered app refuses missing provider suppression / non-internal network", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned({ networkInternalVerified: false }),
    targetIdentity: baseProvisioned().targetIdentity,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.code ?? "", /NETWORK|SUPPRESS|ISOLAT/i);
});

test("recovered app gates pass with suppressed disposable env", async () => {
  const provisioned = baseProvisioned();
  const result = await startRecoveredApplication({
    provisioned,
    targetIdentity: provisioned.targetIdentity,
    migrationsComplete: true,
    databaseAvailable: true,
    env: {
      BOBA_BEAR_ENV: "local",
      BOBA_PAYMENT_INITIATE: "0",
    },
    skipStart: true,
  });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.providerSuppression, "SUPPRESSED");
  assert.equal(result.restoredDbBound, true);
  assert.equal(result.QUALIFYING_APP_RECOVERY, undefined);
});
