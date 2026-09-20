/**
 * pgBackRest command wrappers for IMP-037 Layer 1.
 *
 * `archivePush` is intentionally NOT under the heavy-ops flock
 * (CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK).
 */
import { spawnSync } from "node:child_process";
import { PROOF_CODE } from "../constants.mjs";
import { redactText } from "../redact.mjs";
import { assertPgbackrestVersion, DEFAULT_STANZA } from "./config.mjs";

/**
 * @param {object} options
 * @param {string[]} options.args
 * @param {(command: string, args: string[], opts?: object) => { status: number, stdout: string, stderr: string }} [options.execFn]
 * @param {string} [options.pgbackrestBin]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {{ ok: boolean, status: number, stdout: string, stderr: string, reason?: string }}
 */
export function runPgbackrest(options) {
  const args = Array.isArray(options?.args) ? options.args : [];
  const bin = options.pgbackrestBin ?? "pgbackrest";
  const execFn =
    options.execFn ??
    ((command, commandArgs, opts) => {
      const result = spawnSync(command, commandArgs, {
        encoding: "utf8",
        env: opts?.env ?? process.env,
        timeout: opts?.timeout ?? 600_000,
      });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: typeof result.stdout === "string" ? result.stdout : "",
        stderr: typeof result.stderr === "string" ? result.stderr : "",
      };
    });
  try {
    const result = execFn(bin, args, { env: options.env ?? process.env });
    const ok = result.status === 0;
    return {
      ok,
      status: result.status,
      stdout: redactText(result.stdout ?? ""),
      stderr: redactText(result.stderr ?? ""),
      reason: ok ? undefined : redactText(result.stderr || `pgbackrest exited ${result.status}`),
    };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "",
      reason: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * @param {object} [options]
 */
export function backupFull(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "backup", "--type=full"] });
}

/**
 * @param {object} [options]
 */
export function backupDiff(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "backup", "--type=diff"] });
}

/**
 * @param {object} [options]
 */
export function info(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "info"] });
}

/**
 * @param {object} [options]
 */
export function check(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "check"] });
}

/**
 * @param {object} [options]
 */
export function verify(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "verify"] });
}

/**
 * @param {object} [options]
 */
export function expire(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "expire"] });
}

/**
 * Continuous WAL archive-push. MUST NOT be wrapped in heavy-ops flock.
 * @param {object} [options]
 */
export function archivePush(options = {}) {
  // NOTE: archivePush is NOT under heavy flock — continuous WAL must stay available.
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "archive-push", ...(options.walFile ? [options.walFile] : [])] });
}

/**
 * @param {object} input
 * @param {string} input.infoOutput
 * @param {boolean} input.verifyOk
 * @param {string} input.recoveryPoint
 * @param {string|number} input.repositoryGeneration
 * @param {string} [input.keyVersion]
 * @returns {{ ok: boolean, validationResults: Array<Record<string, unknown>>, reason?: string }}
 */
export function buildLayer1HealthProof(input) {
  /** @type {Array<Record<string, unknown>>} */
  const validationResults = [];
  const infoOutput = String(input?.infoOutput ?? "");
  if (!infoOutput.trim()) {
    return { ok: false, validationResults, reason: "pgBackRest info output is empty" };
  }
  validationResults.push({ code: PROOF_CODE.PGBACKREST_INFO_OK, detail: "info output present" });

  if (input.verifyOk === true) {
    validationResults.push({ code: PROOF_CODE.PGBACKREST_VERIFY_OK });
  }

  const recoveryPoint = typeof input.recoveryPoint === "string" ? input.recoveryPoint.trim() : "";
  if (!recoveryPoint) {
    return { ok: false, validationResults, reason: "recovery point is required for Layer 1 health proof" };
  }
  validationResults.push({
    code: PROOF_CODE.LAYER1_RECOVERY_POINT,
    recoveryPoint,
  });

  const generation = input.repositoryGeneration;
  if (generation == null || String(generation).trim().length === 0) {
    return { ok: false, validationResults, reason: "repositoryGeneration is required" };
  }
  validationResults.push({
    code: PROOF_CODE.REPOSITORY_GENERATION,
    repositoryGeneration: String(generation),
    keyVersion: input.keyVersion ?? `repo-gen-${generation}`,
  });

  return { ok: true, validationResults };
}

/**
 * @param {Array<Record<string, unknown>> | unknown} validationResults
 * @returns {boolean}
 */
export function isLayer1QualifyingProofCodes(validationResults) {
  const results = Array.isArray(validationResults) ? validationResults : [];
  const codes = new Set(
    results
      .map((entry) => (entry && typeof entry === "object" ? String(entry.code ?? "") : ""))
      .filter(Boolean),
  );
  const hasHealth = codes.has(PROOF_CODE.PGBACKREST_INFO_OK) || codes.has(PROOF_CODE.LAYER1_HEALTH_OK);
  const hasRecovery = codes.has(PROOF_CODE.LAYER1_RECOVERY_POINT);
  const hasGeneration = codes.has(PROOF_CODE.REPOSITORY_GENERATION);
  return hasHealth && hasRecovery && hasGeneration;
}

/**
 * @param {string} versionStr
 */
export function requirePgbackrestVersion(versionStr) {
  return assertPgbackrestVersion(versionStr);
}
