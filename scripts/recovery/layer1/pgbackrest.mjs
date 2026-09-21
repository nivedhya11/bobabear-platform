/**
 * pgBackRest command wrappers for IMP-037 Layer 1.
 *
 * `archivePush` is intentionally NOT under the heavy-ops flock
 * (CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK).
 *
 * Layer 1 health proof requires real:
 *   pgbackrest check
 *   pgbackrest info --output=json
 *   derived recovery/backup/WAL point (never wrapper clock)
 *   repository generation / key metadata
 *   pgbackrest verify
 */
import { PROOF_CODE } from "../constants.mjs";
import { dockerComposeExecPostgres } from "../docker-exec.mjs";
import { redactText } from "../redact.mjs";
import { assertPgbackrestVersion, DEFAULT_STANZA, PGBACKREST_RUNTIME_CONFIG_PATH } from "./config.mjs";

/**
 * @param {object} options
 * @param {string[]} options.args
 * @param {(command: string, args: string[], opts?: object) => { status: number, stdout: string, stderr: string }} [options.execFn]
 * Injected pgBackRest executor for unit tests. The default operator path does NOT use this
 * and never spawns a host `pgbackrest` binary.
 * @param {string} [options.pgbackrestBin]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.containerCli]
 * @param {string} [options.service]
 * @param {string} [options.composeFile]
 * @param {string} [options.cwd]
 * @param {Function} [options.composeExecFn]
 * @returns {{ ok: boolean, status: number, stdout: string, stderr: string, via: string, reason?: string }}
 */
export function runPgbackrest(options) {
  const args = withRuntimeConfig(Array.isArray(options?.args) ? options.args : []);
  const via = typeof options?.execFn === "function" ? "injected" : "compose-exec";
  const execFn = typeof options?.execFn === "function" ? options.execFn : defaultComposePgbackrestExec(options);
  const bin = options?.pgbackrestBin ?? "pgbackrest";
  try {
    const result = execFn(bin, args, { env: options?.env ?? process.env });
    const ok = result.status === 0;
    return {
      ok,
      status: result.status,
      stdout: redactText(result.stdout ?? ""),
      stderr: redactText(result.stderr ?? ""),
      via,
      reason: ok ? undefined : redactText(result.stderr || `pgbackrest exited ${result.status}`),
    };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "",
      via,
      reason: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Scheduled backup/check/info/verify and archive-push share one config path.
 * `pgbackrest version` does not require the file.
 * @param {string[]} args
 * @returns {string[]}
 */
export function withRuntimeConfig(args) {
  const list = Array.isArray(args) ? [...args] : [];
  if (list.length === 1 && list[0] === "version") return list;
  if (list.some((arg) => arg === "--config" || String(arg).startsWith("--config="))) return list;
  return ["--config", PGBACKREST_RUNTIME_CONFIG_PATH, ...list];
}

/**
 * `docker compose exec -T postgres pgbackrest ...`
 * Host `pgbackrest` is never invoked.
 * @param {object} [options]
 */
export function defaultComposePgbackrestExec(options = {}) {
  return (command, commandArgs) => {
    if (command !== "pgbackrest") {
      return {
        status: 1,
        stdout: "",
        stderr: `Layer 1 refuses host command ${command}; pgBackRest must run via docker compose exec -T postgres`,
      };
    }
    const result = dockerComposeExecPostgres({
      args: ["pgbackrest", ...(Array.isArray(commandArgs) ? commandArgs : [])],
      env: options.env,
      service: options.service ?? "postgres",
      composeFile: options.composeFile,
      cwd: options.cwd,
      containerCli: options.containerCli,
      execFn: options.composeExecFn,
    });
    return {
      status: result.status,
      stdout: typeof result.stdout === "string" ? result.stdout : "",
      stderr: typeof result.stderr === "string" ? result.stderr : "",
    };
  };
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
 * Structured JSON info (required for Layer 1 recovery-point derivation).
 * @param {object} [options]
 */
export function info(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "info", "--output=json"] });
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
 * Fresh-repository stanza bootstrap. Operator/live-provider path only —
 * never auto-run against real Spaces from CI.
 * @param {object} [options]
 */
export function stanzaCreate(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({ ...options, args: ["--stanza", stanza, "stanza-create"] });
}

/**
 * Initialize a new repository generation: stanza-create then check.
 * Fail closed if either step fails. Uses the same compose postgres backend,
 * runtime config path, stanza, and repository secret authority as backup.
 *
 * @param {object} [options]
 * @param {number|string} [options.repositoryGeneration]
 * @param {string} [options.stanza]
 * @returns {{
 *   ok: boolean,
 *   status: "SUCCEEDED"|"FAILED"|"BLOCKED",
 *   via: string,
 *   stanza: string,
 *   repositoryGeneration?: string,
 *   configPath: string,
 *   steps: Array<Record<string, unknown>>,
 *   reason?: string,
 * }}
 */
export function initializeRepositoryStanza(options = {}) {
  const stanza = options.stanza ?? DEFAULT_STANZA;
  const generationRaw = options.repositoryGeneration ?? options.generation;
  const generation =
    generationRaw == null || String(generationRaw).trim() === ""
      ? undefined
      : String(generationRaw).trim();
  if (!generation || !/^[1-9][0-9]*$/.test(generation)) {
    return {
      ok: false,
      status: "BLOCKED",
      via: typeof options?.execFn === "function" ? "injected" : "compose-exec",
      stanza,
      configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
      steps: [],
      reason: "repository generation required for stanza initialization (--generation N)",
    };
  }

  /** @type {Array<Record<string, unknown>>} */
  const steps = [];
  const created = stanzaCreate({ ...options, stanza });
  steps.push({
    step: "stanza-create",
    ok: created.ok,
    via: created.via,
    configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
    stanza,
  });
  if (!created.ok) {
    return {
      ok: false,
      status: "FAILED",
      via: created.via,
      stanza,
      repositoryGeneration: generation,
      configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
      steps,
      reason: created.reason ?? "pgBackRest stanza-create failed",
    };
  }

  const checked = check({ ...options, stanza });
  steps.push({
    step: "check",
    ok: checked.ok,
    via: checked.via,
    configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
    stanza,
  });
  if (!checked.ok) {
    return {
      ok: false,
      status: "FAILED",
      via: checked.via,
      stanza,
      repositoryGeneration: generation,
      configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
      steps,
      reason: checked.reason ?? "pgBackRest check failed after stanza-create",
    };
  }

  return {
    ok: true,
    status: "SUCCEEDED",
    via: checked.via,
    stanza,
    repositoryGeneration: generation,
    configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
    steps,
  };
}

/**
 * Continuous WAL archive-push. MUST NOT be wrapped in heavy-ops flock.
 * @param {object} [options]
 */
export function archivePush(options = {}) {
  // NOTE: archivePush is NOT under heavy flock — continuous WAL must stay available.
  const stanza = options.stanza ?? DEFAULT_STANZA;
  return runPgbackrest({
    ...options,
    args: ["--stanza", stanza, "archive-push", ...(options.walFile ? [options.walFile] : [])],
  });
}

/**
 * Parse pgBackRest `info --output=json` and derive a recovery/backup/WAL point.
 * Fail closed when a genuine point cannot be derived — never substitute wall-clock time.
 *
 * @param {string} infoOutput
 * @returns {{ ok: true, recoveryPoint: string, source: string, stanza?: string } | { ok: false, reason: string }}
 */
export function parsePgbackrestInfoJson(infoOutput) {
  if (typeof infoOutput !== "string" || !infoOutput.trim()) {
    return { ok: false, reason: "pgBackRest info JSON output is empty" };
  }
  let parsed;
  try {
    parsed = JSON.parse(infoOutput);
  } catch {
    return { ok: false, reason: "pgBackRest info output is not valid JSON" };
  }
  const stanzas = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : null;
  if (!stanzas || stanzas.length === 0) {
    return { ok: false, reason: "pgBackRest info JSON has no stanza entries" };
  }

  /** @type {{ instant: number, value: string, source: string, stanza?: string }[]} */
  const candidates = [];

  for (const stanza of stanzas) {
    if (!stanza || typeof stanza !== "object") continue;
    const stanzaName = typeof stanza.name === "string" ? stanza.name : undefined;
    const status = stanza.status;
    if (status && typeof status === "object") {
      pushTimeCandidate(candidates, status.backup, "status.backup", stanzaName);
      pushTimeCandidate(candidates, status.archive, "status.archive", stanzaName);
      pushLsnCandidate(candidates, status.archive?.max, "status.archive.max", stanzaName);
      pushLsnCandidate(candidates, status.archive?.min, "status.archive.min", stanzaName);
    }
    const backups = Array.isArray(stanza.backup) ? stanza.backup : [];
    for (const backup of backups) {
      if (!backup || typeof backup !== "object") continue;
      const timestamp = backup.timestamp;
      if (timestamp && typeof timestamp === "object") {
        pushUnixCandidate(candidates, timestamp.stop, "backup.timestamp.stop", stanzaName);
        pushUnixCandidate(candidates, timestamp.start, "backup.timestamp.start", stanzaName);
      }
      pushLsnCandidate(candidates, backup.lsn?.stop, "backup.lsn.stop", stanzaName);
      pushLsnCandidate(candidates, backup.archive?.stop, "backup.archive.stop", stanzaName);
      if (typeof backup.label === "string" && backup.label.trim()) {
        candidates.push({
          instant: 0,
          value: backup.label.trim(),
          source: "backup.label",
          stanza: stanzaName,
        });
      }
    }
    const archive = stanza.archive;
    if (Array.isArray(archive)) {
      for (const entry of archive) {
        pushLsnCandidate(candidates, entry?.max, "archive.max", stanzaName);
        pushTimeCandidate(candidates, entry?.timestamp, "archive.timestamp", stanzaName);
      }
    } else if (archive && typeof archive === "object") {
      pushLsnCandidate(candidates, archive.max, "archive.max", stanzaName);
      pushTimeCandidate(candidates, archive.timestamp, "archive.timestamp", stanzaName);
    }
  }

  const timed = candidates.filter((entry) => entry.instant > 0).sort((a, b) => a.instant - b.instant);
  if (timed.length > 0) {
    const best = timed.at(-1);
    return {
      ok: true,
      recoveryPoint: best.value,
      source: best.source,
      stanza: best.stanza,
    };
  }

  const labeled = candidates.find((entry) => entry.value && entry.source === "backup.label");
  if (labeled) {
    return {
      ok: true,
      recoveryPoint: labeled.value,
      source: labeled.source,
      stanza: labeled.stanza,
    };
  }

  const anyLsn = candidates.find((entry) => entry.source.includes("lsn") || entry.source.includes("archive"));
  if (anyLsn) {
    return {
      ok: true,
      recoveryPoint: anyLsn.value,
      source: anyLsn.source,
      stanza: anyLsn.stanza,
    };
  }

  return {
    ok: false,
    reason: "unable to derive a genuine recovery/backup/WAL point from pgBackRest info JSON",
  };
}

/**
 * @param {object} input
 * @param {boolean} [input.checkOk]
 * @param {string} [input.infoOutput]
 * @param {boolean} [input.verifyOk]
 * @param {string} [input.recoveryPoint]
 * @param {string|number} input.repositoryGeneration
 * @param {string} [input.keyVersion]
 * @returns {{ ok: boolean, validationResults: Array<Record<string, unknown>>, reason?: string }}
 */
export function buildLayer1HealthProof(input) {
  /** @type {Array<Record<string, unknown>>} */
  const validationResults = [];

  if (input?.checkOk !== true) {
    return {
      ok: false,
      validationResults,
      reason: "pgBackRest check must succeed for Layer 1 health proof",
    };
  }
  validationResults.push({ code: PROOF_CODE.PGBACKREST_CHECK_OK });

  const infoOutput = String(input?.infoOutput ?? "");
  if (!infoOutput.trim()) {
    return { ok: false, validationResults, reason: "pgBackRest info output is empty" };
  }
  validationResults.push({ code: PROOF_CODE.PGBACKREST_INFO_OK, detail: "info --output=json present" });

  if (input.verifyOk !== true) {
    return {
      ok: false,
      validationResults,
      reason: "pgBackRest verify must succeed for Layer 1 health proof",
    };
  }
  validationResults.push({ code: PROOF_CODE.PGBACKREST_VERIFY_OK });

  const recoveryPoint = typeof input.recoveryPoint === "string" ? input.recoveryPoint.trim() : "";
  if (!recoveryPoint) {
    return {
      ok: false,
      validationResults,
      reason: "genuine recovery point derived from pgBackRest info is required (wrapper/start time forbidden)",
    };
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
 * Qualifying Layer 1 proof codes: check + info + recovery point + generation + verify.
 * Absence of ANY required code means NOT_READY.
 *
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
  return (
    codes.has(PROOF_CODE.PGBACKREST_CHECK_OK) &&
    codes.has(PROOF_CODE.PGBACKREST_INFO_OK) &&
    codes.has(PROOF_CODE.LAYER1_RECOVERY_POINT) &&
    codes.has(PROOF_CODE.REPOSITORY_GENERATION) &&
    codes.has(PROOF_CODE.PGBACKREST_VERIFY_OK)
  );
}

/**
 * @param {string} versionStr
 */
export function requirePgbackrestVersion(versionStr) {
  return assertPgbackrestVersion(versionStr);
}

/**
 * @param {{ instant: number, value: string, source: string, stanza?: string }[]} candidates
 * @param {unknown} value
 * @param {string} source
 * @param {string} [stanza]
 */
function pushTimeCandidate(candidates, value, source, stanza) {
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) {
      candidates.push({ instant: ms, value: value.trim(), source, stanza });
      return;
    }
  }
  pushUnixCandidate(candidates, value, source, stanza);
}

/**
 * @param {{ instant: number, value: string, source: string, stanza?: string }[]} candidates
 * @param {unknown} value
 * @param {string} source
 * @param {string} [stanza]
 */
function pushUnixCandidate(candidates, value, source, stanza) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    // pgBackRest JSON timestamps are typically epoch seconds.
    const ms = value > 1e12 ? value : value * 1000;
    candidates.push({ instant: ms, value: new Date(ms).toISOString(), source, stanza });
  }
}

/**
 * @param {{ instant: number, value: string, source: string, stanza?: string }[]} candidates
 * @param {unknown} value
 * @param {string} source
 * @param {string} [stanza]
 */
function pushLsnCandidate(candidates, value, source, stanza) {
  if (typeof value === "string" && /^[0-9A-Fa-f]+\/[0-9A-Fa-f]+$/.test(value.trim())) {
    candidates.push({ instant: 0, value: value.trim(), source, stanza });
  }
}
