/**
 * DigitalOcean Spaces / S3-compatible bucket config validation (IMP-037 §9).
 *
 * SPACES_VERSIONING is ENABLED but is NOT immutability and NOT WORM.
 * Conditional-create mutex fields are FORBIDDEN (host-local flock is the lock).
 */
import {
  SPACES_OBJECT_LOCK_WORM_REQUIRED,
  SPACES_VERSIONING,
  SPACES_VERSIONING_IS_IMMUTABILITY,
} from "../constants.mjs";

export { SPACES_VERSIONING, SPACES_VERSIONING_IS_IMMUTABILITY, SPACES_OBJECT_LOCK_WORM_REQUIRED };

const FORBIDDEN_MUTEX_FIELDS = Object.freeze([
  "conditionalCreateMutex",
  "conditionalCreate",
  "distributedLock",
  "spacesLockKey",
  "lockObjectKey",
  "leaseObjectKey",
  "mutexKey",
]);

/**
 * @typedef {object} SpacesBucketConfig
 * @property {string} bucket
 * @property {string} [endpoint]
 * @property {string} [localRoot]
 * @property {string} credentialEnvPrefix
 * @property {boolean} versioningEnabled
 * @property {string} [backend]
 * @property {boolean} [objectLockWorm]
 * @property {boolean} [worm]
 * @property {boolean} [immutability]
 * @property {string} [region]
 * @property {string} [accessKeyId]
 * @property {string} [secretAccessKey]
 */

/**
 * @param {unknown} config
 * @returns {{ ok: true, config: SpacesBucketConfig } | { ok: false, reason: string }}
 */
export function validateSpacesBucketConfig(config) {
  if (config == null || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, reason: "Spaces bucket config must be an object" };
  }
  const record = /** @type {Record<string, unknown>} */ (config);

  for (const field of FORBIDDEN_MUTEX_FIELDS) {
    if (record[field] != null && record[field] !== false) {
      return {
        ok: false,
        reason: `forbidden Spaces conditional-create / distributed mutex field: ${field}`,
      };
    }
  }

  if (record.objectLockWorm === true || record.worm === true || record.immutability === true) {
    return {
      ok: false,
      reason:
        "Spaces Object Lock / WORM / immutability claims are rejected (SPACES_VERSIONING_IS_IMMUTABILITY=NO)",
    };
  }
  if (record.versioningIsImmutability === true) {
    return {
      ok: false,
      reason: "SPACES_VERSIONING_IS_IMMUTABILITY must remain false",
    };
  }

  if (typeof record.bucket !== "string" || record.bucket.trim().length === 0) {
    return { ok: false, reason: "Spaces bucket name is required" };
  }
  const hasEndpoint = typeof record.endpoint === "string" && record.endpoint.trim().length > 0;
  const hasLocalRoot = typeof record.localRoot === "string" && record.localRoot.trim().length > 0;
  if (!hasEndpoint && !hasLocalRoot) {
    return { ok: false, reason: "Spaces config requires endpoint or localRoot" };
  }
  if (typeof record.credentialEnvPrefix !== "string" || record.credentialEnvPrefix.trim().length === 0) {
    return {
      ok: false,
      reason: "credentialEnvPrefix is required (separate credentials per bucket)",
    };
  }
  if (record.versioningEnabled !== true) {
    return {
      ok: false,
      reason: `versioningEnabled must be true (SPACES_VERSIONING=${SPACES_VERSIONING})`,
    };
  }

  return {
    ok: true,
    config: {
      bucket: record.bucket.trim(),
      endpoint: hasEndpoint ? String(record.endpoint).trim() : undefined,
      localRoot: hasLocalRoot ? String(record.localRoot).trim() : undefined,
      credentialEnvPrefix: String(record.credentialEnvPrefix).trim(),
      versioningEnabled: true,
      backend: typeof record.backend === "string" ? record.backend : undefined,
      region: typeof record.region === "string" ? record.region : undefined,
      accessKeyId: typeof record.accessKeyId === "string" ? record.accessKeyId : undefined,
      secretAccessKey: typeof record.secretAccessKey === "string" ? record.secretAccessKey : undefined,
    },
  };
}
