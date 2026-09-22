import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECOVERED_APP_LIVENESS_PATH,
  RECOVERED_APP_READINESS_PATH,
  startRecoveredApplication,
} from "./recovered-app.mjs";

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

function gateEnv() {
  return {
    BOBA_BEAR_ENV: "local",
    BOBA_PAYMENT_INITIATE: "0",
  };
}

test("recovered app refuses ambiguous target identity", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: "wrong-identity",
    databaseAvailable: true,
    migrationsComplete: true,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "TARGET_AMBIGUOUS");
});

test("recovered app refuses unavailable DB (databaseAvailable false)", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    databaseAvailable: false,
    migrationsComplete: true,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "DB_UNAVAILABLE");
});

test("recovered app refuses omitted databaseAvailable", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    migrationsComplete: true,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "DB_READINESS_UNPROVEN");
});

test("recovered app refuses incomplete migrations (migrationsComplete false)", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    databaseAvailable: true,
    migrationsComplete: false,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MIGRATION_INCOMPLETE");
});

test("recovered app refuses omitted migrationsComplete", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    databaseAvailable: true,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MIGRATION_READINESS_UNPROVEN");
});

test("recovered app refuses production provider credentials", async () => {
  const result = await startRecoveredApplication({
    provisioned: baseProvisioned(),
    targetIdentity: baseProvisioned().targetIdentity,
    databaseAvailable: true,
    migrationsComplete: true,
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
    databaseAvailable: true,
    migrationsComplete: true,
    skipStart: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.code ?? "", /NETWORK|SUPPRESS|ISOLAT/i);
});

test("recovered app gates pass only when both prerequisites are explicitly true", async () => {
  const provisioned = baseProvisioned();
  const result = await startRecoveredApplication({
    provisioned,
    targetIdentity: provisioned.targetIdentity,
    migrationsComplete: true,
    databaseAvailable: true,
    env: gateEnv(),
    skipStart: true,
  });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.providerSuppression, "SUPPRESSED");
  assert.equal(result.restoredDbBound, true);
  assert.equal(result.readinessPath, RECOVERED_APP_READINESS_PATH);
  assert.equal(result.sourceUntouched, undefined);
  assert.equal(result.QUALIFYING_APP_RECOVERY, undefined);
});

/**
 * @param {{ fetchFn: Function, expectOk?: boolean }} opts
 */
async function runStartupWithFetch(opts) {
  const provisioned = baseProvisioned();
  const containerName = `boba-rec-app-${provisioned.runId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-20)}`;
  /** @type {string[]} */
  const removed = [];
  const execFn = (command, args) => {
    const joined = args.join(" ");
    if (args[0] === "image" && args[1] === "inspect") {
      return { status: 0, stdout: "ok", stderr: "" };
    }
    if (args[0] === "inspect" && args[1] === containerName) {
      return { status: 1, stdout: "", stderr: "missing" };
    }
    if (args[0] === "run") {
      return { status: 0, stdout: "cid", stderr: "" };
    }
    if (args[0] === "port") {
      return { status: 0, stdout: "127.0.0.1:39999", stderr: "" };
    }
    if (args[0] === "rm") {
      removed.push(joined);
      return { status: 0, stdout: "", stderr: "" };
    }
    return { status: 1, stdout: "", stderr: `unexpected ${command} ${joined}` };
  };

  const result = await startRecoveredApplication({
    provisioned,
    targetIdentity: provisioned.targetIdentity,
    databaseAvailable: true,
    migrationsComplete: true,
    env: gateEnv(),
    containerCli: "podman",
    image: "boba-bear-customer-auth:local",
    execFn,
    fetchFn: opts.fetchFn,
    healthTimeoutMs: 1_200,
  });
  return { result, removed, containerName };
}

test("readiness path is /health/ready (not liveness-only)", () => {
  assert.equal(RECOVERED_APP_READINESS_PATH, "/health/ready");
  assert.equal(RECOVERED_APP_LIVENESS_PATH, "/health/live");
  assert.notEqual(RECOVERED_APP_READINESS_PATH, RECOVERED_APP_LIVENESS_PATH);
});

test("liveness-compatible process + readiness 503 → FAIL and cleanup", async () => {
  let readinessHits = 0;
  const { result, removed } = await runStartupWithFetch({
    fetchFn: async (url) => {
      assert.match(String(url), /\/health\/ready$/);
      readinessHits += 1;
      return { ok: false, status: 503 };
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.code ?? "", /READINESS/);
  assert.equal(result.readinessPath, RECOVERED_APP_READINESS_PATH);
  assert.equal(result.readinessStatus, 503);
  assert.equal(result.restoredDbBound, undefined);
  assert.ok(readinessHits >= 1);
  assert.ok(removed.some((line) => line.includes("rm")));
});

test("readiness 200 → PASS with readinessPath/status recorded", async () => {
  const { result, removed } = await runStartupWithFetch({
    fetchFn: async (url) => {
      assert.match(String(url), /\/health\/ready$/);
      return { ok: true, status: 200 };
    },
  });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.status, "STARTED");
  assert.equal(result.restoredDbBound, true);
  assert.equal(result.readinessPath, RECOVERED_APP_READINESS_PATH);
  assert.equal(result.readinessStatus, 200);
  assert.equal(result.livenessPath, RECOVERED_APP_LIVENESS_PATH);
  assert.equal(result.sourceUntouched, undefined);
  assert.equal(result.QUALIFYING_APP_RECOVERY, "NO");
  assert.equal(removed.length, 0);
  if (typeof result.cleanup === "function") result.cleanup();
});

test("readiness timeout → FAIL and cleanup", async () => {
  const { result, removed } = await runStartupWithFetch({
    fetchFn: async () => {
      // Never ready; hang past deadline by returning non-ok without settling to 200.
      return { ok: false, status: 502 };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "RECOVERED_APP_READINESS_TIMEOUT");
  assert.equal(result.restoredDbBound, undefined);
  assert.ok(removed.some((line) => line.includes("rm")));
});

test("readiness request exception → FAIL and cleanup", async () => {
  const { result, removed } = await runStartupWithFetch({
    fetchFn: async () => {
      throw new Error("simulated readiness fetch failure");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "RECOVERED_APP_READINESS_EXCEPTION");
  assert.match(result.reason ?? "", /simulated readiness fetch failure/);
  assert.equal(result.restoredDbBound, undefined);
  assert.ok(removed.some((line) => line.includes("rm")));
});
