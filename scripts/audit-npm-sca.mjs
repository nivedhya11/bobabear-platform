#!/usr/bin/env node
/**
 * IMP-038 §15 SCA gate — npm audit with deterministic exception filtering.
 *
 * Policy: fail on high and critical unless covered by an ACTIVE row in
 * docs/platform/security/vulnerability-exception-register.md.
 *
 * Usage:
 *   node scripts/audit-npm-sca.mjs
 *   npm run audit:npm-sca
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const REGISTER_REL = "docs/platform/security/vulnerability-exception-register.md";
const POLICY_LEVELS = new Set(["high", "critical"]);

export const REQUIRED_HEADERS = Object.freeze([
  "id",
  "package/cve",
  "severity",
  "owner",
  "rationale",
  "authority",
  "compensating_controls",
  "retest_date",
  "expiry",
]);

/**
 * @param {string} iso
 * @returns {boolean}
 */
export function isIsoDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

/**
 * @param {string} todayIso UTC YYYY-MM-DD
 * @param {string} expiryIso
 */
export function isActiveExpiry(todayIso, expiryIso) {
  if (!isIsoDate(todayIso) || !isIsoDate(expiryIso)) return false;
  return expiryIso >= todayIso;
}

/**
 * Parse Active exceptions table from the register markdown.
 * @param {string} markdown
 * @returns {{ rows: Array<Record<string, string>>, errors: string[] }}
 */
export function parseExceptionRegister(markdown) {
  const errors = [];
  const sectionMatch = markdown.match(/^## Active exceptions\s*$/m);
  if (!sectionMatch || sectionMatch.index === undefined) {
    return { rows: [], errors: ["MISSING_ACTIVE_EXCEPTIONS_SECTION"] };
  }
  const after = markdown.slice(sectionMatch.index + sectionMatch[0].length);
  const lines = after
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const tableLines = [];
  for (const line of lines) {
    if (!line.startsWith("|")) break;
    tableLines.push(line);
  }
  if (tableLines.length < 2) {
    return { rows: [], errors: ["MISSING_EXCEPTION_TABLE"] };
  }

  const headerCells = splitRow(tableLines[0]);
  const sep = tableLines[1];
  if (!/^\|[\s:-]+\|/.test(sep)) {
    errors.push("INVALID_TABLE_SEPARATOR");
  }
  if (headerCells.length !== REQUIRED_HEADERS.length) {
    errors.push(
      `HEADER_COUNT_MISMATCH expected=${REQUIRED_HEADERS.length} got=${headerCells.length}`,
    );
  }
  for (let i = 0; i < REQUIRED_HEADERS.length; i += 1) {
    const got = (headerCells[i] || "").toLowerCase();
    if (got !== REQUIRED_HEADERS[i]) {
      errors.push(`HEADER_MISMATCH col=${i} expected=${REQUIRED_HEADERS[i]} got=${got || "<missing>"}`);
    }
  }

  /** @type {Array<Record<string, string>>} */
  const rows = [];
  for (let i = 2; i < tableLines.length; i += 1) {
    const cells = splitRow(tableLines[i]);
    if (cells.every((c) => c === "")) continue;
    if (cells.length !== REQUIRED_HEADERS.length) {
      errors.push(`ROW_COL_COUNT id=${cells[0] || "?"} expected=${REQUIRED_HEADERS.length} got=${cells.length}`);
      continue;
    }
    /** @type {Record<string, string>} */
    const row = {};
    for (let c = 0; c < REQUIRED_HEADERS.length; c += 1) {
      row[REQUIRED_HEADERS[c]] = cells[c];
    }
    for (const key of REQUIRED_HEADERS) {
      if (!row[key]) errors.push(`EMPTY_FIELD id=${row.id || "?"} field=${key}`);
    }
    if (row.expiry && !isIsoDate(row.expiry)) {
      errors.push(`INVALID_EXPIRY id=${row.id || "?"} value=${row.expiry}`);
    }
    if (row.retest_date && !isIsoDate(row.retest_date)) {
      errors.push(`INVALID_RETEST_DATE id=${row.id || "?"} value=${row.retest_date}`);
    }
    rows.push(row);
  }

  return { rows, errors };
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitRow(line) {
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/**
 * Tokens from package/cve cell (comma/space separated).
 * @param {string} cell
 * @returns {string[]}
 */
export function tokenizePackageCve(cell) {
  return cell
    .split(/[,;\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Collect match keys from an npm audit vulnerability entry.
 * @param {string} packageName
 * @param {{ via?: unknown[], severity?: string }} entry
 * @returns {Set<string>}
 */
export function collectFindingKeys(packageName, entry) {
  const keys = new Set([packageName.toLowerCase()]);
  for (const via of entry.via || []) {
    if (typeof via === "string") {
      keys.add(via.toLowerCase());
      continue;
    }
    if (via && typeof via === "object") {
      const obj = /** @type {Record<string, unknown>} */ (via);
      for (const field of ["source", "url", "cve", "title", "name"]) {
        const val = obj[field];
        if (typeof val === "string" && val) {
          keys.add(val.toLowerCase());
          const ghsa = val.match(/GHSA-[a-z0-9-]+/i);
          if (ghsa) keys.add(ghsa[0].toLowerCase());
          const cve = val.match(/CVE-\d{4}-\d+/i);
          if (cve) keys.add(cve[0].toLowerCase());
        }
      }
      if (typeof obj.source === "number") {
        keys.add(String(obj.source));
      }
    }
  }
  return keys;
}

/**
 * @param {Array<Record<string, string>>} rows
 * @param {string} todayIso
 */
export function activeExceptions(rows, todayIso) {
  return rows.filter((row) => isActiveExpiry(todayIso, row.expiry));
}

/**
 * @param {Set<string>} findingKeys
 * @param {Array<Record<string, string>>} activeRows
 */
export function findCoveringException(findingKeys, activeRows) {
  for (const row of activeRows) {
    const tokens = tokenizePackageCve(row["package/cve"]);
    if (tokens.some((t) => findingKeys.has(t))) {
      return row;
    }
  }
  return null;
}

/**
 * @param {Record<string, { severity?: string, via?: unknown[], range?: string }>} vulnerabilities
 * @param {Array<Record<string, string>>} activeRows
 */
export function filterUncoveredPolicyFindings(vulnerabilities, activeRows) {
  /** @type {Array<{ packageName: string, severity: string, range?: string, keys: string[] }>} */
  const uncovered = [];
  for (const [packageName, entry] of Object.entries(vulnerabilities || {})) {
    const severity = String(entry.severity || "").toLowerCase();
    if (!POLICY_LEVELS.has(severity)) continue;
    const keys = collectFindingKeys(packageName, entry);
    const cover = findCoveringException(keys, activeRows);
    if (!cover) {
      uncovered.push({
        packageName,
        severity,
        range: entry.range,
        keys: [...keys].sort(),
      });
    }
  }
  uncovered.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.packageName < b.packageName ? -1 : a.packageName > b.packageName ? 1 : 0;
  });
  return uncovered;
}

/**
 * @param {string} [cwd]
 */
export function runNpmAuditJson(cwd = projectRoot) {
  const result = spawnSync("npm", ["audit", "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
  });
  const stdout = result.stdout || "";
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return {
      ok: false,
      error: `NPM_AUDIT_JSON_PARSE_FAILED exit=${result.status} stderr=${(result.stderr || "").slice(0, 500)}`,
      report: null,
    };
  }
  return { ok: true, error: null, report, status: result.status };
}

export function utcTodayIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function main() {
  const registerPath = path.join(projectRoot, REGISTER_REL);
  let markdown;
  try {
    markdown = readFileSync(registerPath, "utf8");
  } catch {
    console.error(`FAIL: missing exception register at ${REGISTER_REL}`);
    process.exit(1);
  }

  const { rows, errors } = parseExceptionRegister(markdown);
  if (errors.length > 0) {
    console.error("FAIL: exception register parse errors:");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const today = utcTodayIso();
  const active = activeExceptions(rows, today);
  for (const row of rows) {
    if (!isActiveExpiry(today, row.expiry)) {
      console.log(`INFO: expired/inactive exception ${row.id} expiry=${row.expiry}`);
    }
  }

  const audit = runNpmAuditJson();
  if (!audit.ok || !audit.report) {
    console.error(`FAIL: ${audit.error}`);
    process.exit(1);
  }

  if (audit.report.error) {
    console.error(`FAIL: npm audit error: ${JSON.stringify(audit.report.error)}`);
    process.exit(1);
  }

  const uncovered = filterUncoveredPolicyFindings(audit.report.vulnerabilities || {}, active);
  const meta = audit.report.metadata?.vulnerabilities || {};
  console.log(
    `SCA policy=high+ today=${today} exceptions_active=${active.length} audit_high=${meta.high ?? "?"} audit_critical=${meta.critical ?? "?"}`,
  );

  if (uncovered.length > 0) {
    console.error(`FAIL: ${uncovered.length} uncovered high/critical finding(s):`);
    for (const finding of uncovered) {
      console.error(
        `  - ${finding.severity.toUpperCase()} ${finding.packageName} range=${finding.range || "?"} keys=${finding.keys.slice(0, 8).join(",")}`,
      );
    }
    console.error(
      `Add a Founder-authorized row to ${REGISTER_REL} or upgrade the dependency. Fail closed.`,
    );
    process.exit(1);
  }

  console.log("PASS: npm SCA gate (high/critical covered or absent)");
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
