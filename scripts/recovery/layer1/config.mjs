/**
 * pgBackRest configuration generation for IMP-037 Layer 1.
 *
 * Locked:
 * - stanza default `boba`
 * - archive_timeout = 5 minutes (300s) — design bound
 * - repo cipher AES-256-CBC
 * - retention >= 35 days via repo1-retention-full=5 (weeks) + repo1-retention-diff=35
 * - schedule: weekly full + daily differential + continuous WAL (documented)
 * - PGBACKREST_VERSION_MIN = 2.55.0; stock Ubuntu 2.50 FORBIDDEN
 * - repository generation path pattern `repo-gen-{N}` for cipher rotation
 */
export const PGBACKREST_VERSION_MIN = "2.55.0";
export const PGBACKREST_FORBIDDEN_STOCK_UBUNTU = "2.50";
export const DEFAULT_STANZA = "boba";
export const ARCHIVE_TIMEOUT_SECONDS = 300;
export const REPO_CIPHER = "aes-256-cbc";

/**
 * Schedule documentation (host systemd timers invoke one-shot Compose ops):
 * - weekly full backup
 * - daily differential backup
 * - continuous WAL archive (NOT under heavy flock)
 */
export const LAYER1_SCHEDULE_DOC = Object.freeze({
  full: "weekly",
  differential: "daily",
  wal: "continuous",
  note: "Continuous WAL archival must not be gated by the heavy-ops flock",
});

/**
 * @param {object} options
 * @param {number|string} options.generation
 * @param {string} [options.stanza]
 * @param {string} [options.repoPath]
 * @param {string} [options.cipherPassEnvVar]
 * @param {string} [options.pgData]
 * @param {string} [options.pgHost]
 * @param {number} [options.retentionFullWeeks]
 * @param {number} [options.retentionDiffDays]
 * @param {string} [options.repoType]
 * @param {string} [options.repoS3Bucket]
 * @param {string} [options.repoS3Endpoint]
 * @param {string} [options.repoS3Region]
 * @returns {string}
 */
export function renderPgbackrestConf(options) {
  if (options == null || (options.generation !== 0 && !options.generation)) {
    throw new Error("generation is required for pgBackRest repository path");
  }
  const generation = Number(options.generation);
  if (!Number.isInteger(generation) || generation < 1) {
    throw new Error("generation must be a positive integer");
  }
  const stanza = options.stanza ?? DEFAULT_STANZA;
  const repoPath = options.repoPath ?? `repo-gen-${generation}`;
  if (!/^repo-gen-\d+$/.test(pathBasename(repoPath)) && !repoPath.includes(`repo-gen-${generation}`)) {
    // Allow absolute/remote paths that still embed the generation segment.
    if (!String(repoPath).includes(`repo-gen-${generation}`)) {
      throw new Error(`repoPath must follow repo-gen-{N} pattern; got ${repoPath}`);
    }
  }
  const cipherPassEnvVar = options.cipherPassEnvVar ?? "PGBACKREST_CIPHER_PASS";
  const retentionFullWeeks =
    typeof options.retentionFullWeeks === "number" ? options.retentionFullWeeks : 5;
  const retentionDiffDays =
    typeof options.retentionDiffDays === "number" ? options.retentionDiffDays : 35;
  if (retentionFullWeeks * 7 < 35 && retentionDiffDays < 35) {
    throw new Error("pgBackRest retention must enforce >= 35 days");
  }

  const lines = [
    `# IMP-037 pgBackRest configuration (generation ${generation})`,
    `# Schedule: ${LAYER1_SCHEDULE_DOC.full} full + ${LAYER1_SCHEDULE_DOC.differential} differential + ${LAYER1_SCHEDULE_DOC.wal} WAL`,
    `# archive_timeout design bound: ${ARCHIVE_TIMEOUT_SECONDS}s (set in postgresql.conf)`,
    ``,
    `[global]`,
    `repo1-type=${options.repoType ?? "posix"}`,
    `repo1-path=${repoPath}`,
    `repo1-cipher-type=${REPO_CIPHER}`,
    `repo1-cipher-pass=\${${cipherPassEnvVar}}`,
    `repo1-retention-full=${retentionFullWeeks}`,
    `repo1-retention-diff=${retentionDiffDays}`,
    `start-fast=y`,
    `compress-type=zst`,
  ];

  if (options.repoType === "s3") {
    lines.push(`repo1-s3-bucket=${options.repoS3Bucket ?? ""}`);
    lines.push(`repo1-s3-endpoint=${options.repoS3Endpoint ?? ""}`);
    lines.push(`repo1-s3-region=${options.repoS3Region ?? "us-east-1"}`);
  }

  lines.push(``);
  lines.push(`[${stanza}]`);
  lines.push(`pg1-path=${options.pgData ?? "/var/lib/postgresql/data"}`);
  if (options.pgHost) {
    lines.push(`pg1-host=${options.pgHost}`);
  }
  lines.push(``);
  return lines.join("\n");
}

/**
 * @param {string} versionStr
 * @returns {{ major: number, minor: number, patch: number, raw: string } | null}
 */
export function parseVersion(versionStr) {
  if (typeof versionStr !== "string" || versionStr.trim().length === 0) return null;
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(versionStr.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
    raw: versionStr.trim(),
  };
}

/**
 * @param {string} versionStr
 * @returns {{ ok: true, version: object } | { ok: false, reason: string }}
 */
export function assertPgbackrestVersion(versionStr) {
  const parsed = parseVersion(versionStr);
  if (!parsed) {
    return { ok: false, reason: "unable to parse pgBackRest version" };
  }
  if (parsed.major === 2 && parsed.minor === 50) {
    return {
      ok: false,
      reason: `stock Ubuntu pgBackRest ${PGBACKREST_FORBIDDEN_STOCK_UBUNTU} is FORBIDDEN; require >= ${PGBACKREST_VERSION_MIN}`,
    };
  }
  const minimum = parseVersion(PGBACKREST_VERSION_MIN);
  if (!minimum) {
    return { ok: false, reason: "internal minimum version is invalid" };
  }
  if (compareVersions(parsed, minimum) < 0) {
    return {
      ok: false,
      reason: `pgBackRest ${parsed.raw} is below required minimum ${PGBACKREST_VERSION_MIN}`,
    };
  }
  return { ok: true, version: parsed };
}

/**
 * @param {{ major: number, minor: number, patch: number }} a
 * @param {{ major: number, minor: number, patch: number }} b
 * @returns {number}
 */
function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * @param {string} repoPath
 * @returns {string}
 */
function pathBasename(repoPath) {
  const normalized = String(repoPath).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? normalized;
}
