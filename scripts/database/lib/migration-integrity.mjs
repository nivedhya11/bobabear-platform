// Pure, dependency-free helpers for the migration-integrity manifest
// (`drizzle/migration-integrity.json`, IMP-005). The manifest pins a SHA-256
// hash for every sealed migration SQL file so that a historical migration
// can never be silently edited, reordered, or removed. No PostgreSQL
// connection is required or made here.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const MANIFEST_VERSION = 1;
export const MANIFEST_ALGORITHM = "sha256";
export const SEAL_CONFIRMATION_TOKEN = "SEAL_NEW_BOBA_BEAR_MIGRATIONS";

/**
 * @param {string} drizzleDir
 * @returns {{ok: true, manifest: any} | {ok: false, reason: string}}
 */
export function readManifest(drizzleDir) {
  const manifestPath = path.join(drizzleDir, "migration-integrity.json");
  let raw;
  try {
    raw = readFileSync(manifestPath, "utf8");
  } catch {
    return { ok: false, reason: "drizzle/migration-integrity.json does not exist" };
  }
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "drizzle/migration-integrity.json is not valid JSON" };
  }
  return { ok: true, manifest };
}

/**
 * @param {string} sqlPath absolute path to a migration SQL file
 * @returns {string} lowercase hex SHA-256 digest of the exact file bytes
 */
export function hashMigrationFile(sqlPath) {
  const buffer = readFileSync(sqlPath);
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compare the sealed manifest against the journal + on-disk SQL files.
 * Returns findings for: removed sealed entries, hash mismatches on sealed
 * entries, and new SQL files present in the journal but not yet sealed
 * (reported separately as `unsealed`, since that is not itself a failure —
 * `db:migrations:check` surfaces it as a required-sealing notice, not an
 * integrity violation).
 *
 * @param {{journal: any, manifest: any, drizzleDir: string}} input
 * @returns {{findings: string[], unsealed: string[]}}
 */
export function diffManifestAgainstJournal({ journal, manifest, drizzleDir }) {
  const findings = [];
  const unsealed = [];

  if (manifest.version !== MANIFEST_VERSION) {
    findings.push(`manifest version ${manifest.version} does not match expected ${MANIFEST_VERSION}`);
  }
  if (manifest.algorithm !== MANIFEST_ALGORITHM) {
    findings.push(`manifest algorithm "${manifest.algorithm}" does not match expected "${MANIFEST_ALGORITHM}"`);
  }
  if (!Array.isArray(manifest.migrations)) {
    findings.push("manifest.migrations is not an array");
    return { findings, unsealed };
  }

  const journalTags = (Array.isArray(journal?.entries) ? journal.entries : [])
    .map((entry) => entry?.tag)
    .filter((tag) => typeof tag === "string");
  const journalOrderIndex = new Map(journalTags.map((tag, index) => [tag, index]));

  const sealedTags = new Set();
  let previousJournalOrder = -1;
  for (const sealed of manifest.migrations) {
    const tag = sealed?.tag;
    if (typeof tag !== "string") {
      findings.push("manifest contains an entry with no tag");
      continue;
    }
    if (sealedTags.has(tag)) {
      findings.push(`manifest contains a duplicate sealed tag: "${tag}"`);
    }
    sealedTags.add(tag);

    if (!journalOrderIndex.has(tag)) {
      findings.push(`sealed migration "${tag}" is no longer present in the journal (historical removal)`);
      continue;
    }
    const order = journalOrderIndex.get(tag);
    if (order <= previousJournalOrder) {
      findings.push(`manifest order does not follow journal order at sealed tag "${tag}"`);
    }
    previousJournalOrder = order;

    const sqlPath = path.join(drizzleDir, `${tag}.sql`);
    let actualHash;
    try {
      actualHash = hashMigrationFile(sqlPath);
    } catch {
      findings.push(`sealed migration "${tag}" is missing its SQL file (drizzle/${tag}.sql)`);
      continue;
    }
    if (sealed.sha256 !== actualHash) {
      findings.push(`sealed migration "${tag}" hash mismatch — historical SQL was modified`);
    }
  }

  for (const tag of journalTags) {
    if (!sealedTags.has(tag)) unsealed.push(tag);
  }

  return { findings, unsealed };
}

/**
 * Compute the manifest that sealing `unsealedTags` (in journal order) onto
 * `manifest` would produce. Pure — does not write anything. Refuses to
 * replace an existing hash, remove a historical entry, reorder historical
 * entries, or seal a tag absent from the journal.
 *
 * @param {{journal: any, manifest: any, drizzleDir: string, tagsToSeal: string[]}} input
 * @returns {{ok: true, manifest: any} | {ok: false, reason: string}}
 */
export function buildSealedManifest({ journal, manifest, drizzleDir, tagsToSeal }) {
  const journalTags = new Set(
    (Array.isArray(journal?.entries) ? journal.entries : [])
      .map((entry) => entry?.tag)
      .filter((tag) => typeof tag === "string"),
  );
  const existingTags = new Set(manifest.migrations.map((entry) => entry.tag));

  for (const tag of tagsToSeal) {
    if (existingTags.has(tag)) {
      return { ok: false, reason: `refusing to reseal already-sealed migration "${tag}"` };
    }
    if (!journalTags.has(tag)) {
      return { ok: false, reason: `refusing to seal "${tag}": absent from the journal` };
    }
  }

  const journalOrder = [...journalTags];
  const appended = tagsToSeal
    .map((tag) => ({
      tag,
      path: `drizzle/${tag}.sql`,
      sha256: hashMigrationFile(path.join(drizzleDir, `${tag}.sql`)),
    }))
    .sort((a, b) => journalOrder.indexOf(a.tag) - journalOrder.indexOf(b.tag));

  const nextManifest = {
    version: MANIFEST_VERSION,
    algorithm: MANIFEST_ALGORITHM,
    migrations: [...manifest.migrations, ...appended].sort(
      (a, b) => journalOrder.indexOf(a.tag) - journalOrder.indexOf(b.tag),
    ),
  };

  return { ok: true, manifest: nextManifest };
}
