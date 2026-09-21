/**
 * Recovered application candidate startup (IMP-037 AC-004-01 local seam).
 *
 * Starts a repository-owned application runtime bound ONLY to a recovered
 * PostgreSQL target on a run-owned internal network. Fail-closed on missing
 * provider suppression, ambiguous target identity, unavailable DB, incomplete
 * migration readiness, or production provider credentials.
 *
 * QUALIFYING_APP_RECOVERY remains NO for local disposable runs — this is not
 * external / Founder UAT proof.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { resolveContainerCli } from "../docker-exec.mjs";
import { redactText } from "../redact.mjs";
import {
  evaluateProviderSuppression,
  resolveProviderSuppressionInput,
} from "./isolation.mjs";

export const RECOVERED_APP_IMAGE_CANDIDATES = Object.freeze([
  "boba-bear-customer-auth:local",
  "localhost/boba-bear-customer-auth:local",
]);

export const RECOVERED_APP_HEALTH_PATH = "/health/live";

/**
 * @param {object} options
 * @param {import("../restore/provision.mjs").ProvisionedLogicalTarget} options.provisioned
 * @param {string} options.targetIdentity
 * @param {string} [options.sourceIdentity]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.image]
 * @param {string} [options.containerCli]
 * @param {Function} [options.execFn]
 * @param {Function} [options.fetchFn]
 * @param {boolean} [options.migrationsComplete]
 * @param {boolean} [options.databaseAvailable]
 * @param {number} [options.healthTimeoutMs]
 * @param {boolean} [options.skipStart] when true, only evaluate gates (unit seams)
 */
export async function startRecoveredApplication(options) {
  const provisioned = options?.provisioned;
  if (!provisioned || provisioned.kind !== "logical") {
    return fail("recovered app requires a provisioned logical recovery target", "TARGET_AMBIGUOUS");
  }
  if (
    typeof options.targetIdentity !== "string" ||
    !options.targetIdentity.trim() ||
    options.targetIdentity.trim() !== provisioned.targetIdentity
  ) {
    return fail("recovered app target identity is ambiguous or mismatched", "TARGET_AMBIGUOUS");
  }
  if (options.databaseAvailable === false) {
    return fail("restored database is unavailable; refusing application startup", "DB_UNAVAILABLE");
  }
  if (options.migrationsComplete === false) {
    return fail("post-restore migrations incomplete; refusing application startup", "MIGRATION_INCOMPLETE");
  }

  const appUrlInternal =
    typeof provisioned.appDatabaseUrlInternal === "string" && provisioned.appDatabaseUrlInternal.trim()
      ? provisioned.appDatabaseUrlInternal.trim()
      : "";
  if (!appUrlInternal) {
    return fail(
      "provisioned target missing appDatabaseUrlInternal; cannot bind recovered app solely to restored DB",
      "TARGET_APP_URL_MISSING",
    );
  }
  if (!provisioned.networkName || provisioned.networkInternalVerified !== true) {
    return fail("recovered app requires run-owned internal network proof", "NETWORK_NOT_ISOLATED");
  }

  const suppressionInput = resolveProviderSuppressionInput({
    env: options.env,
    provisioned,
  });
  if (!suppressionInput.credentialsCheck.ok) {
    return fail(suppressionInput.credentialsCheck.reason, "PRODUCTION_CREDENTIALS_PRESENT");
  }
  const suppression = evaluateProviderSuppression(suppressionInput);
  if (!suppression.ok) {
    return fail(suppression.reason, suppression.code);
  }

  if (options.skipStart === true) {
    return {
      ok: true,
      status: "GATES_PASSED",
      providerSuppression: suppression.mode,
      restoredDbBound: true,
      targetIdentity: provisioned.targetIdentity,
      findings: [{ code: "RECOVERED_APP_GATES_OK", skipStart: true }],
    };
  }

  const cli = options.containerCli ?? resolveContainerCli();
  if (!cli) {
    return fail("neither docker nor podman available for recovered app startup", "CONTAINER_RUNTIME_UNAVAILABLE");
  }

  const execFn =
    options.execFn ??
    ((command, args, opts = {}) => {
      const result = spawnSync(command, args, {
        encoding: "utf8",
        timeout: opts.timeout ?? 180_000,
      });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    });

  const image = options.image ?? resolveRecoveredAppImage(cli, execFn);
  if (!image) {
    return fail(
      "boba-bear-customer-auth:local image not present; cannot start recovered application candidate",
      "RECOVERED_APP_IMAGE_MISSING",
    );
  }

  const runToken = provisioned.runId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-20);
  const appContainer = `boba-rec-app-${runToken}`;
  const inspectExisting = execFn(cli, ["inspect", appContainer], { timeout: 15_000 });
  if (inspectExisting.status === 0) {
    return fail(`recovered app container already exists (reuse forbidden): ${appContainer}`, "TARGET_REUSE_FORBIDDEN");
  }

  const disposableSecrets = buildDisposableAuthEnv({
    databaseUrl: appUrlInternal,
    publicOrigin: "http://127.0.0.1:18081",
  });

  const envArgs = [];
  for (const [key, value] of Object.entries(disposableSecrets)) {
    envArgs.push("-e", `${key}=${value}`);
  }

  const run = execFn(
    cli,
    [
      "run",
      "-d",
      "--name",
      appContainer,
      "--network",
      provisioned.networkName,
      "-p",
      "127.0.0.1::8081",
      "--read-only",
      "--tmpfs",
      "/tmp",
      ...envArgs,
      image,
    ],
    { timeout: 120_000 },
  );
  if (run.status !== 0) {
    return fail(redactText(run.stderr || `failed to start recovered app container`), "RECOVERED_APP_START_FAILED");
  }

  const hostPort = resolvePublishedPort(cli, execFn, appContainer, "8081");
  if (!hostPort) {
    cleanupAppContainer(cli, execFn, appContainer);
    return fail("recovered app loopback publish missing", "RECOVERED_APP_HEALTH_UNREACHABLE");
  }

  const healthUrl = `http://127.0.0.1:${hostPort}${RECOVERED_APP_HEALTH_PATH}`;
  const healthTimeoutMs =
    typeof options.healthTimeoutMs === "number" && Number.isFinite(options.healthTimeoutMs)
      ? Math.max(1_000, options.healthTimeoutMs)
      : 60_000;
  const healthy = await waitForHealth(healthUrl, options.fetchFn, healthTimeoutMs);
  if (!healthy.ok) {
    cleanupAppContainer(cli, execFn, appContainer);
    return fail(healthy.reason ?? "recovered app health check failed", "RECOVERED_APP_HEALTH_FAILED");
  }

  return {
    ok: true,
    status: "STARTED",
    providerSuppression: suppression.mode,
    restoredDbBound: true,
    sourceUntouched: true,
    targetIdentity: provisioned.targetIdentity,
    appContainerName: appContainer,
    healthUrl,
    healthStatus: healthy.status,
    QUALIFYING_APP_RECOVERY: "NO",
    findings: [
      {
        code: "RECOVERED_APP_STARTED",
        image,
        networkName: provisioned.networkName,
        loopbackOnly: true,
        healthPath: RECOVERED_APP_HEALTH_PATH,
      },
    ],
    cleanup: () => cleanupAppContainer(cli, execFn, appContainer),
  };
}

/**
 * @param {string} cli
 * @param {Function} execFn
 * @returns {string | null}
 */
function resolveRecoveredAppImage(cli, execFn) {
  for (const name of RECOVERED_APP_IMAGE_CANDIDATES) {
    const probe = execFn(cli, ["image", "inspect", name], { timeout: 20_000 });
    if (probe.status === 0) return name;
  }
  return null;
}

/**
 * @param {{ databaseUrl: string, publicOrigin: string }} input
 */
function buildDisposableAuthEnv(input) {
  const secret = randomBytes(32).toString("base64url");
  const pii = randomBytes(32).toString("base64url");
  return {
    NODE_ENV: "production",
    BOBA_BEAR_ENV: "local",
    BOBA_BEAR_PUBLIC_ORIGIN: input.publicOrigin,
    BOBA_BEAR_LOG_LEVEL: "error",
    BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
    BOBA_BEAR_DATABASE_URL: input.databaseUrl,
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
    CUSTOMER_AUTH_SECRET: secret,
    CUSTOMER_AUTH_BASE_URL: input.publicOrigin,
    CUSTOMER_AUTH_PII_HASH_SECRET: pii,
    CUSTOMER_OTP_PROVIDER: "local",
    CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456",
    CUSTOMER_AUTH_TRUST_PROXY_HOPS: "0",
    CUSTOMER_AUTH_SERVICE_HOST: "0.0.0.0",
    CUSTOMER_AUTH_SERVICE_PORT: "8081",
    // Explicitly suppress payment/notification initiation.
    BOBA_PAYMENT_INITIATE: "0",
    BOBA_NOTIFICATION_INITIATE: "0",
  };
}

/**
 * @param {string} cli
 * @param {Function} execFn
 * @param {string} containerName
 * @param {string} containerPort
 */
function resolvePublishedPort(cli, execFn, containerName, containerPort) {
  const result = execFn(cli, ["port", containerName, containerPort], { timeout: 15_000 });
  if (result.status !== 0) return null;
  const match = String(result.stdout ?? "").match(/127\.0\.0\.1:(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {string} url
 * @param {Function} [fetchFn]
 * @param {number} timeoutMs
 */
async function waitForHealth(url, fetchFn, timeoutMs) {
  const fetchImpl = fetchFn ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, reason: "fetch unavailable for recovered app health check" };
  }
  const deadline = Date.now() + timeoutMs;
  let lastReason = "health check not attempted";
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url, { method: "GET" });
      if (response && response.ok) {
        return { ok: true, status: response.status };
      }
      lastReason = `health returned ${response?.status ?? "unknown"}`;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  return { ok: false, reason: redactText(lastReason) };
}

/**
 * @param {string} cli
 * @param {Function} execFn
 * @param {string} containerName
 */
function cleanupAppContainer(cli, execFn, containerName) {
  try {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
  } catch {
    // ignore
  }
}

/**
 * @param {string} reason
 * @param {string} code
 */
function fail(reason, code) {
  return {
    ok: false,
    status: "FAILED",
    reason: redactText(reason),
    code,
    QUALIFYING_APP_RECOVERY: "NO",
  };
}
