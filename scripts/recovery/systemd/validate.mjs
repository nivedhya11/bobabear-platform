/**
 * Validate IMP-037 recovery systemd unit/timer templates.
 * Prefers `systemd-analyze verify` when available; otherwise parses required keys.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { redactText } from "../redact.mjs";

export const DEFAULT_UNIT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docker/recovery/systemd",
);

const SERVICE_REQUIRED = Object.freeze(["Unit", "Service", "Install"]);
const TIMER_REQUIRED = Object.freeze(["Unit", "Timer", "Install"]);
const SERVICE_KEYS = Object.freeze(["Type", "ExecStart"]);
const TIMER_KEYS = Object.freeze(["OnCalendar"]);

/**
 * @param {object} [options]
 * @param {string} [options.unitDir]
 * @param {boolean} [options.tryAnalyze]
 * @param {string[]} [options.files]
 * @returns {{ ok: boolean, filesChecked: number, errors: string[], analyzeUsed: boolean, reason?: string, files?: object[] }}
 */
export function validateSystemdUnits(options = {}) {
  const unitDir = options.unitDir ?? DEFAULT_UNIT_DIR;
  if (!existsSync(unitDir) || !statSync(unitDir).isDirectory()) {
    return {
      ok: false,
      filesChecked: 0,
      errors: [`unit directory missing: ${unitDir}`],
      analyzeUsed: false,
      reason: `unit directory missing: ${unitDir}`,
    };
  }

  const names =
    Array.isArray(options.files) && options.files.length > 0
      ? options.files
      : readdirSync(unitDir).filter((name) => name.endsWith(".service") || name.endsWith(".timer"));

  if (names.length === 0) {
    return {
      ok: false,
      filesChecked: 0,
      errors: ["no .service/.timer files found"],
      analyzeUsed: false,
      reason: "no .service/.timer files found",
    };
  }

  /** @type {string[]} */
  const errors = [];
  /** @type {object[]} */
  const files = [];

  for (const name of names) {
    const fullPath = path.join(unitDir, name);
    const text = readFileSync(fullPath, "utf8");
    const parsed = parseUnitFile(text);
    const isTimer = name.endsWith(".timer");
    const sectionErrors = validateSections(parsed, isTimer ? TIMER_REQUIRED : SERVICE_REQUIRED);
    const keyErrors = isTimer
      ? validateKeys(parsed, "Timer", TIMER_KEYS)
      : validateKeys(parsed, "Service", SERVICE_KEYS);
    const fileErrors = [...sectionErrors, ...keyErrors];
    if (!isTimer) {
      const type = parsed.Service?.Type;
      if (type && type !== "oneshot") {
        fileErrors.push(`${name}: Service.Type should be oneshot (got ${type})`);
      }
      if (!parsed.Service?.ExecStart) {
        fileErrors.push(`${name}: Service.ExecStart is required`);
      }
    } else if (!parsed.Timer?.OnCalendar) {
      fileErrors.push(`${name}: Timer.OnCalendar is required`);
    }
    files.push({ name, ok: fileErrors.length === 0, errors: fileErrors });
    errors.push(...fileErrors);
  }

  let analyzeUsed = false;
  if (options.tryAnalyze !== false && errors.length === 0) {
    const analyze = trySystemdAnalyze(
      names.map((name) => path.join(unitDir, name)),
    );
    if (analyze.attempted) {
      analyzeUsed = true;
      if (!analyze.ok) {
        errors.push(analyze.reason ?? "systemd-analyze verify failed");
      }
    }
  }

  return {
    ok: errors.length === 0,
    filesChecked: names.length,
    errors,
    analyzeUsed,
    files,
    reason: errors.length === 0 ? undefined : redactText(errors.join("; ")),
  };
}

/**
 * @param {string} text
 * @returns {Record<string, Record<string, string>>}
 */
export function parseUnitFile(text) {
  /** @type {Record<string, Record<string, string>>} */
  const sections = {};
  let current = null;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1];
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (!current) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    sections[current][key] = value;
  }
  return sections;
}

/**
 * @param {Record<string, Record<string, string>>} parsed
 * @param {readonly string[]} required
 * @returns {string[]}
 */
function validateSections(parsed, required) {
  /** @type {string[]} */
  const errors = [];
  for (const section of required) {
    if (!parsed[section]) errors.push(`missing [${section}] section`);
  }
  return errors;
}

/**
 * @param {Record<string, Record<string, string>>} parsed
 * @param {string} section
 * @param {readonly string[]} keys
 * @returns {string[]}
 */
function validateKeys(parsed, section, keys) {
  /** @type {string[]} */
  const errors = [];
  const body = parsed[section] ?? {};
  for (const key of keys) {
    if (!body[key] || String(body[key]).trim().length === 0) {
      errors.push(`missing ${section}.${key}`);
    }
  }
  return errors;
}

/**
 * @param {string[]} paths
 */
function trySystemdAnalyze(paths) {
  const probe = spawnSync("systemd-analyze", ["--version"], { encoding: "utf8", timeout: 5_000 });
  if (probe.error || probe.status !== 0) {
    return { attempted: false, ok: true };
  }
  const result = spawnSync("systemd-analyze", ["verify", ...paths], {
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status === 0) {
    return { attempted: true, ok: true };
  }
  return {
    attempted: true,
    ok: false,
    reason: redactText(result.stderr || result.stdout || `systemd-analyze verify exited ${result.status}`),
  };
}
