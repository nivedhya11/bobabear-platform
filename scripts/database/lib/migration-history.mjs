// Pure, dependency-free static validation of the committed Drizzle migration
// history (IMP-005). Never connects to PostgreSQL — every check operates on
// `drizzle/meta/_journal.json`, the committed migration SQL files, and the
// committed snapshot files only, so it is safe to run in `npm run check`
// without Docker or database credentials.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CONFLICT_MARKER_PATTERN = /^(<{7}|={7}|>{7})/m;
const CREDENTIAL_PATTERN = /postgresql:\/\/[^\s"'`]*:[^\s"'`]*@/;
const DRIZZLE_KIT_PUSH_PATTERN = /drizzle-kit\s+push/;
// IMP-011 owns brands/organizations/territories/legal_entities/outlets and
// access_* tables. IMP-020 owns carts / cart_lines / cart_line_* selection
// tables. IMP-022 owns payments / payment_* tables. IMP-023 owns app.orders.
// Still forbid premature customer/product business tables outside owning slices.
const BUSINESS_TABLE_NAME_PATTERN =
  /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?[a-z_]+"?\.)?"?(users?|customers?|tenants?|products?|menu_items?)"?\b/i;

/**
 * @param {string} drizzleDir absolute path to the repository's `drizzle/` directory
 * @returns {{ok: true, journal: any} | {ok: false, reason: string}}
 */
export function readJournal(drizzleDir) {
  const journalPath = path.join(drizzleDir, "meta", "_journal.json");
  let raw;
  try {
    raw = readFileSync(journalPath, "utf8");
  } catch {
    return { ok: false, reason: `${relPath(drizzleDir, journalPath)} does not exist` };
  }
  let journal;
  try {
    journal = JSON.parse(raw);
  } catch {
    return { ok: false, reason: `${relPath(drizzleDir, journalPath)} is not valid JSON` };
  }
  return { ok: true, journal };
}

function relPath(drizzleDir, absPath) {
  return path.relative(path.dirname(drizzleDir), absPath).split(path.sep).join("/");
}

/**
 * Validate the shape and internal consistency of a parsed journal object.
 * Pure — takes the already-parsed journal, returns a list of findings.
 * @param {any} journal
 * @returns {string[]}
 */
export function validateJournalShape(journal) {
  const findings = [];
  if (journal === null || typeof journal !== "object" || Array.isArray(journal)) {
    return ["journal is not an object"];
  }
  if (!Array.isArray(journal.entries)) {
    return ["journal.entries is not an array"];
  }

  const entries = journal.entries;
  const seenIdx = new Set();
  const seenTags = new Set();
  let previousIdx = -1;
  let previousWhen = -1;

  entries.forEach((entry, position) => {
    if (entry === null || typeof entry !== "object") {
      findings.push(`journal entry at position ${position} is not an object`);
      return;
    }
    const { idx, tag, when } = entry;

    if (typeof idx !== "number" || !Number.isInteger(idx)) {
      findings.push(`journal entry at position ${position} has a non-integer idx`);
    } else {
      if (seenIdx.has(idx)) findings.push(`journal has a duplicate idx: ${idx}`);
      seenIdx.add(idx);
      if (idx <= previousIdx) {
        findings.push(
          `journal idx is not monotonically increasing at position ${position} (idx=${idx}, previous=${previousIdx})`,
        );
      }
      previousIdx = idx;
    }

    if (typeof tag !== "string" || tag.length === 0) {
      findings.push(`journal entry at position ${position} has an invalid tag`);
    } else {
      if (seenTags.has(tag)) findings.push(`journal has a duplicate tag: "${tag}"`);
      seenTags.add(tag);
    }

    if (typeof when !== "number" || !Number.isFinite(when)) {
      findings.push(`journal entry at position ${position} has a non-numeric "when" timestamp`);
    } else {
      if (when <= previousWhen) {
        findings.push(
          `journal "when" timestamp is not monotonically increasing at position ${position} (when=${when}, previous=${previousWhen})`,
        );
      }
      previousWhen = when;
    }
  });

  return findings;
}

/**
 * Cross-check the journal against the committed migration SQL files: every
 * journal entry must have a corresponding SQL file and vice versa, no SQL
 * file may be empty, contain unresolved conflict markers, a real-looking
 * credential, `drizzle-kit push`, or a business-domain table.
 * @param {string} drizzleDir
 * @param {any} journal
 * @returns {string[]}
 */
export function validateMigrationFiles(drizzleDir, journal) {
  const findings = [];
  const entries = Array.isArray(journal?.entries) ? journal.entries : [];
  const journalTags = new Set(entries.map((entry) => entry?.tag).filter((tag) => typeof tag === "string"));

  let sqlFiles;
  try {
    sqlFiles = readdirSync(drizzleDir).filter((name) => name.endsWith(".sql"));
  } catch {
    findings.push(`${drizzleDir} does not exist`);
    return findings;
  }

  const sqlTags = new Set();
  for (const fileName of sqlFiles) {
    const tag = fileName.slice(0, -".sql".length);
    if (sqlTags.has(tag)) {
      findings.push(`duplicate migration filename for tag "${tag}"`);
    }
    sqlTags.add(tag);

    const contents = readFileSync(path.join(drizzleDir, fileName), "utf8");
    if (contents.trim().length === 0) {
      findings.push(`drizzle/${fileName} is empty`);
    }
    if (CONFLICT_MARKER_PATTERN.test(contents)) {
      findings.push(`drizzle/${fileName} contains an unresolved conflict marker`);
    }
    if (CREDENTIAL_PATTERN.test(contents)) {
      findings.push(`drizzle/${fileName} appears to contain a real credential`);
    }
    if (DRIZZLE_KIT_PUSH_PATTERN.test(contents)) {
      findings.push(`drizzle/${fileName} references "drizzle-kit push", which is prohibited`);
    }
    if (BUSINESS_TABLE_NAME_PATTERN.test(contents)) {
      findings.push(`drizzle/${fileName} appears to create a business-domain table`);
    }
  }

  for (const tag of journalTags) {
    if (!sqlTags.has(tag)) {
      findings.push(`journal entry "${tag}" has no corresponding drizzle/${tag}.sql file`);
    }
  }
  for (const tag of sqlTags) {
    if (!journalTags.has(tag)) {
      findings.push(`drizzle/${tag}.sql is not represented in the journal`);
    }
  }

  return findings;
}

/**
 * Validate that every journal entry has a corresponding snapshot file and
 * that snapshot ancestry (`prevId` -> previous snapshot's `id`) is
 * internally consistent, in journal order.
 * @param {string} drizzleDir
 * @param {any} journal
 * @returns {string[]}
 */
export function validateSnapshotAncestry(drizzleDir, journal) {
  const findings = [];
  const entries = Array.isArray(journal?.entries) ? journal.entries : [];
  const sorted = [...entries]
    .filter((entry) => typeof entry?.idx === "number")
    .sort((a, b) => a.idx - b.idx);

  let previousId = "00000000-0000-0000-0000-000000000000";
  for (const entry of sorted) {
    const snapshotName = `${String(entry.idx).padStart(4, "0")}_snapshot.json`;
    const snapshotPath = path.join(drizzleDir, "meta", snapshotName);
    let snapshot;
    try {
      snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    } catch {
      findings.push(`missing or invalid snapshot meta/${snapshotName} for journal entry "${entry.tag}"`);
      continue;
    }
    if (typeof snapshot.id !== "string" || snapshot.id.length === 0) {
      findings.push(`meta/${snapshotName} is missing an "id"`);
    }
    if (snapshot.prevId !== previousId) {
      findings.push(
        `meta/${snapshotName} has prevId "${snapshot.prevId}", expected "${previousId}" (snapshot ancestry break)`,
      );
    }
    if (typeof snapshot.id === "string") previousId = snapshot.id;
  }

  return findings;
}

/**
 * Run every static migration-history check and return the combined findings.
 * Pure I/O-only orchestration — no PostgreSQL connection.
 * @param {{drizzleDir: string}} input
 * @returns {{ok: boolean, findings: string[]}}
 */
export function checkMigrationHistory({ drizzleDir }) {
  const journalResult = readJournal(drizzleDir);
  if (!journalResult.ok) {
    return { ok: false, findings: [journalResult.reason] };
  }
  const { journal } = journalResult;

  const findings = [
    ...validateJournalShape(journal),
    ...validateMigrationFiles(drizzleDir, journal),
    ...validateSnapshotAncestry(drizzleDir, journal),
  ];

  return { ok: findings.length === 0, findings };
}
