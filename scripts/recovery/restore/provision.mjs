/**
 * Fresh unique restore-target provisioning (IMP-037 §11).
 *
 * Positively provisions disposable recovery targets bound to RUN_ID.
 * Label-only inequality is insufficient — filesystem / database identity
 * must be bound into evidence and compared against the active source.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { ENVIRONMENT_CLASSIFICATION } from "../constants.mjs";
import {
  DISPOSABLE_POSTGRES_IMAGE,
  resolveContainerCli,
  stopEphemeralPostgres,
} from "../docker-exec.mjs";
import { canonicalizePath, evaluateTargetIdentitySafety } from "../identity.mjs";
import { isValidRunId } from "../run-id.mjs";
import { redactText } from "../redact.mjs";
import { waitForPostgresReady } from "../tools/postgres-ready.mjs";
import { assertFreshTarget, createRestoreTargetId } from "./target.mjs";

export const PITR_OWNERSHIP_MARKER = "TARGET_OWNED_BY_RUN";
export const LOGICAL_OWNERSHIP_MARKER = "LOGICAL_TARGET_OWNED_BY_RUN";

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
 * @property {string} [migratorDatabaseUrl]
 * @property {string} [appDatabaseUrl]
 * @property {string} [appDatabaseUrlInternal]
 * @property {string} containerName
 * @property {string} containerCli
 * @property {string} volumeOrPathId
 * @property {number} [hostPort]
 * @property {string} [networkName]
 * @property {boolean} [networkInternalVerified]
 * @property {boolean} [productionDnsAbsentVerified]
 * @property {boolean} created
 * @property {object} ownershipDescriptor
 */

export const NETWORK_OWNERSHIP_LABEL_RUN_ID = "boba.recovery.run_id";
export const NETWORK_OWNERSHIP_LABEL_OWNED = "boba.recovery.owned";

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
  const ownership = {
    runId,
    targetIdentity,
    pgdataPath,
    environment: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(
    path.join(workspaceRoot, targetIdentity, PITR_OWNERSHIP_MARKER),
    `${JSON.stringify(ownership, null, 2)}\n`,
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
 * Positively prove a PITR PGDATA path is run-owned, fresh, and distinct from source.
 * Arbitrary paths without a provisioner-issued ownership marker are BLOCKED.
 *
 * @param {object} options
 * @param {string} options.runId
 * @param {string} options.targetPgdataPath
 * @param {string} [options.targetIdentity]
 * @param {string} [options.sourcePgdataPath]
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 * @returns {{ ok: true, targetIdentity: string, pgdataPath: string, ownership: object } | { ok: false, reason: string, code: string }}
 */
export function assertOwnedPitrTarget(options) {
  const runId = options?.runId;
  if (!isValidRunId(runId)) {
    return { ok: false, reason: "assertOwnedPitrTarget requires a valid RUN_ID", code: "RUN_ID_INVALID" };
  }
  if (typeof options.targetPgdataPath !== "string" || !options.targetPgdataPath.trim()) {
    return {
      ok: false,
      reason: "target PGDATA path required for ownership proof",
      code: "TARGET_PGDATA_REQUIRED",
    };
  }

  const pgdataPath = path.resolve(options.targetPgdataPath.trim());
  const markerPath = path.join(path.dirname(pgdataPath), PITR_OWNERSHIP_MARKER);
  if (!existsSync(markerPath)) {
    return {
      ok: false,
      reason: `arbitrary or unowned PITR target BLOCKED (missing ${PITR_OWNERSHIP_MARKER}): ${pgdataPath}`,
      code: "TARGET_OWNERSHIP_MISSING",
    };
  }

  let ownership;
  try {
    ownership = JSON.parse(readFileSync(markerPath, "utf8"));
  } catch {
    return {
      ok: false,
      reason: "PITR ownership marker is not valid JSON",
      code: "TARGET_OWNERSHIP_INVALID",
    };
  }

  if (ownership?.runId !== runId) {
    return {
      ok: false,
      reason: "PITR ownership marker runId does not match current restore run",
      code: "TARGET_OWNERSHIP_RUN_MISMATCH",
    };
  }

  const markerIdentity =
    typeof ownership.targetIdentity === "string" ? ownership.targetIdentity.trim() : "";
  const expectedIdentity =
    typeof options.targetIdentity === "string" && options.targetIdentity.trim()
      ? options.targetIdentity.trim()
      : markerIdentity;
  if (!markerIdentity || markerIdentity !== expectedIdentity) {
    return {
      ok: false,
      reason: "PITR ownership marker targetIdentity mismatch",
      code: "TARGET_OWNERSHIP_IDENTITY_MISMATCH",
    };
  }

  const markerPgdata =
    typeof ownership.pgdataPath === "string" ? path.resolve(ownership.pgdataPath) : "";
  if (!markerPgdata || canonicalizePath(markerPgdata) !== canonicalizePath(pgdataPath)) {
    return {
      ok: false,
      reason: "PITR ownership marker pgdataPath does not match exact target",
      code: "TARGET_OWNERSHIP_PATH_MISMATCH",
    };
  }

  if (ownership.environment && ownership.environment !== ENVIRONMENT_CLASSIFICATION.RECOVERY) {
    return {
      ok: false,
      reason: "PITR ownership marker environment must be recovery",
      code: "TARGET_OWNERSHIP_ENVIRONMENT",
    };
  }

  if (!existsSync(pgdataPath)) {
    return {
      ok: false,
      reason: "owned PITR target PGDATA path does not exist",
      code: "TARGET_PGDATA_MISSING",
    };
  }

  try {
    const entries = readdirSync(pgdataPath);
    if (entries.length > 0) {
      return {
        ok: false,
        reason: "PITR target PGDATA is not empty; refusing reuse of an existing database cluster",
        code: "TARGET_REUSE_FORBIDDEN",
      };
    }
  } catch (error) {
    return {
      ok: false,
      reason: redactText(error instanceof Error ? error.message : String(error)),
      code: "TARGET_OWNERSHIP_INVALID",
    };
  }

  if (options.sourcePgdataPath) {
    const sourceCanon = canonicalizePath(path.resolve(options.sourcePgdataPath));
    const targetCanon = canonicalizePath(pgdataPath);
    if (sourceCanon && targetCanon && sourceCanon === targetCanon) {
      return {
        ok: false,
        reason: "PITR must never target source PGDATA (canonical path alias)",
        code: "SOURCE_EQUALS_TARGET",
      };
    }
  }

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity ?? "unspecified-source",
    targetIdentity: markerIdentity,
    sourceClassification: options.sourceClassification ?? ENVIRONMENT_CLASSIFICATION.PRODUCTION,
    targetClassification: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    targetPgdataPath: pgdataPath,
    forceProduction: false,
    reuseExistingTarget: false,
  });
  if (!fresh.ok) {
    return { ok: false, reason: fresh.reason, code: fresh.code };
  }

  return { ok: true, targetIdentity: markerIdentity, pgdataPath, ownership };
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
  const runToken = runId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-24);
  const containerName = `boba-rec-tgt-${runToken}`;
  const networkName = `boba-rec-net-${runToken}`;
  const image = options.image ?? DISPOSABLE_POSTGRES_IMAGE;
  const password = generateRecoveryPassword();
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

  const abortProvision = () => {
    execFn(cli, ["rm", "-f", containerName], { timeout: 30_000 });
    const owned = removeOwnedNetwork(execFn, cli, { networkName, runId });
    if (!owned.ok) {
      // Mid-provision abort of the exact network name we created in this call.
      execFn(cli, ["network", "rm", networkName], { timeout: 30_000 });
    }
  };

  // Confirm container name does not already exist.
  const inspect = execFn(cli, ["inspect", containerName], { timeout: 15_000 });
  if (inspect.status === 0) {
    return {
      ok: false,
      reason: `recovery target container already exists (reuse forbidden): ${containerName}`,
      code: "TARGET_REUSE_FORBIDDEN",
    };
  }

  // Unique RUN_ID-owned internal network (no external routing).
  const existingNet = execFn(cli, ["network", "inspect", networkName], { timeout: 15_000 });
  if (existingNet.status === 0) {
    return {
      ok: false,
      reason: `recovery target network already exists (reuse forbidden): ${networkName}`,
      code: "TARGET_REUSE_FORBIDDEN",
    };
  }

  const netCreate = execFn(
    cli,
    [
      "network",
      "create",
      "--internal",
      "--label",
      `${NETWORK_OWNERSHIP_LABEL_RUN_ID}=${runId}`,
      "--label",
      `${NETWORK_OWNERSHIP_LABEL_OWNED}=1`,
      networkName,
    ],
    { timeout: 30_000 },
  );
  if (netCreate.status !== 0) {
    return {
      ok: false,
      reason: redactText(netCreate.stderr || `failed to create internal recovery network ${networkName}`),
      code: "TARGET_NETWORK_PROVISION_FAILED",
    };
  }

  const networkProof = inspectNetworkInternal(execFn, cli, networkName);
  if (!networkProof.ok || networkProof.internal !== true) {
    removeOwnedNetwork(execFn, cli, { networkName, runId });
    return {
      ok: false,
      reason:
        networkProof.reason ??
        `recovery network is not internal after create (refusing default/non-isolated network): ${networkName}`,
      code: "NETWORK_NOT_INTERNAL",
    };
  }

  const run = execFn(cli, [
    "run",
    "-d",
    "--name",
    containerName,
    "--network",
    networkName,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-e",
    `POSTGRES_USER=${dbUser}`,
    "-e",
    `POSTGRES_DB=${dbName}`,
    // Loopback-only host publish for repository migration authority / validation.
    "-p",
    "127.0.0.1::5432",
    image,
  ]);
  if (run.status !== 0) {
    abortProvision();
    return {
      ok: false,
      reason: redactText(run.stderr || `failed to start recovery postgres (${image})`),
      code: "TARGET_PROVISION_FAILED",
    };
  }

  const published = resolvePublishedEndpoint(execFn, cli, containerName);
  if (!published) {
    abortProvision();
    return {
      ok: false,
      reason: "recovery target publish is not loopback-only; refusing a public endpoint",
      code: "TARGET_PUBLISH_NOT_LOOPBACK",
    };
  }
  const hostPort = published.port;

  const databaseUrl = `postgresql://${dbUser}:${password}@127.0.0.1:${hostPort}/${dbName}`;
  if (options.sourceDatabaseUrl && normalizeDbEndpoint(options.sourceDatabaseUrl) === normalizeDbEndpoint(databaseUrl)) {
    abortProvision();
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
    abortProvision();
    return { ok: false, reason: fresh.reason, code: fresh.code };
  }

  // Wait for stable readiness (fail closed). A single pg_isready during init
  // can race the post-init restart on PostgreSQL 18 images.
  const ready = waitForPostgresReady({
    cli,
    containerName,
    user: dbUser,
    db: dbName,
    execFn,
  });
  if (!ready) {
    abortProvision();
    return {
      ok: false,
      reason: "provisioned recovery postgres did not become ready",
      code: "TARGET_PROVISION_FAILED",
    };
  }

  // Bootstrap migrator/app roles so post-restore migration uses the same
  // repository authority (scripts/database/migrate.ts) as production recovery.
  const migratorPassword = generateRecoveryPassword();
  const appPassword = generateRecoveryPassword();
  const bootstrapSql = [
    `CREATE ROLE boba_bear_migrator WITH LOGIN PASSWORD '${migratorPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    `CREATE ROLE boba_bear_app WITH LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    `GRANT CONNECT ON DATABASE ${dbName} TO boba_bear_migrator;`,
    `GRANT CREATE ON DATABASE ${dbName} TO boba_bear_migrator;`,
    `GRANT CONNECT ON DATABASE ${dbName} TO boba_bear_app;`,
    `CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION boba_bear_migrator;`,
    `CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION boba_bear_migrator;`,
    `REVOKE ALL ON SCHEMA app FROM PUBLIC;`,
    `REVOKE ALL ON SCHEMA drizzle FROM PUBLIC;`,
    `GRANT USAGE ON SCHEMA app TO boba_bear_app;`,
    `ALTER ROLE boba_bear_migrator IN DATABASE ${dbName} SET search_path = app, public;`,
    `ALTER ROLE boba_bear_app IN DATABASE ${dbName} SET search_path = app, public;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO boba_bear_app;`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO boba_bear_app;`,
  ].join("\n");
  const bootstrap = execFn(
    cli,
    [
      "exec",
      containerName,
      "psql",
      "-U",
      dbUser,
      "-d",
      dbName,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      bootstrapSql,
    ],
    { timeout: 60_000 },
  );
  if (bootstrap.status !== 0) {
    abortProvision();
    return {
      ok: false,
      reason: redactText(bootstrap.stderr || "failed to bootstrap recovery migrator roles"),
      code: "TARGET_PROVISION_FAILED",
    };
  }

  // Re-inspect after container attach — isolation claim must come from observed runtime state.
  const postAttachProof = inspectNetworkInternal(execFn, cli, networkName);
  if (!postAttachProof.ok || postAttachProof.internal !== true) {
    abortProvision();
    return {
      ok: false,
      reason:
        postAttachProof.reason ??
        `recovery network internal proof missing after attach: ${networkName}`,
      code: "NETWORK_NOT_INTERNAL",
    };
  }

  const migratorDatabaseUrl = `postgresql://boba_bear_migrator:${migratorPassword}@127.0.0.1:${hostPort}/${dbName}`;
  // Host-loopback app URL for host-side tools; internal URL for recovered app
  // containers attached to the run-owned recovery network (never source/prod DNS).
  const appDatabaseUrl = `postgresql://boba_bear_app:${appPassword}@127.0.0.1:${hostPort}/${dbName}`;
  const appDatabaseUrlInternal = `postgresql://boba_bear_app:${appPassword}@${containerName}:5432/${dbName}`;

  const ownershipDescriptor = {
    runId,
    targetIdentity,
    databaseUrl,
    endpoint: normalizeDbEndpoint(databaseUrl),
    environment: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    containerName,
    networkName,
    volumeOrPathId: `${cli}:${containerName}`,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    target: {
      kind: "logical",
      runId,
      targetIdentity,
      databaseUrl,
      migratorDatabaseUrl,
      appDatabaseUrl,
      appDatabaseUrlInternal,
      containerName,
      containerCli: cli,
      volumeOrPathId: `${cli}:${containerName}`,
      hostPort,
      networkName,
      networkInternalVerified: true,
      // No production DNS/host mapping is introduced by this provisioner.
      productionDnsAbsentVerified: true,
      created: true,
      ownershipDescriptor,
    },
  };
}

/**
 * Positively prove an external logical restore URL is recovery-owned and distinct from source.
 * Arbitrary URLs without a provisioner-issued ownership descriptor are BLOCKED.
 *
 * @param {object} options
 * @param {string} options.runId
 * @param {string} options.databaseUrl
 * @param {string} options.sourceDatabaseUrl
 * @param {object | string} options.ownershipDescriptor descriptor object or JSON file path
 * @param {string} [options.targetIdentity]
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 */
export function assertOwnedLogicalTarget(options) {
  const runId = options?.runId;
  if (!isValidRunId(runId)) {
    return { ok: false, reason: "assertOwnedLogicalTarget requires a valid RUN_ID", code: "RUN_ID_INVALID" };
  }
  if (typeof options.databaseUrl !== "string" || !options.databaseUrl.trim()) {
    return { ok: false, reason: "databaseUrl required for logical ownership proof", code: "TARGET_URL_REQUIRED" };
  }
  if (typeof options.sourceDatabaseUrl !== "string" || !options.sourceDatabaseUrl.trim()) {
    return {
      ok: false,
      reason: "source endpoint unresolved; refuse logical restore into external target",
      code: "SOURCE_ENDPOINT_UNRESOLVED",
    };
  }

  const ownership = loadOwnershipDescriptor(options.ownershipDescriptor);
  if (!ownership.ok) {
    return ownership;
  }
  const descriptor = ownership.descriptor;

  if (descriptor.runId !== runId) {
    return {
      ok: false,
      reason: "logical ownership descriptor runId does not match current restore run",
      code: "TARGET_OWNERSHIP_RUN_MISMATCH",
    };
  }
  const markerIdentity =
    typeof descriptor.targetIdentity === "string" ? descriptor.targetIdentity.trim() : "";
  const expectedIdentity =
    typeof options.targetIdentity === "string" && options.targetIdentity.trim()
      ? options.targetIdentity.trim()
      : markerIdentity;
  if (!markerIdentity || markerIdentity !== expectedIdentity) {
    return {
      ok: false,
      reason: "logical ownership descriptor targetIdentity mismatch",
      code: "TARGET_OWNERSHIP_IDENTITY_MISMATCH",
    };
  }
  if (descriptor.environment !== ENVIRONMENT_CLASSIFICATION.RECOVERY) {
    return {
      ok: false,
      reason: "logical ownership descriptor environment must be recovery",
      code: "TARGET_OWNERSHIP_ENVIRONMENT",
    };
  }

  const descriptorEndpoint =
    typeof descriptor.endpoint === "string"
      ? descriptor.endpoint
      : typeof descriptor.databaseUrl === "string"
        ? normalizeDbEndpoint(descriptor.databaseUrl)
        : "";
  const targetEndpoint = normalizeDbEndpoint(options.databaseUrl);
  if (!descriptorEndpoint || descriptorEndpoint !== targetEndpoint) {
    return {
      ok: false,
      reason: "logical ownership descriptor endpoint does not match --database-url",
      code: "TARGET_OWNERSHIP_ENDPOINT_MISMATCH",
    };
  }

  const notSource = assertLogicalTargetNotSource(options.databaseUrl, options.sourceDatabaseUrl);
  if (!notSource.ok) {
    return { ok: false, reason: notSource.reason, code: notSource.code ?? "SOURCE_EQUALS_TARGET" };
  }

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity ?? "unspecified-source",
    targetIdentity: markerIdentity,
    sourceClassification: options.sourceClassification ?? ENVIRONMENT_CLASSIFICATION.PRODUCTION,
    targetClassification: ENVIRONMENT_CLASSIFICATION.RECOVERY,
    forceProduction: false,
    reuseExistingTarget: false,
  });
  if (!fresh.ok) {
    return { ok: false, reason: fresh.reason, code: fresh.code };
  }

  return { ok: true, targetIdentity: markerIdentity, ownership: descriptor };
}

/**
 * @param {unknown} descriptor
 * @returns {{ ok: true, descriptor: Record<string, unknown> } | { ok: false, reason: string, code: string }}
 */
function loadOwnershipDescriptor(descriptor) {
  if (descriptor == null) {
    return {
      ok: false,
      reason: "arbitrary remote URL without ownership proof is BLOCKED",
      code: "TARGET_OWNERSHIP_MISSING",
    };
  }
  if (typeof descriptor === "string") {
    const filePath = descriptor.trim();
    if (!filePath || !existsSync(filePath)) {
      return {
        ok: false,
        reason: `logical ownership descriptor file missing: ${filePath || "(empty)"}`,
        code: "TARGET_OWNERSHIP_MISSING",
      };
    }
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8"));
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          ok: false,
          reason: "logical ownership descriptor must be a JSON object",
          code: "TARGET_OWNERSHIP_INVALID",
        };
      }
      return { ok: true, descriptor: /** @type {Record<string, unknown>} */ (parsed) };
    } catch {
      return {
        ok: false,
        reason: "logical ownership descriptor is not valid JSON",
        code: "TARGET_OWNERSHIP_INVALID",
      };
    }
  }
  if (typeof descriptor === "object" && !Array.isArray(descriptor)) {
    return { ok: true, descriptor: /** @type {Record<string, unknown>} */ (descriptor) };
  }
  return {
    ok: false,
    reason: "logical ownership descriptor must be an object or file path",
    code: "TARGET_OWNERSHIP_INVALID",
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
    const marker = path.join(target.workspaceRoot, target.targetIdentity, PITR_OWNERSHIP_MARKER);
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
    const cli = target.containerCli ?? resolveContainerCli() ?? "docker";
    const execFn =
      options.execFn ??
      ((command, args, opts = {}) => {
        const result = spawnSync(command, args, {
          encoding: "utf8",
          timeout: opts.timeout ?? 30_000,
        });
        return {
          status: typeof result.status === "number" ? result.status : 1,
          stdout: result.stdout ?? "",
          stderr: result.stderr ?? "",
        };
      });
    const stopped = stopEphemeralPostgres({
      containerName: target.containerName,
      containerCli: cli,
      execFn,
    });
    if (!stopped.ok) {
      return stopped;
    }
    if (typeof target.networkName === "string" && target.networkName.trim()) {
      const netRemoved = removeOwnedNetwork(execFn, cli, {
        networkName: target.networkName.trim(),
        runId: target.runId,
      });
      if (!netRemoved.ok) {
        return netRemoved;
      }
    }
    return { ok: true };
  }
  return { ok: false, reason: "unknown provisioned target kind" };
}

/**
 * Bind a provisioned target into restore safety evidence fields.
 * @param {ProvisionedPitrTarget | ProvisionedLogicalTarget} target
 */
export function targetEvidenceFields(target) {
  /** @type {Record<string, unknown>} */
  const finding = {
    code: "FRESH_TARGET_PROVISIONED",
    kind: target.kind,
    targetIdentity: target.targetIdentity,
    volumeOrPathId: target.volumeOrPathId,
    runId: target.runId,
  };
  if (target.kind === "logical") {
    if (typeof target.networkName === "string" && target.networkName.trim()) {
      finding.networkName = target.networkName.trim();
    }
    if (typeof target.networkInternalVerified === "boolean") {
      finding.networkInternalVerified = target.networkInternalVerified;
    }
    if (typeof target.productionDnsAbsentVerified === "boolean") {
      finding.productionDnsAbsentVerified = target.productionDnsAbsentVerified;
    }
  }
  return {
    targetIdentityMarker: target.targetIdentity,
    findings: [finding],
  };
}

/**
 * @param {string} databaseUrl
 * @param {string} [sourceDatabaseUrl]
 */
export function assertLogicalTargetNotSource(databaseUrl, sourceDatabaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") {
    return { ok: false, reason: "databaseUrl required for logical target binding", code: "TARGET_URL_REQUIRED" };
  }
  if (typeof sourceDatabaseUrl !== "string" || !sourceDatabaseUrl.trim()) {
    return {
      ok: false,
      reason: "source endpoint unresolved; refuse logical target binding",
      code: "SOURCE_ENDPOINT_UNRESOLVED",
    };
  }
  if (normalizeDbEndpoint(databaseUrl) === normalizeDbEndpoint(sourceDatabaseUrl)) {
    return {
      ok: false,
      reason: "databaseUrl resolves to the active/source database endpoint",
      code: "SOURCE_EQUALS_TARGET",
    };
  }
  return { ok: true };
}

export { normalizeDbEndpoint };

/**
 * Positively inspect a Podman/Docker network and report whether it is internal.
 *
 * @param {Function} execFn
 * @param {string} cli
 * @param {string} networkName
 * @returns {{ ok: true, internal: boolean, networkName: string, raw?: object } | { ok: false, reason: string, internal?: false }}
 */
export function inspectNetworkInternal(execFn, cli, networkName) {
  if (typeof networkName !== "string" || !networkName.trim()) {
    return { ok: false, reason: "network name required for internal proof", internal: false };
  }
  const result = execFn(cli, ["network", "inspect", networkName.trim()], { timeout: 15_000 });
  if (result.status !== 0) {
    return {
      ok: false,
      reason: redactText(result.stderr || `network inspect failed for ${networkName}`),
      internal: false,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(String(result.stdout ?? ""));
  } catch {
    return { ok: false, reason: "network inspect returned invalid JSON", internal: false };
  }
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry !== "object") {
    return { ok: false, reason: "network inspect returned empty result", internal: false };
  }
  const internal = entry.Internal === true || entry.internal === true;
  const observedName =
    (typeof entry.Name === "string" && entry.Name) ||
    (typeof entry.name === "string" && entry.name) ||
    networkName.trim();
  return { ok: true, internal, networkName: observedName, raw: entry };
}

/**
 * Remove a network only when ownership labels prove it belongs to this RUN_ID.
 * Ambiguous / missing ownership → refuse cleanup.
 *
 * @param {Function} execFn
 * @param {string} cli
 * @param {{ networkName: string, runId: string }} ownership
 * @returns {{ ok: true } | { ok: false, reason: string, code?: string }}
 */
export function removeOwnedNetwork(execFn, cli, ownership) {
  const networkName = typeof ownership?.networkName === "string" ? ownership.networkName.trim() : "";
  const runId = ownership?.runId;
  if (!networkName || !isValidRunId(runId)) {
    return {
      ok: false,
      reason: "refusing network cleanup without unambiguous run-owned network identity",
      code: "NETWORK_CLEANUP_OWNERSHIP_AMBIGUOUS",
    };
  }

  const inspected = inspectNetworkInternal(execFn, cli, networkName);
  if (!inspected.ok) {
    // Already gone is acceptable after container removal.
    if (/no such|not found/i.test(inspected.reason ?? "")) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: inspected.reason,
      code: "NETWORK_CLEANUP_OWNERSHIP_AMBIGUOUS",
    };
  }

  const labels = readNetworkLabels(inspected.raw);
  const ownedFlag = labels[NETWORK_OWNERSHIP_LABEL_OWNED];
  const ownedRun = labels[NETWORK_OWNERSHIP_LABEL_RUN_ID];
  if (ownedFlag !== "1" || ownedRun !== runId) {
    return {
      ok: false,
      reason: `refusing cleanup of unowned or ambiguous network ${networkName}`,
      code: "NETWORK_CLEANUP_OWNERSHIP_AMBIGUOUS",
    };
  }

  const removed = execFn(cli, ["network", "rm", networkName], { timeout: 30_000 });
  if (removed.status !== 0) {
    return {
      ok: false,
      reason: redactText(removed.stderr || `failed to remove run-owned network ${networkName}`),
      code: "NETWORK_CLEANUP_FAILED",
    };
  }
  return { ok: true };
}

/**
 * @param {object | undefined} raw
 * @returns {Record<string, string>}
 */
function readNetworkLabels(raw) {
  if (!raw || typeof raw !== "object") return {};
  const labels = raw.Labels ?? raw.labels;
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(labels)) {
    out[String(key)] = String(value);
  }
  return out;
}

/**
 * @param {Function} execFn
 * @param {string} cli
 * @param {string} containerName
 * @returns {{ host: "127.0.0.1", port: number } | null}
 */
function resolvePublishedEndpoint(execFn, cli, containerName) {
  const result = execFn(cli, ["port", containerName, "5432/tcp"], { timeout: 15_000 });
  if (result.status !== 0) return null;
  const line = String(result.stdout ?? "")
    .trim()
    .split(/\s+/)[0];
  const match = /^127\.0\.0\.1:(\d+)$/.exec(line);
  if (!match) return null;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port <= 0) return null;
  return { host: "127.0.0.1", port };
}

/**
 * Crypto-random disposable target password. RUN_ID is provenance, not a secret.
 * @returns {string}
 */
function generateRecoveryPassword() {
  return randomBytes(24).toString("base64url");
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
