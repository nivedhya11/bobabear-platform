/**
 * pgBackRest configuration generation for IMP-037 Layer 1.
 *
 * Locked:
 * - stanza default `boba`
 * - archive_timeout = 5 minutes (300s) — design bound
 * - repo cipher AES-256-CBC
 * - retention >= 35 days via pgBackRest time-based full retention
 *   (repo1-retention-full-type=time, repo1-retention-full>=35)
 * - schedule: weekly full + daily differential + continuous WAL (documented)
 * - PGBACKREST_VERSION_MIN = 2.55.0; stock Ubuntu 2.50 FORBIDDEN
 * - repository generation path pattern `repo-gen-{N}` for cipher rotation
 *
 * pgBackRest semantics (do not mislabel):
 * - repo-retention-full-type defaults to COUNT (number of full backups)
 * - repo-retention-diff is a NUMBER OF DIFFERENTIAL BACKUPS, not days
 * - time-based retention requires repo1-retention-full-type=time with days
 * - repo-retention-archive-type is a backup type (full|diff|incr), NOT time;
 *   omit archive retention options when using time-based full retention
 */
export const PGBACKREST_VERSION_MIN = "2.55.0";
export const PGBACKREST_FORBIDDEN_STOCK_UBUNTU = "2.50";
export const DEFAULT_STANZA = "boba";
export const ARCHIVE_TIMEOUT_SECONDS = 300;
export const REPO_CIPHER = "aes-256-cbc";
/** Locked Layer 1 recovery-window floor (calendar days). */
export const LAYER1_RETENTION_DAYS_MIN = 35;
/** Concrete runtime file inside the PostgreSQL container. Not the image template. */
export const PGBACKREST_RUNTIME_CONFIG_PATH = "/etc/pgbackrest/pgbackrest.conf";

/**
 * Physical Spaces credentials are distinct from Layer 2 logical Spaces credentials.
 * Values are read from the environment at render time and are never written into
 * the repository or into pgbackrest.conf.
 */
export const PHYSICAL_SPACES_ENV = Object.freeze({
  bucket: "BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET",
  endpoint: "BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT",
  region: "BOBA_RECOVERY_PHYSICAL_SPACES_REGION",
  accessKeyId: "BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID",
  secretAccessKey: "BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY",
  cipherPass: "PGBACKREST_CIPHER_PASS",
  generation: "BOBA_PGBACKREST_GENERATION",
  repoMode: "BOBA_PGBACKREST_REPO_MODE",
});

/**
 * Compose postgres service must map host recovery secrets onto pgBackRest-native
 * variable names so BOTH archive-push (PID1 children) and
 * `docker compose exec -T postgres pgbackrest ...` inherit the same repository
 * authority. Values must never be written into pgbackrest.conf.
 *
 * Host (source) → container (pgBackRest-native):
 *   PGBACKREST_CIPHER_PASS                 → PGBACKREST_REPO1_CIPHER_PASS
 *   BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID     → PGBACKREST_REPO1_S3_KEY
 *   BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY → PGBACKREST_REPO1_S3_KEY_SECRET
 */
export const PGBACKREST_REPO_SECRET_ENV = Object.freeze({
  cipherPass: "PGBACKREST_REPO1_CIPHER_PASS",
  s3Key: "PGBACKREST_REPO1_S3_KEY",
  s3KeySecret: "PGBACKREST_REPO1_S3_KEY_SECRET",
});

/**
 * Compose environment bindings that keep archive-push and scheduled compose-exec
 * on the same secret authority without embedding secrets in conf or CLI argv.
 * @returns {ReadonlyArray<{ container: string, host: string, requiredFor: "cipher"|"s3" }>}
 */
export function layer1ComposePgbackrestSecretBindings() {
  return Object.freeze([
    {
      container: PGBACKREST_REPO_SECRET_ENV.cipherPass,
      host: PHYSICAL_SPACES_ENV.cipherPass,
      requiredFor: "cipher",
    },
    {
      container: PGBACKREST_REPO_SECRET_ENV.s3Key,
      host: PHYSICAL_SPACES_ENV.accessKeyId,
      requiredFor: "s3",
    },
    {
      container: PGBACKREST_REPO_SECRET_ENV.s3KeySecret,
      host: PHYSICAL_SPACES_ENV.secretAccessKey,
      requiredFor: "s3",
    },
  ]);
}

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
 * @param {number} [options.retentionFullDays]
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
  const retentionFullDays =
    typeof options.retentionFullDays === "number" ? options.retentionFullDays : LAYER1_RETENTION_DAYS_MIN;
  if (!Number.isInteger(retentionFullDays) || retentionFullDays < LAYER1_RETENTION_DAYS_MIN) {
    throw new Error(
      `pgBackRest time retention must enforce >= ${LAYER1_RETENTION_DAYS_MIN} days (repo1-retention-full-type=time)`,
    );
  }

  const lines = [
    `# IMP-037 pgBackRest configuration (generation ${generation})`,
    `# Schedule: ${LAYER1_SCHEDULE_DOC.full} full + ${LAYER1_SCHEDULE_DOC.differential} differential + ${LAYER1_SCHEDULE_DOC.wal} WAL`,
    `# archive_timeout design bound: ${ARCHIVE_TIMEOUT_SECONDS}s (set in postgresql.conf)`,
    `# Retention: time-based full >= ${LAYER1_RETENTION_DAYS_MIN} days (NOT count; NOT differential-count-as-days)`,
    `# repo1-retention-diff omitted so count-based differential expiry cannot shorten the recovery window`,
    `# repo1-retention-archive-type/archive omitted: archive-type is full|diff|incr, not time;`,
    `#   pgBackRest expires WAL earlier than the oldest retained full after full time retention`,
    `# Cipher passphrase and Spaces keys are supplied via environment, not this file.`,
    ``,
    `[global]`,
    `repo1-type=${options.repoType ?? "posix"}`,
    `repo1-path=${repoPath}`,
    `repo1-cipher-type=${REPO_CIPHER}`,
  ];
  if (options.includeCipherPassLine !== false) {
    lines.push(`repo1-cipher-pass=\${${cipherPassEnvVar}}`);
  }
  lines.push(`repo1-retention-full-type=time`);
  lines.push(`repo1-retention-full=${retentionFullDays}`);
  lines.push(`start-fast=y`);
  lines.push(`compress-type=zst`);

  if (options.repoType === "s3") {
    lines.push(`repo1-s3-bucket=${options.repoS3Bucket ?? ""}`);
    lines.push(`repo1-s3-endpoint=${options.repoS3Endpoint ?? ""}`);
    lines.push(`repo1-s3-region=${options.repoS3Region ?? "us-east-1"}`);
    lines.push(`repo1-s3-uri-style=${options.repoS3UriStyle ?? "path"}`);
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

/**
 * Archive-push and scheduled backup must name this same container config file.
 * @param {string} [stanza]
 * @returns {string}
 */
export function layer1ArchiveCommand(stanza = DEFAULT_STANZA) {
  return `pgbackrest --config=${PGBACKREST_RUNTIME_CONFIG_PATH} --stanza=${stanza} archive-push %p`;
}

/**
 * Non-comment configuration lines, for comparing shell and node renderers.
 * @param {string} conf
 * @returns {string}
 */
export function significantPgbackrestLines(conf) {
  return String(conf)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .join("\n");
}

/**
 * Production-shaped Layer 1 config.
 * Default mode is physical Spaces (s3). POSIX is only an explicit disposable/local-test mode
 * (`BOBA_PGBACKREST_REPO_MODE=posix`). Secrets are required to exist but are not embedded.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true, conf: string, configPath: string, archiveCommand: string, stanza: string, repoMode: "s3"|"posix", repoPath: string } | { ok: false, reason: string }}
 */
export function renderAuthoritativePgbackrestConf(env = {}) {
  const modeRaw = String(env.BOBA_PGBACKREST_REPO_MODE ?? "s3").trim().toLowerCase();
  const repoMode = modeRaw === "posix" || modeRaw === "local" ? "posix" : modeRaw === "s3" || modeRaw === "" ? "s3" : null;
  if (!repoMode) {
    return { ok: false, reason: `unsupported BOBA_PGBACKREST_REPO_MODE=${modeRaw}` };
  }

  const generationText = String(env.BOBA_PGBACKREST_GENERATION ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(generationText)) {
    return { ok: false, reason: "BOBA_PGBACKREST_GENERATION must be a positive integer" };
  }
  const cipherPass = String(env.PGBACKREST_CIPHER_PASS ?? "");
  if (!cipherPass.trim()) {
    return {
      ok: false,
      reason: "PGBACKREST_CIPHER_PASS is required to render pgBackRest config and is not written into the file",
    };
  }

  const stanza = String(env.BOBA_PGBACKREST_STANZA ?? DEFAULT_STANZA).trim() || DEFAULT_STANZA;
  const pgData = String(env.PGDATA ?? env.BOBA_PGBACKREST_PGDATA ?? "/var/lib/postgresql/data").trim();
  const generation = Number(generationText);

  /** @type {string} */
  let repoPath;
  /** @type {Record<string, string>} */
  const s3 = {};

  if (repoMode === "posix") {
    repoPath = `/var/lib/pgbackrest/repo-gen-${generation}`;
  } else {
    const bucket = String(env.BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET ?? "").trim();
    const endpoint = stripEndpointScheme(String(env.BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT ?? "").trim());
    const region = String(env.BOBA_RECOVERY_PHYSICAL_SPACES_REGION ?? "").trim();
    const accessKeyId = String(env.BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID ?? "").trim();
    const secretAccessKey = String(env.BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY ?? "").trim();
    if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) {
      return {
        ok: false,
        reason:
          "production-shaped Layer 1 requires physical Spaces bucket, endpoint, region, and distinct BOBA_PHYSICAL_SPACES credentials",
      };
    }
    const logicalKey = String(env.BOBA_LOGICAL_SPACES_ACCESS_KEY_ID ?? env.BOBA_LOGICAL_SPACES_KEY ?? "").trim();
    const logicalSecret = String(
      env.BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY ?? env.BOBA_LOGICAL_SPACES_SECRET ?? "",
    ).trim();
    const logicalBucket = String(
      env.BOBA_RECOVERY_LOGICAL_SPACES_BUCKET ?? env.BOBA_RECOVERY_SPACES_BUCKET ?? "",
    ).trim();
    if (
      (logicalKey && logicalKey === accessKeyId) ||
      (logicalSecret && logicalSecret === secretAccessKey) ||
      (logicalBucket && logicalBucket === bucket)
    ) {
      return {
        ok: false,
        reason: "Layer 1 physical Spaces credentials/bucket must be distinct from Layer 2 logical Spaces",
      };
    }
    repoPath = `/repo-gen-${generation}`;
    s3.repoS3Bucket = bucket;
    s3.repoS3Endpoint = endpoint;
    s3.repoS3Region = region;
  }

  let conf;
  try {
    conf = renderPgbackrestConf({
      generation,
      stanza,
      repoType: repoMode === "s3" ? "s3" : "posix",
      repoPath,
      pgData,
      includeCipherPassLine: false,
      ...s3,
    });
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }

  if (conf.includes(cipherPass)) {
    return { ok: false, reason: "refusing to render cipher passphrase into pgbackrest.conf" };
  }
  if (repoMode === "s3") {
    const accessKeyId = String(env.BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID ?? "");
    const secretAccessKey = String(env.BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY ?? "");
    if ((accessKeyId && conf.includes(accessKeyId)) || (secretAccessKey && conf.includes(secretAccessKey))) {
      return { ok: false, reason: "refusing to render physical Spaces credentials into pgbackrest.conf" };
    }
  }

  return {
    ok: true,
    conf,
    configPath: PGBACKREST_RUNTIME_CONFIG_PATH,
    archiveCommand: layer1ArchiveCommand(stanza),
    stanza,
    repoMode,
    repoPath,
  };
}

/**
 * @param {string} endpoint
 * @returns {string}
 */
function stripEndpointScheme(endpoint) {
  return endpoint.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}
