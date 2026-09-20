#!/usr/bin/env node
/**
 * IMP-037 recovery operator CLI.
 * Wired commands call real modules. Missing docker/pgBackRest/credentials → BLOCKED/FAILURE —
 * never placeholder SUCCEEDED.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CLI_EXIT, OPERATION_STATUS, OPERATION_TYPE, READINESS_LEVEL, RECOVERY_LAYER } from "./constants.mjs";
import { generateRunId } from "./run-id.mjs";
import { createEvidence, evaluateQualifyingRecoveryProof, validateEvidence } from "./evidence.mjs";
import { evaluateTargetIdentitySafety } from "./identity.mjs";
import { evaluateReadiness } from "./readiness.mjs";
import { inspectEvidence, persistEvidence, readRunEvidence } from "./store.mjs";
import { redactText, safeJson } from "./redact.mjs";
import { resolveCandidateProvenance } from "./candidate.mjs";
import { runLayer1Backup } from "./layer1/backup.mjs";
import { assertPgbackrestVersion } from "./layer1/config.mjs";
import { planRepositoryGenerationRotation } from "./layer1/rotation.mjs";
import { reconcileLocalCompleteMarker, runLogicalBackup } from "./layer2/backup.mjs";
import { resolveAgeBinary } from "./layer2/age.mjs";
import { planAgeRecipientRotation } from "./layer2/rotation.mjs";
import { runPitrRestore } from "./restore/pitr.mjs";
import { runLogicalRestore } from "./restore/logical.mjs";
import { runPortabilityRehearsal } from "./portability/rehearse.mjs";
import { evaluateHighRiskMigrationGate, selectLatestAttemptEvidence } from "./gate/high-risk.mjs";
import { observeCapacity } from "./capacity/observe.mjs";
import { createLocalObjectStore, createLogicalSpacesObjectStore, validateSpacesBucketConfig } from "./spaces/index.mjs";
import { validateSystemdUnits } from "./systemd/validate.mjs";
import { dockerComposeExecPostgres } from "./docker-exec.mjs";

const IMPLEMENTED_COMMANDS = new Set([
  "status",
  "evidence",
  "target",
  "backup",
  "restore",
  "drill",
  "rehearsal",
  "gate",
  "readiness-gate",
  "capacity",
  "systemd",
  "pgbackrest",
  "rotate-keys",
  "spaces",
  "help",
]);

export function parseArgs(argv) {
  const args = argv.slice(2);
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--json") {
      flags.json = true;
      continue;
    }
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
        continue;
      }
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[token.slice(2)] = next;
        i += 1;
      } else {
        flags[token.slice(2)] = true;
      }
      continue;
    }
    positionals.push(token);
  }
  return { positionals, flags };
}

export function usage() {
  return [
    "BOBA Bear IMP-037 recovery tooling",
    "",
    "Implemented:",
    "  recovery status [--json] [--evidence-dir DIR]",
    "  recovery evidence validate [--json] [--evidence-dir DIR] [--run-id RUN_ID]",
    "  recovery evidence reconcile-layer2 --run-id RUN_ID --evidence-dir DIR (--local-store DIR | Spaces env) [--json]",
    "  recovery target check --source ID --target ID --source-class CLASS --target-class CLASS [--target-pgdata PATH] [--json]",
    "  recovery backup layer1 --type full|diff [--evidence-dir DIR] [--generation N] [--json]",
    "  recovery backup layer2 [--evidence-dir DIR] [--local-store DIR] [--recipient AGE_RECIPIENT] [--json]",
    "  recovery restore pitr --source ID --target-time|--target-lsn|--target-name VALUE [--workspace-root DIR] [--target-pgdata OWNED_PATH] [--evidence-dir DIR] [--json]",
    "  recovery restore logical --run-id RUN_ID --source ID --identity-file PATH [--local-store DIR] [--database-url URL --target-ownership FILE] [--evidence-dir DIR] [--json]",
    "  recovery drill|rehearsal --run-id-to-restore RUN_ID --source ID --identity-file PATH [--local-store DIR] [--evidence-dir DIR] [--json]",
    "  recovery gate|readiness-gate high-risk [--evidence-dir DIR] [--json]",
    "  recovery capacity [--layer1-base-bytes N] [--layer1-wal-bytes N] [--layer2-bytes N] [--json]",
    "  recovery systemd validate [--unit-dir DIR] [--json]",
    "  recovery pgbackrest version [--json]",
    "  recovery rotate-keys layer1|layer2 [--generation N] [--recipient AGE] [--json]",
    "  recovery spaces config-check [--bucket NAME] [--endpoint URL|--local-root DIR] [--credential-env-prefix PREFIX] [--json]",
    "",
    "Layer 2 Spaces env (logical bucket — distinct from physical/pgBackRest):",
    "  BOBA_RECOVERY_LOGICAL_SPACES_BUCKET / _ENDPOINT / _REGION",
    "  BOBA_LOGICAL_SPACES_ACCESS_KEY_ID + BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY",
    "  Live provider calls: BOBA_RECOVERY_REAL_SPACES=1 (versioning must be ENABLED; not WORM)",
    "",
    "Safety: --force-production is forbidden on all restore/drill paths.",
    "PITR --target-pgdata requires TARGET_OWNED_BY_RUN ownership proof; arbitrary paths are BLOCKED.",
    "Logical --database-url requires --target-ownership descriptor + resolved source endpoint.",
    "Missing docker/pgBackRest/credentials exit BLOCKED or FAILURE — never placeholder SUCCEEDED.",
    "",
    "Exit codes: 0 ok, 1 failure, 2 blocked, 3 unavailable",
  ].join("\n");
}

/**
 * @param {string[]} argv
 * @param {{ stdout?: (s: string) => void, stderr?: (s: string) => void, env?: NodeJS.ProcessEnv }} [io]
 * @returns {Promise<number>}
 */
export async function runCli(argv, io = {}) {
  const stdout = io.stdout ?? ((text) => process.stdout.write(text.endsWith("\n") ? text : `${text}\n`));
  const stderr = io.stderr ?? ((text) => process.stderr.write(text.endsWith("\n") ? text : `${text}\n`));
  const env = io.env ?? process.env;
  const { positionals, flags } = parseArgs(argv);
  const json = flags.json === true;
  const command = positionals[0];

  if (!command || command === "help") {
    emit(stdout, json, { ok: true, implemented: [...IMPLEMENTED_COMMANDS].filter((name) => name !== "help") }, usage());
    return CLI_EXIT.OK;
  }

  if (command === "status") {
    return runStatus({ flags, env, json, stdout, stderr });
  }
  if (command === "evidence" && positionals[1] === "validate") {
    return runEvidenceValidate({ flags, env, json, stdout, stderr });
  }
  if (command === "evidence" && positionals[1] === "reconcile-layer2") {
    return runEvidenceReconcileLayer2({ flags, env, json, stdout, stderr });
  }
  if (command === "target" && positionals[1] === "check") {
    return runTargetCheck({ flags, json, stdout, stderr });
  }
  if (command === "backup" && positionals[1] === "layer1") {
    return runBackupLayer1({ flags, env, json, stdout, stderr });
  }
  if (command === "backup" && positionals[1] === "layer2") {
    return runBackupLayer2({ flags, env, json, stdout, stderr });
  }
  if (command === "restore" && positionals[1] === "pitr") {
    return runRestorePitr({ flags, env, json, stdout, stderr });
  }
  if (command === "restore" && positionals[1] === "logical") {
    return runRestoreLogical({ flags, env, json, stdout, stderr });
  }
  if ((command === "drill" || command === "rehearsal") && hasRehearsalFlags(flags)) {
    return runDrill({ flags, env, json, stdout, stderr });
  }
  if (command === "drill" || command === "rehearsal") {
    stderr(redactText(`Usage: recovery ${command} --run-id-to-restore RUN_ID --source ID --identity-file PATH [--local-store DIR]`));
    return CLI_EXIT.FAILURE;
  }
  if ((command === "gate" || command === "readiness-gate") && positionals[1] === "high-risk") {
    return runHighRiskGate({ flags, env, json, stdout, stderr });
  }
  if (command === "capacity") {
    return runCapacity({ flags, json, stdout });
  }
  if (command === "systemd" && positionals[1] === "validate") {
    return runSystemdValidate({ flags, json, stdout, stderr });
  }
  if (command === "pgbackrest" && positionals[1] === "version") {
    return runPgbackrestVersion({ flags, env, json, stdout, stderr });
  }
  if (command === "rotate-keys" && (positionals[1] === "layer1" || positionals[1] === "layer2")) {
    return runRotateKeys({ layer: positionals[1], flags, json, stdout, stderr });
  }
  if (command === "spaces" && positionals[1] === "config-check") {
    return runSpacesConfigCheck({ flags, env, json, stdout, stderr });
  }

  if (
    command === "evidence" ||
    command === "target" ||
    command === "backup" ||
    command === "restore" ||
    command === "gate" ||
    command === "readiness-gate" ||
    command === "systemd" ||
    command === "pgbackrest" ||
    command === "rotate-keys" ||
    command === "spaces"
  ) {
    stderr(redactText(`Incomplete command. ${usage()}`));
    return CLI_EXIT.FAILURE;
  }

  stderr(redactText(`Unknown command: ${command}`));
  stderr(usage());
  return CLI_EXIT.FAILURE;
}

function runStatus({ flags, env, json, stdout }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  const inspected = inspectEvidence(evidenceDir);
  const readiness = evaluateReadiness({
    evidenceRecords: inspected.valid,
    invalidEvidence: inspected.invalid,
    configurationPresent: flags.configuration === true || flags["config-present"] === true,
    credentialsPresent: flags["credentials-present"] === true,
    bucketPresent: flags["bucket-present"] === true,
    timerPresent: flags["timer-present"] === true,
    policy: parsePolicy(flags),
  });
  const payload = {
    operationType: OPERATION_TYPE.STATUS,
    evidenceDir: evidenceDir || null,
    overall: readiness.overall,
    layers: readiness.layers,
    latestAttempt: readiness.latestAttempt,
    findings: readiness.findings,
    malformedCount: readiness.malformedCount,
    unverifiableEvidence: readiness.unverifiableEvidence,
    configurationOnly: readiness.configurationOnly,
    note: readiness.note,
  };
  emit(stdout, json, payload, formatStatus(payload));
  if (readiness.overall === READINESS_LEVEL.NOT_READY) return CLI_EXIT.FAILURE;
  return CLI_EXIT.OK;
}

function runEvidenceValidate({ flags, env, json, stdout, stderr }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  const runId = typeof flags["run-id"] === "string" ? flags["run-id"] : null;
  if (!evidenceDir) {
    stderr(redactText("Evidence directory is required (--evidence-dir or BOBA_RECOVERY_EVIDENCE_DIR)"));
    return CLI_EXIT.FAILURE;
  }
  if (runId) {
    const result = readRunEvidence(evidenceDir, runId);
    return reportValidation(result, json, stdout);
  }
  const inspected = inspectEvidence(evidenceDir);
  if (inspected.valid.length === 0 && inspected.invalid.length === 0) {
    const payload = { valid: false, count: 0, invalidCount: 0, reason: "No valid evidence records found" };
    emit(stdout, json, payload, "Evidence validation: NO valid records (NOT_READY)");
    return CLI_EXIT.FAILURE;
  }
  const results = inspected.valid.map((record) => validateEvidence(record));
  const allOk = results.every((result) => result.ok) && inspected.invalid.length === 0;
  const payload = {
    valid: allOk,
    count: inspected.valid.length,
    invalidCount: inspected.invalid.length + results.filter((result) => !result.ok).length,
    runIds: inspected.valid.map((record) => record.runId),
    unverifiable: inspected.invalid,
  };
  emit(
    stdout,
    json,
    payload,
    allOk
      ? `Evidence validation: ${inspected.valid.length} valid record(s)`
      : `Evidence validation: ${payload.invalidCount} invalid of ${inspected.valid.length + inspected.invalid.length}`,
  );
  return allOk ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runTargetCheck({ flags, json, stdout }) {
  if (flags["force-production"] === true || flags.force === true) {
    return refuseForceProduction(stdout, json, "Target check");
  }
  const result = evaluateTargetIdentitySafety({
    sourceIdentity: stringFlag(flags.source) ?? stringFlag(flags["source-identity"]),
    targetIdentity: stringFlag(flags.target) ?? stringFlag(flags["target-identity"]),
    sourceClassification: stringFlag(flags["source-class"]) ?? stringFlag(flags["source-classification"]),
    targetClassification: stringFlag(flags["target-class"]) ?? stringFlag(flags["target-classification"]),
    targetPgdataPath: stringFlag(flags["target-pgdata"]) ?? stringFlag(flags["target-pgdata-path"]),
  });
  if (!result.allowed) {
    emit(stdout, json, result, `Target check BLOCKED: ${result.reason}`);
    return CLI_EXIT.BLOCKED;
  }
  emit(stdout, json, { allowed: true }, "Target check: isolated recovery target allowed");
  return CLI_EXIT.OK;
}

async function runBackupLayer1({ flags, env, json, stdout, stderr }) {
  const type = stringFlag(flags.type);
  if (type !== "full" && type !== "diff") {
    stderr(redactText("backup layer1 requires --type full|diff"));
    return CLI_EXIT.FAILURE;
  }
  const generation =
    stringFlag(flags.generation) ??
    stringFlag(flags["repository-generation"]) ??
    env.BOBA_PGBACKREST_GENERATION ??
    null;
  if (!generation) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: "repository generation required (--generation or BOBA_PGBACKREST_GENERATION)",
    };
    emit(stdout, json, payload, `Layer 1 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }

  const evidenceDir = resolveEvidenceDir(flags, env);
  const pgbackrestProbe = probePgbackrest(env);
  if (!pgbackrestProbe.ok && !flags["allow-missing-exec"]) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: pgbackrestProbe.reason ?? "pgBackRest executable unavailable",
    };
    emit(stdout, json, payload, `Layer 1 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }

  const result = await runLayer1Backup({
    type,
    evidenceDir: evidenceDir || undefined,
    repositoryGeneration: generation,
    stanza: stringFlag(flags.stanza) ?? env.BOBA_PGBACKREST_STANZA ?? "boba",
    candidate: resolveCandidateProvenance({ env }),
    sourceIdentity: stringFlag(flags.source) ?? env.BOBA_RECOVERY_SOURCE_IDENTITY ?? "unspecified-source",
    sourceClassification: stringFlag(flags["source-class"]) ?? "production",
    env,
    skipLock: flags["skip-lock"] === true || env.BOBA_RECOVERY_LOCK_ALREADY_HELD === "1",
  });

  emit(
    stdout,
    json,
    result,
    result.ok
      ? `Layer 1 ${type} backup SUCCEEDED runId=${result.runId}`
      : `Layer 1 ${type} backup ${result.status}: ${result.reason ?? "failed"}`,
  );
  if (result.status === OPERATION_STATUS.BLOCKED) return CLI_EXIT.BLOCKED;
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

async function runBackupLayer2({ flags, env, json, stdout, stderr }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  const localStore = stringFlag(flags["local-store"]) ?? env.BOBA_RECOVERY_LOCAL_STORE ?? null;
  const recipient =
    stringFlag(flags.recipient) ??
    stringFlag(flags["age-recipient"]) ??
    env.BOBA_RECOVERY_AGE_RECIPIENT ??
    null;
  const hasLogicalSpaces =
    Boolean(env.BOBA_RECOVERY_LOGICAL_SPACES_BUCKET) || Boolean(env.BOBA_RECOVERY_SPACES_BUCKET);

  if (!localStore && !hasLogicalSpaces) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason:
        "Layer 2 requires --local-store DIR or logical Spaces env (BOBA_RECOVERY_LOGICAL_SPACES_BUCKET)",
    };
    emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }
  if (!recipient) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: "age recipient required (--recipient or BOBA_RECOVERY_AGE_RECIPIENT)",
    };
    emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }

  const ageBin = resolveAgeBinary(env);
  const ageProbe = spawnSync(ageBin, ["--version"], { encoding: "utf8", env, timeout: 10_000 });
  if (ageProbe.error || (typeof ageProbe.status === "number" && ageProbe.status !== 0 && !String(ageProbe.stdout ?? "").includes("age"))) {
    // age --version may exit non-zero on some builds; accept stdout that names age.
    if (ageProbe.error || !String(ageProbe.stdout ?? ageProbe.stderr ?? "").toLowerCase().includes("age")) {
      const payload = {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "age binary not found on PATH (install age or set BOBA_RECOVERY_AGE_BIN)",
      };
      emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
      return CLI_EXIT.BLOCKED;
    }
  }

  /** @type {{ putObject: Function, getObject: Function, verifyRemoteSha256: Function } | null} */
  let objectStore = null;
  try {
    if (localStore) {
      objectStore = createLocalObjectStore({ localRoot: localStore });
    } else {
      const spaces = await createLogicalSpacesObjectStore(env, flags, {
        // Production-shaped Spaces path requires live flag + versioning ENABLED.
        requireVersioning: env.BOBA_RECOVERY_REAL_SPACES === "1",
      });
      if (!spaces.ok) {
        const payload = {
          ok: false,
          status: OPERATION_STATUS.BLOCKED,
          reason: spaces.reason,
          code: spaces.code,
        };
        emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
        return CLI_EXIT.BLOCKED;
      }
      objectStore = spaces.objectStore;
    }
  } catch (error) {
    stderr(redactText(error instanceof Error ? error.message : String(error)));
    return CLI_EXIT.FAILURE;
  }
  if (!objectStore) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: "Layer 2 object store could not be configured",
    };
    emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }

  const dumpFn = buildDumpFn(env, flags);
  if (!dumpFn) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason:
        "pg_dump / docker compose postgres unavailable — set BOBA_LOGICAL_BACKUP_DATABASE_URL (not application DATABASE_URL) or ensure compose postgres + boba_bear_logical_backup role are reachable",
    };
    emit(stdout, json, payload, `Layer 2 backup BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }

  const result = await runLogicalBackup({
    objectStore,
    recipients: [recipient],
    evidenceDir: evidenceDir || path.join(process.cwd(), ".recovery-evidence"),
    sourceIdentity: stringFlag(flags.source) ?? env.BOBA_RECOVERY_SOURCE_IDENTITY ?? "unspecified-source",
    sourceClassification: stringFlag(flags["source-class"]) ?? "production",
    candidate: resolveCandidateProvenance({ env }),
    ageBin,
    dumpFn,
    withHeavyOpLock:
      env.BOBA_RECOVERY_LOCK_ALREADY_HELD === "1" || flags["skip-lock"] === true
        ? async (_opts, fn) => ({ ok: true, status: "ACQUIRED", result: await fn() })
        : undefined,
  });

  emit(
    stdout,
    json,
    result,
    result.ok
      ? `Layer 2 logical backup SUCCEEDED runId=${result.runId}`
      : `Layer 2 logical backup ${result.status}: ${result.reason ?? "failed"}`,
  );
  if (result.status === OPERATION_STATUS.BLOCKED) return CLI_EXIT.BLOCKED;
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

async function runRestorePitr({ flags, env, json, stdout }) {
  if (flags["force-production"] === true || flags.force === true) {
    return refuseForceProduction(stdout, json, "PITR restore");
  }
  const source = stringFlag(flags.source) ?? stringFlag(flags["source-identity"]);
  if (!source) {
    emit(stdout, json, { ok: false, reason: "--source is required" }, "PITR restore FAILURE: --source is required");
    return CLI_EXIT.FAILURE;
  }
  const target =
    stringFlag(flags["target-time"]) != null
      ? { type: "time", value: stringFlag(flags["target-time"]) }
      : stringFlag(flags["target-lsn"]) != null
        ? { type: "lsn", value: stringFlag(flags["target-lsn"]) }
        : stringFlag(flags["target-name"]) != null
          ? { type: "name", value: stringFlag(flags["target-name"]) }
          : null;
  if (!target) {
    emit(
      stdout,
      json,
      { ok: false, reason: "PITR requires --target-time, --target-lsn, or --target-name" },
      "PITR restore FAILURE: missing restore target",
    );
    return CLI_EXIT.FAILURE;
  }

  const result = await runPitrRestore({
    target,
    sourceIdentity: source,
    sourceClassification: stringFlag(flags["source-class"]) ?? "production",
    targetPgdataPath: stringFlag(flags["target-pgdata"]) || undefined,
    sourcePgdataPath: stringFlag(flags["source-pgdata"]) || undefined,
    workspaceRoot: stringFlag(flags["workspace-root"]) || env.BOBA_RECOVERY_TARGET_ROOT || undefined,
    // Default: provision a fresh RUN_ID-owned PGDATA. Manual --target-pgdata requires ownership marker.
    provisionTarget: flags["target-pgdata"] ? false : flags["no-provision"] !== true,
    evidenceDir: resolveEvidenceDir(flags, env) || undefined,
    stanza: stringFlag(flags.stanza) ?? env.BOBA_PGBACKREST_STANZA ?? "boba",
    forceProduction: false,
  });
  emit(
    stdout,
    json,
    result,
    result.ok ? `PITR restore SUCCEEDED runId=${result.runId}` : `PITR restore FAILED: ${result.reason}`,
  );
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

async function runRestoreLogical({ flags, env, json, stdout }) {
  if (flags["force-production"] === true || flags.force === true) {
    return refuseForceProduction(stdout, json, "Logical restore");
  }
  const runIdToRestore = stringFlag(flags["run-id"]) ?? stringFlag(flags["run-id-to-restore"]);
  const source = stringFlag(flags.source);
  const identityFile = stringFlag(flags["identity-file"]);
  const localStore = stringFlag(flags["local-store"]) ?? env.BOBA_RECOVERY_LOCAL_STORE ?? null;
  if (!runIdToRestore || !source || !identityFile || !localStore) {
    emit(
      stdout,
      json,
      {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "logical restore requires --run-id, --source, --identity-file, and --local-store",
      },
      "Logical restore BLOCKED: missing required flags",
    );
    return CLI_EXIT.BLOCKED;
  }

  const objectStore = createLocalObjectStore({ localRoot: localStore });
  const databaseUrl = stringFlag(flags["database-url"]) ?? env.BOBA_RECOVERY_TARGET_DATABASE_URL;
  const targetOwnership =
    stringFlag(flags["target-ownership"]) ??
    stringFlag(flags["ownership-descriptor"]) ??
    undefined;
  if (databaseUrl && !targetOwnership) {
    emit(
      stdout,
      json,
      {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason:
          "external --database-url requires --target-ownership descriptor issued by the recovery provisioner",
      },
      "Logical restore BLOCKED: missing target ownership proof",
    );
    return CLI_EXIT.BLOCKED;
  }
  const provisionTarget = flags["no-provision"] === true ? false : !databaseUrl;
  if (!databaseUrl && flags["no-provision"] === true) {
    emit(
      stdout,
      json,
      {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "logical restore requires default fresh-target provisioning or owned --database-url",
      },
      "Logical restore BLOCKED: missing recovery database URL",
    );
    return CLI_EXIT.BLOCKED;
  }
  const result = await runLogicalRestore({
    runIdToRestore,
    objectStore,
    identityFile,
    sourceIdentity: source,
    sourceClassification: stringFlag(flags["source-class"]) ?? "production",
    sourceDatabaseUrl: stringFlag(flags["source-database-url"]) ?? env.BOBA_LOGICAL_BACKUP_DATABASE_URL,
    targetPgdataPath: stringFlag(flags["target-pgdata"]),
    databaseUrl: databaseUrl || undefined,
    targetOwnership,
    provisionTarget,
    evidenceDir: resolveEvidenceDir(flags, env) || undefined,
    forceProduction: false,
  });
  emit(
    stdout,
    json,
    result,
    result.ok ? `Logical restore SUCCEEDED runId=${result.runId}` : `Logical restore FAILED: ${result.reason}`,
  );
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

async function runDrill({ flags, env, json, stdout }) {
  if (flags["force-production"] === true || flags.force === true) {
    return refuseForceProduction(stdout, json, "Portability rehearsal");
  }
  const runIdToRestore = stringFlag(flags["run-id-to-restore"]);
  const source = stringFlag(flags.source);
  const identityFile = stringFlag(flags["identity-file"]);
  const localStore = stringFlag(flags["local-store"]) ?? env.BOBA_RECOVERY_LOCAL_STORE ?? null;
  if (!runIdToRestore || !source || !identityFile || !localStore) {
    emit(
      stdout,
      json,
      {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "rehearsal requires --run-id-to-restore, --source, --identity-file, and --local-store",
      },
      "Portability rehearsal BLOCKED: missing required flags",
    );
    return CLI_EXIT.BLOCKED;
  }

  const objectStore = createLocalObjectStore({ localRoot: localStore });
  const databaseUrl = stringFlag(flags["database-url"]) ?? env.BOBA_RECOVERY_TARGET_DATABASE_URL;
  const result = await runPortabilityRehearsal({
    runIdToRestore,
    objectStore,
    identityFile,
    sourceIdentity: source,
    sourceClassification: stringFlag(flags["source-class"]) ?? "production",
    sourceDatabaseUrl: stringFlag(flags["source-database-url"]) ?? env.BOBA_LOGICAL_BACKUP_DATABASE_URL,
    databaseUrl: databaseUrl || undefined,
    provisionTarget: flags["no-provision"] !== true,
    evidenceDir: resolveEvidenceDir(flags, env) || undefined,
    env,
    networkIsolated: flags["network-isolated"] === true,
    productionDnsAbsent: flags["production-dns-absent"] === true,
    productionCredentialsAbsent: flags["production-credentials-absent"] === true,
    forceProduction: false,
  });
  emit(
    stdout,
    json,
    result,
    result.ok
      ? `Portability rehearsal SUCCEEDED runId=${result.runId}`
      : `Portability rehearsal ${result.status ?? "FAILED"}: ${result.reason ?? "failed"}`,
  );
  if (result.status === OPERATION_STATUS.BLOCKED) return CLI_EXIT.BLOCKED;
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runHighRiskGate({ flags, env, json, stdout, stderr }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  if (!evidenceDir) {
    stderr(redactText("Evidence directory is required for high-risk gate"));
    return CLI_EXIT.FAILURE;
  }
  const inspected = inspectEvidence(evidenceDir);
  const selected = selectLatestAttemptEvidence(inspected.valid, { invalid: inspected.invalid });
  const gate = evaluateHighRiskMigrationGate({
    layer1Evidence: selected.layer1,
    layer2Evidence: selected.layer2,
    drillEvidence: selected.drill,
    validationEvidence: selected.validation,
    policy: {
      requireDrill: flags["require-drill"] !== false && flags["skip-drill"] !== true,
      requireValidation: flags["require-validation"] !== false && flags["skip-validation"] !== true,
    },
  });
  emit(
    stdout,
    json,
    gate,
    gate.result === "READY"
      ? "High-risk migration gate: READY"
      : `High-risk migration gate: BLOCKED (${gate.reasons.join("; ")})`,
  );
  return gate.result === "READY" ? CLI_EXIT.OK : CLI_EXIT.BLOCKED;
}

function runCapacity({ flags, json, stdout }) {
  const report = observeCapacity({
    layer1BaseBytes: numberFlag(flags["layer1-base-bytes"]),
    layer1WalBytes: numberFlag(flags["layer1-wal-bytes"]),
    layer2Bytes: numberFlag(flags["layer2-bytes"]),
    versionHistoryBytes: numberFlag(flags["version-history-bytes"]),
    retentionDays: numberFlag(flags["retention-days"]),
    validated: flags.validated === true,
  });
  emit(
    stdout,
    json,
    report,
    `Capacity observation: total=${report.currentTotalBytes}B projected35d=${report.projected35DayFootprintBytes}B STORAGE_CAPACITY_VALIDATED=${report.STORAGE_CAPACITY_VALIDATED}`,
  );
  return CLI_EXIT.OK;
}

function runSystemdValidate({ flags, json, stdout }) {
  const unitDir =
    stringFlag(flags["unit-dir"]) ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docker/recovery/systemd");
  const result = validateSystemdUnits({ unitDir, tryAnalyze: flags["systemd-analyze"] === true });
  emit(
    stdout,
    json,
    result,
    result.ok
      ? `systemd validate: ${result.filesChecked} unit file(s) OK`
      : `systemd validate FAILED: ${result.reason ?? result.errors?.join("; ")}`,
  );
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runPgbackrestVersion({ flags, env, json, stdout }) {
  const versionText = readPgbackrestVersionText(env, flags);
  if (!versionText) {
    const payload = {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: "pgBackRest version unavailable (docker image or local binary missing)",
    };
    emit(stdout, json, payload, `pgBackRest version BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
  }
  const asserted = assertPgbackrestVersion(versionText);
  emit(
    stdout,
    json,
    { ...asserted, versionText: redactText(versionText) },
    asserted.ok
      ? `pgBackRest version OK: ${versionText.trim()}`
      : `pgBackRest version FAILED: ${asserted.reason}`,
  );
  return asserted.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runRotateKeys({ layer, flags, json, stdout }) {
  if (layer === "layer1") {
    const currentGeneration = Number(stringFlag(flags.generation) ?? stringFlag(flags["current-generation"]) ?? "1");
    const plan = planRepositoryGenerationRotation({
      currentGeneration,
      newPassphrasePresent: flags["new-passphrase-present"] === true || flags["passphrase-present"] === true,
      preservePriorGeneration: flags["preserve-prior"] !== false,
      inPlaceCipherChange: flags["in-place"] === true,
    });
    emit(
      stdout,
      json,
      plan,
      plan.ok
        ? `Layer 1 key rotation PLAN (no secret mutation): nextGeneration=${plan.plan.nextGeneration}`
        : `Layer 1 key rotation plan FAILED: ${plan.reason}`,
    );
    return plan.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
  }

  const recipient = stringFlag(flags.recipient) ?? stringFlag(flags["new-recipient"]);
  const plan = planAgeRecipientRotation({
    newRecipient: recipient ?? "",
    keyVersion: stringFlag(flags["key-version"]) ?? undefined,
    retainedRecipientFingerprints: [],
    oldPrivateIdentitiesRetained: flags["old-identities-retained"] === true || flags["retain-old"] === true,
  });
  emit(
    stdout,
    json,
    plan,
    plan.ok
      ? `Layer 2 key rotation PLAN (no secret mutation): keyVersion=${plan.metadata.keyVersion}`
      : `Layer 2 key rotation plan FAILED: ${plan.reason}`,
  );
  return plan.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runSpacesConfigCheck({ flags, env, json, stdout }) {
  const config = {
    bucket:
      stringFlag(flags.bucket) ??
      env.BOBA_RECOVERY_LOGICAL_SPACES_BUCKET ??
      env.BOBA_RECOVERY_SPACES_BUCKET ??
      "",
    endpoint:
      stringFlag(flags.endpoint) ??
      env.BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT ??
      env.BOBA_RECOVERY_SPACES_ENDPOINT ??
      undefined,
    localRoot: stringFlag(flags["local-root"]) ?? env.BOBA_RECOVERY_LOCAL_STORE ?? undefined,
    credentialEnvPrefix:
      stringFlag(flags["credential-env-prefix"]) ??
      env.BOBA_RECOVERY_LOGICAL_SPACES_CREDENTIAL_PREFIX ??
      env.BOBA_RECOVERY_SPACES_CREDENTIAL_PREFIX ??
      "BOBA_LOGICAL_SPACES",
    versioningEnabled: flags["versioning-enabled"] !== false,
    objectLockWorm: flags.worm === true || flags["object-lock-worm"] === true,
  };
  const result = validateSpacesBucketConfig(config);
  emit(
    stdout,
    json,
    result,
    result.ok ? `Spaces config-check OK bucket=${result.config.bucket}` : `Spaces config-check FAILED: ${result.reason}`,
  );
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

async function runEvidenceReconcileLayer2({ flags, env, json, stdout, stderr }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  const runId = stringFlag(flags["run-id"]);
  if (!evidenceDir || !runId) {
    emit(
      stdout,
      json,
      {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "reconcile-layer2 requires --run-id and --evidence-dir (or BOBA_RECOVERY_EVIDENCE_DIR)",
      },
      "Layer 2 reconcile BLOCKED: missing run-id/evidence-dir",
    );
    return CLI_EXIT.BLOCKED;
  }

  const localStore = stringFlag(flags["local-store"]) ?? env.BOBA_RECOVERY_LOCAL_STORE ?? null;
  let objectStore;
  try {
    if (localStore) {
      objectStore = createLocalObjectStore({ localRoot: localStore });
    } else {
      const spaces = await createLogicalSpacesObjectStore(env, flags, { requireVersioning: false });
      if (!spaces.ok) {
        emit(
          stdout,
          json,
          { ok: false, status: OPERATION_STATUS.BLOCKED, reason: spaces.reason },
          `Layer 2 reconcile BLOCKED: ${spaces.reason}`,
        );
        return CLI_EXIT.BLOCKED;
      }
      objectStore = spaces.objectStore;
    }
  } catch (error) {
    stderr(redactText(error instanceof Error ? error.message : String(error)));
    return CLI_EXIT.FAILURE;
  }

  const result = await reconcileLocalCompleteMarker({ evidenceDir, runId, objectStore });
  emit(
    stdout,
    json,
    result,
    result.ok
      ? `Layer 2 reconcile SUCCEEDED runId=${runId}`
      : `Layer 2 reconcile BLOCKED: ${result.reason}`,
  );
  return result.ok ? CLI_EXIT.OK : CLI_EXIT.BLOCKED;
}

function reportValidation(result, json, stdout) {
  if (!result.ok) {
    emit(stdout, json, { valid: false, reason: result.reason }, `Evidence validation FAILED: ${result.reason}`);
    return CLI_EXIT.FAILURE;
  }
  emit(stdout, json, { valid: true, runId: result.evidence.runId, status: result.evidence.status }, `Evidence validation: valid (${result.evidence.runId})`);
  return CLI_EXIT.OK;
}

function refuseForceProduction(stdout, json, label) {
  const payload = {
    allowed: false,
    code: "FORCE_PRODUCTION_FORBIDDEN",
    reason: "--force-production and equivalent overrides are forbidden",
  };
  emit(stdout, json, payload, `${label} BLOCKED: ${payload.reason}`);
  return CLI_EXIT.BLOCKED;
}

function hasRehearsalFlags(flags) {
  return Boolean(
    stringFlag(flags["run-id-to-restore"]) ||
      stringFlag(flags["identity-file"]) ||
      stringFlag(flags["local-store"]),
  );
}

/**
 * @deprecated Use selectLatestAttemptEvidence — kept as alias for tests that imported the old name.
 * @param {unknown[]} records
 */
function selectGateEvidence(records) {
  return selectLatestAttemptEvidence(records);
}

function probePgbackrest(env) {
  const local = spawnSync("pgbackrest", ["version"], { encoding: "utf8", env, timeout: 15_000 });
  if (local.status === 0) return { ok: true, via: "local" };
  const image = env.BOBA_POSTGRES_IMAGE ?? "boba-bear-postgres:local";
  const docker = spawnSync("docker", ["run", "--rm", image, "pgbackrest", "version"], {
    encoding: "utf8",
    env,
    timeout: 60_000,
  });
  if (docker.status === 0) return { ok: true, via: "docker" };
  return {
    ok: false,
    reason:
      "pgBackRest executable not found locally and docker image probe failed — build boba-bear-postgres:local or install pgbackrest >= 2.55",
  };
}

function readPgbackrestVersionText(env, flags) {
  const forced = stringFlag(flags.version);
  if (forced) return forced;
  const local = spawnSync("pgbackrest", ["version"], { encoding: "utf8", env, timeout: 15_000 });
  if (local.status === 0 && local.stdout) return local.stdout;
  const image = stringFlag(flags.image) ?? env.BOBA_POSTGRES_IMAGE ?? "boba-bear-postgres:local";
  const docker = spawnSync("docker", ["run", "--rm", image, "pgbackrest", "version"], {
    encoding: "utf8",
    env,
    timeout: 120_000,
  });
  if (docker.status === 0 && docker.stdout) return docker.stdout;
  return null;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {Record<string, string|boolean>} flags
 * @returns {null | (() => Promise<Buffer>)}
 */
function buildDumpFn(env, flags) {
  const databaseUrl = stringFlag(flags["database-url"]) ?? env.BOBA_LOGICAL_BACKUP_DATABASE_URL;
  if (databaseUrl) {
    return async () => {
      const result = spawnSync("pg_dump", ["-Fc", databaseUrl], {
        encoding: "buffer",
        maxBuffer: 512 * 1024 * 1024,
        env,
      });
      if (result.status !== 0) {
        throw new Error(redactText(String(result.stderr ?? `pg_dump exited ${result.status}`)));
      }
      return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
    };
  }

  // Never fall back to application runtime DATABASE_URL as backup authority.
  if (env.DATABASE_URL && !env.BOBA_LOGICAL_BACKUP_DATABASE_URL) {
    return null;
  }

  const composeProbe = dockerComposeExecPostgres({
    args: ["pg_isready"],
    env,
  });
  if (!composeProbe.ok) return null;

  const dumpUser =
    env.BOBA_LOGICAL_BACKUP_DB_USER ??
    env.POSTGRES_LOGICAL_BACKUP_USER ??
    "boba_bear_logical_backup";
  const dumpDb = env.POSTGRES_DB ?? "boba_bear_local";

  return async () => {
    const result = dockerComposeExecPostgres({
      args: ["pg_dump", "-Fc", "-U", dumpUser, dumpDb],
      env,
      encoding: "buffer",
    });
    if (!result.ok) {
      throw new Error(result.reason ?? "docker compose pg_dump failed");
    }
    return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
  };
}

function resolveEvidenceDir(flags, env) {
  const fromFlag = stringFlag(flags["evidence-dir"]);
  if (fromFlag) return fromFlag;
  if (typeof env.BOBA_RECOVERY_EVIDENCE_DIR === "string" && env.BOBA_RECOVERY_EVIDENCE_DIR.length > 0) {
    return env.BOBA_RECOVERY_EVIDENCE_DIR;
  }
  return "";
}

function parsePolicy(flags) {
  /** @type {import("./readiness.mjs").ReadinessPolicy} */
  const policy = {};
  const layer1 = Number(flags["layer1-max-age-ms"]);
  const layer2 = Number(flags["layer2-max-age-ms"]);
  if (Number.isFinite(layer1)) policy.layer1MaxAgeMs = layer1;
  if (Number.isFinite(layer2)) policy.layer2MaxAgeMs = layer2;
  return policy;
}

function stringFlag(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberFlag(value) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function emit(stdout, json, payload, human) {
  if (json) stdout(safeJson(payload));
  else stdout(redactText(human));
}

function formatStatus(payload) {
  const layerLines = Object.entries(payload.layers ?? {}).map(([layer, result]) => {
    const latest = result.latestStatus ? ` latest=${result.latestStatus}` : "";
    return `  ${layer}: ${result.readiness} (${result.reason}${latest})`;
  });
  const latest = payload.latestAttempt
    ? `Latest attempt: ${payload.latestAttempt.runId} ${payload.latestAttempt.status}`
    : "Latest attempt: none";
  return [`Recovery readiness: ${payload.overall}`, ...layerLines, latest, payload.note].join("\n");
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runCli(process.argv).then((code) => process.exit(code));
}

export { generateRunId, persistEvidence, createEvidence };
