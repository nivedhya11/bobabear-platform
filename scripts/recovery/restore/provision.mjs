/**
 * Fresh unique restore-target provisioning (IMP-037 §11).
 *
 * Positively provisions disposable recovery targets bound to RUN_ID.
 * Label-only inequality is insufficient — filesystem / database identity
 * must be bound into evidence and compared against the active source.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { ENVIRONMENT_CLASSIFICATION } from "../constants.mjs";
import {
  DISPOSABLE_POSTGRES_IMAGE,
  resolveContainerCli,
  stopEphemeralPostgres,
} from "../docker-exec.mjs";
import { evaluateTargetIdentitySafety } from "../identity.mjs";
import { isValidRunId } from "../run-id.mjs";
import { redactText } from "../redact.mjs";
import { assertFreshTarget, createRestoreTargetId } from "./target.mjs";

/**
 * @typedef {object} ProvisionedPitrTarget
 * @property {"pitr"} kind
 * @property {string} runId
 * @property {string} targetIdentity
 * @property {string} workspaceRoot
 * @property {string} pgdataPath
 * @property {string} volumeOrPathId
 * @property {boolean} created
 */

/**
 * @typedef {object} ProvisionedLogicalTarget
 * @property {"logical"} kind
 * @property {string} runId
 * @property {string} targetIdentity
 * @property {string} databaseUrl
 * @property {string} containerName
 * @property {string} containerCli
 * @property {string} volumeOrPathId
 * @property {number} [hostPort]
 * @property {boolean} created
 */

/**
 * Provision a fresh PITR PGDATA workspace derived from RUN_ID.
 * Fails closed if the path already exists (reuse forbidden).
 *
 * @param {object} options
 * @param {string} options.runId
 * @param {string} [options.workspaceRoot]
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 * @param {string} [options.sourcePgdataPath]
 * @returns {{ ok: true, target: ProvisionedPitrTarget } | { ok: false, reason: string, code?: string }}
 */
export function provisionPitrTarget(options) {
  const runId = options?.runId;
  if (!isValidRunId(runId)) {
    return { ok: false, reason: "provisionPitrTarget requires a valid RUN_ID", code: "RUN_ID_INVALID" };
  }
  const workspaceRoot =
    typeof options.workspaceRoot === "string" && options.workspaceRoot.trim()
      ? path.resolve(options.workspaceRoot.trim())
      : path.join(os.tmpdir(), "boba-recovery-targets");
  const targetIdentity = createRestoreTargetId(runId);
  const pgdataPath = path.join(workspaceRoot, targetIdentity, "pgdata");

  if (existsSync(pgdataPath)) {
    return {
      ok: false,
      reason: `PITR target PGDATA already exists (reuse forbidden): ${pgdataPath}`,
      code: "TARGET_REUSE_FORBIDDEN",
    };
  }
  if (options.sourcePgdataPath && path.resolve(options.sourcePgdataPath) === pgdataPath) {
    return {
      ok: false,
      reason: "provisioned PITR target equals source PGDATA",
      code: "SOURCE_EQUALS_TARGET",
    };
  }

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity ?? "unspecified-source",
    targetIdentity,
    sourceClassification: options.sourceClassification ?? ENVIRONMENT_CLASSIFICATION.PRODUCTION,
    targetClassification: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    targetPgdataPath: pgdataPath,
    forceProduction: false,
    reuseExistingTarget: false,
  });
  if (!fresh.ok) {
    return { ok: false, reason: fresh.reason, code: fresh.code };
  }

  mkdirSync(pgdataPath, { recursive: true });
  // Marker proves this path was provisioned by this run (cleanup ownership).
  writeFileSync(
    path.join(workspaceRoot, targetIdentity, "TARGET_OWNED_BY_RUN"),
    `${JSON.stringify({ runId, targetIdentity, pgdataPath, createdAt: new Date().toISOString() }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );

  return {
    ok: true,
    target: {
      kind: "pitr",
      runId,
      targetIdentity,
      workspaceRoot,
      pgdataPath,
      volumeOrPathId: pgdataPath,
      created: true,
    },
  };
}

/**
 * Provision a fresh disposable PostgreSQL 18 recovery database/container.
 *
 * @param {object} options
 * @param {string} options.runId
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 * @param {string} [options.sourceDatabaseUrl]
 * @param {string} [options.image]
 * @param {Function} [options.execFn]
 * @returns {Promise<{ ok: true, target: ProvisionedLogicalTarget } | { ok: false, reason: string, code?: string }>}
 */
export async function provisionLogicalTarget(options) {
  const runId = options?.runId;
  if (!isValidRunId(runId)) {
    return { ok: false, reason: "provisionLogicalTarget requires a valid RUN_ID", code: "RUN_ID_INVALID" };
  }
  const cli = options.containerCli ?? resolveContainerCli();
  if (!cli) {
    return {
      ok: false,
      reason: "neither docker nor podman is available to provision a fresh recovery database",
      code: "CONTAINER_RUNTIME_UNAVAILABLE",
    };
  }

  const targetIdentity = createRestoreTargetId(runId);
  const containerName = `boba-rec-tgt-${runId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-24)}`;
  const image = options.image ?? DISPOSABLE_POSTGRES_IMAGE;
  const password = `rec-${runId.slice(-12)}`;
  const dbUser = "boba_recovery";
  const dbName = "boba_recovery";

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

  // Confirm container name does not already exist.
  const inspect = execFn(cli, ["inspect", containerName], { timeout: 15_000 });
  if (inspect.status === 0) {
    return {
      ok: false,
      reason: `recovery target container already exists (reuse forbidden): ${containerName}`,
      code: "TARGET_REUSE_FORBIDDEN",
    };
  }

  const run = execFn(cli, [
    "run",
    "-d",
    "--name",
    containerName,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-e",
    `POSTGRES_USER=${dbUser}`,
    "-e",
    `POSTGRES_DB=${dbName}`,
    "-P",
    image,
  ]);
  if (run.status !== 0) {
    return {
      ok: false,
      reason: redactText(run.stderr || `failed to start recovery postgres (${image})`),
      code: "TARGET_PROVISION_FAILED",
    };
  }

  const hostPort = resolvePublishedPort(execFn, cli, containerName);
  if (!hostPort) {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
    return {
      ok: false,
      reason: "unable to resolve published host port for recovery target",
      code: "TARGET_IDENTITY_UNRESOLVED",
    };
  }

  const databaseUrl = `postgresql://${dbUser}:${password}@127.0.0.1:${hostPort}/${dbName}`;
  if (options.sourceDatabaseUrl && normalizeDbEndpoint(options.sourceDatabaseUrl) === normalizeDbEndpoint(databaseUrl)) {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
    return {
      ok: false,
      reason: "provisioned logical target resolves to the active/source database endpoint",
      code: "SOURCE_EQUALS_TARGET",
    };
  }

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity ?? "unspecified-source",
    targetIdentity,
    sourceClassification: options.sourceClassification ?? ENVIRONMENT_CLASSIFICATION.PRODUCTION,
    targetClassification: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    forceProduction: false,
    reuseExistingTarget: false,
  });
  if (!fresh.ok) {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
    return { ok: false, reason: fresh.reason, code: fresh.code };
  }

  // Wait for readiness (fail closed).
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    const probe = execFn(cli, ["exec", containerName, "pg_isready", "-U", dbUser, "-d", dbName], {
      timeout: 10_000,
    });
    if (probe.status === 0) {
      ready = true;
      break;
    }
    spawnSync(process.execPath, ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,500)"]);
  }
  if (!ready) {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
    return {
      ok: false,
      reason: "provisioned recovery postgres did not become ready",
      code: "TARGET_PROVISION_FAILED",
    };
  }

  return {
    ok: true,
    target: {
      kind: "logical",
      runId,
      targetIdentity,
      databaseUrl,
      containerName,
      containerCli: cli,
      volumeOrPathId: `${cli}:${containerName}`,
      hostPort,
      created: true,
    },
  };
}

/**
 * Cleanup only run-owned provisioned targets.
 *
 * @param {ProvisionedPitrTarget | ProvisionedLogicalTarget | null | undefined} target
 * @param {object} [options]
 * @param {Function} [options.execFn]
 */
export function cleanupProvisionedTarget(target, options = {}) {
  if (!target || target.created !== true) {
    return { ok: false, reason: "refusing cleanup of non-run-owned or missing target" };
  }
  if (target.kind === "pitr") {
    const marker = path.join(target.workspaceRoot, target.targetIdentity, "TARGET_OWNED_BY_RUN");
    if (!existsSync(marker)) {
      return { ok: false, reason: "PITR target ownership marker missing; cleanup refused" };
    }
    try {
      const owned = JSON.parse(readFileSync(marker, "utf8"));
      if (owned.runId !== target.runId) {
        return { ok: false, reason: "PITR target ownership mismatch; cleanup refused" };
      }
      rmSync(path.join(target.workspaceRoot, target.targetIdentity), { recursive: true, force: true });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: redactText(error instanceof Error ? error.message : String(error)),
      };
    }
  }
  if (target.kind === "logical") {
    const stopped = stopEphemeralPostgres({
      containerName: target.containerName,
      containerCli: target.containerCli,
      execFn: options.execFn,
    });
    return stopped;
  }
  return { ok: false, reason: "unknown provisioned target kind" };
}

/**
 * Bind a provisioned target into restore safety evidence fields.
 * @param {ProvisionedPitrTarget | ProvisionedLogicalTarget} target
 */
export function targetEvidenceFields(target) {
  return {
    targetIdentityMarker: target.targetIdentity,
    findings: [
      {
        code: "FRESH_TARGET_PROVISIONED",
        kind: target.kind,
        targetIdentity: target.targetIdentity,
        volumeOrPathId: target.volumeOrPathId,
        runId: target.runId,
      },
    ],
  };
}

/**
 * @param {string} databaseUrl
 * @param {string} [sourceDatabaseUrl]
 */
export function assertLogicalTargetNotSource(databaseUrl, sourceDatabaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") {
    return { ok: false, reason: "databaseUrl required for logical target binding" };
  }
  if (sourceDatabaseUrl && normalizeDbEndpoint(databaseUrl) === normalizeDbEndpoint(sourceDatabaseUrl)) {
    return {
      ok: false,
      reason: "databaseUrl resolves to the active/source database endpoint",
      code: "SOURCE_EQUALS_TARGET",
    };
  }
  // Ambiguous localhost/postgres defaults remain forbidden (handled by logical restore).
  return { ok: true };
}

/**
 * @param {Function} execFn
 * @param {string} cli
 * @param {string} containerName
 * @returns {number | null}
 */
function resolvePublishedPort(execFn, cli, containerName) {
  const result = execFn(cli, ["port", containerName, "5432/tcp"], { timeout: 15_000 });
  if (result.status !== 0) return null;
  const match = /(\d+)\s*$/.exec(String(result.stdout ?? "").trim());
  if (!match) {
    const alt = /:(\d+)/.exec(String(result.stdout ?? ""));
    return alt ? Number(alt[1]) : null;
  }
  return Number(match[1]);
}

/**
 * @param {string} url
 */
function normalizeDbEndpoint(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//, "")}`.toLowerCase();
  } catch {
    return String(url).trim().toLowerCase();
  }
}

// Re-export identity helpers used by callers.
export { assertFreshTarget, createRestoreTargetId, evaluateTargetIdentitySafety };
