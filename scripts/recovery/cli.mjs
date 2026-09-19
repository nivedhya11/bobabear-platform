#!/usr/bin/env node
/**
 * IMP-037 recovery operator CLI (foundation).
 * Implemented now: status, evidence validate, target check.
 * Unsupported future operations exit as unavailable — never placeholder success.
 */
import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CLI_EXIT, OPERATION_STATUS, OPERATION_TYPE, READINESS_LEVEL } from "./constants.mjs";
import { generateRunId } from "./run-id.mjs";
import { createEvidence, validateEvidence } from "./evidence.mjs";
import { evaluateTargetIdentitySafety } from "./identity.mjs";
import { evaluateReadiness } from "./readiness.mjs";
import { listEvidence, persistEvidence, readRunEvidence } from "./store.mjs";
import { redactText, safeJson } from "./redact.mjs";

const IMPLEMENTED_COMMANDS = new Set(["status", "evidence", "target", "help"]);
const UNAVAILABLE_COMMANDS = new Set([
  "backup",
  "restore",
  "pitr",
  "pgbackrest",
  "pg_dump",
  "age",
  "spaces",
  "migrate",
  "rehearsal",
  "drill",
  "schedule",
  "systemd",
  "capacity",
  "rotate-keys",
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
    "BOBA Bear IMP-037 recovery tooling (foundation)",
    "",
    "Implemented:",
    "  recovery status [--json] [--evidence-dir DIR]",
    "  recovery evidence validate [--json] [--evidence-dir DIR] [--run-id RUN_ID]",
    "  recovery target check --source ID --target ID --source-class CLASS --target-class CLASS [--target-pgdata PATH] [--json]",
    "",
    "Not yet implemented (explicitly unavailable):",
    "  backup, restore, pitr, pgbackrest, pg_dump, age, spaces, migrate, rehearsal, drill, schedule, systemd, capacity, rotate-keys",
    "",
    "Exit codes: 0 ok, 1 failure, 2 blocked, 3 unavailable",
  ].join("\n");
}

/**
 * @param {string[]} argv
 * @param {{ stdout?: (s: string) => void, stderr?: (s: string) => void, env?: NodeJS.ProcessEnv }} [io]
 * @returns {number}
 */
export function runCli(argv, io = {}) {
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

  if (UNAVAILABLE_COMMANDS.has(command)) {
    return unavailable(stdout, stderr, json, command);
  }

  if (command === "status") {
    return runStatus({ flags, env, json, stdout, stderr });
  }
  if (command === "evidence" && positionals[1] === "validate") {
    return runEvidenceValidate({ flags, env, json, stdout, stderr });
  }
  if (command === "target" && positionals[1] === "check") {
    return runTargetCheck({ flags, json, stdout, stderr });
  }
  if (command === "evidence" || command === "target") {
    stderr(redactText(`Incomplete command. ${usage()}`));
    return CLI_EXIT.FAILURE;
  }

  stderr(redactText(`Unknown command: ${command}`));
  stderr(usage());
  return CLI_EXIT.FAILURE;
}

function runStatus({ flags, env, json, stdout }) {
  const evidenceDir = resolveEvidenceDir(flags, env);
  const records = listEvidence(evidenceDir);
  const readiness = evaluateReadiness({
    evidenceRecords: records,
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
  const records = listEvidence(evidenceDir);
  if (records.length === 0) {
    const payload = { valid: false, count: 0, reason: "No valid evidence records found" };
    emit(stdout, json, payload, "Evidence validation: NO valid records (NOT_READY)");
    return CLI_EXIT.FAILURE;
  }
  const results = records.map((record) => validateEvidence(record));
  const allOk = results.every((result) => result.ok);
  const payload = {
    valid: allOk,
    count: records.length,
    invalidCount: results.filter((result) => !result.ok).length,
    runIds: records.map((record) => record.runId),
  };
  emit(
    stdout,
    json,
    payload,
    allOk
      ? `Evidence validation: ${records.length} valid record(s)`
      : `Evidence validation: ${payload.invalidCount} invalid of ${records.length}`,
  );
  return allOk ? CLI_EXIT.OK : CLI_EXIT.FAILURE;
}

function runTargetCheck({ flags, json, stdout }) {
  if (flags["force-production"] === true || flags.force === true) {
    const payload = {
      allowed: false,
      code: "FORCE_PRODUCTION_FORBIDDEN",
      reason: "--force-production and equivalent overrides are forbidden",
    };
    emit(stdout, json, payload, `Target check BLOCKED: ${payload.reason}`);
    return CLI_EXIT.BLOCKED;
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

function reportValidation(result, json, stdout) {
  if (!result.ok) {
    emit(stdout, json, { valid: false, reason: result.reason }, `Evidence validation FAILED: ${result.reason}`);
    return CLI_EXIT.FAILURE;
  }
  emit(stdout, json, { valid: true, runId: result.evidence.runId, status: result.evidence.status }, `Evidence validation: valid (${result.evidence.runId})`);
  return CLI_EXIT.OK;
}

function unavailable(stdout, stderr, json, command) {
  const payload = {
    ok: false,
    available: false,
    command,
    status: OPERATION_STATUS.BLOCKED,
    reason: `${command} is not implemented in the IMP-037 recovery foundation tranche`,
  };
  emit(stdout, json, payload, `UNAVAILABLE: ${payload.reason}`);
  return CLI_EXIT.UNAVAILABLE;
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
  return [
    `Recovery readiness: ${payload.overall}`,
    ...layerLines,
    latest,
    payload.note,
  ].join("\n");
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const code = runCli(process.argv);
  process.exit(code);
}

export { generateRunId, persistEvidence, createEvidence };
