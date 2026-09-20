/**
 * Layer 2 logical Spaces credential / object-store resolution.
 *
 * LOGICAL bucket credentials are intentionally separate from physical/pgBackRest
 * repository credentials. Do not reuse PGBACKREST / physical Spaces keys here.
 *
 * Preferred env:
 *   BOBA_RECOVERY_LOGICAL_SPACES_BUCKET
 *   BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT
 *   BOBA_RECOVERY_LOGICAL_SPACES_REGION
 *   BOBA_LOGICAL_SPACES_ACCESS_KEY_ID
 *   BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY
 *   (or BOBA_LOGICAL_SPACES_KEY / BOBA_LOGICAL_SPACES_SECRET)
 *
 * Legacy aliases (still Layer-2-scoped, not physical):
 *   BOBA_RECOVERY_SPACES_BUCKET / ENDPOINT / REGION
 *   credential prefix BOBA_RECOVERY_SPACES_CREDENTIAL_PREFIX (default BOBA_LOGICAL_SPACES)
 *
 * Live provider execution remains guarded by BOBA_RECOVERY_REAL_SPACES=1 for
 * intentional live calls; wiring itself must succeed when config is present.
 */
import { validateSpacesBucketConfig } from "./config.mjs";
import { createS3SpacesClient } from "./s3.mjs";

export const LOGICAL_SPACES_CREDENTIAL_PREFIX_DEFAULT = "BOBA_LOGICAL_SPACES";

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {Record<string, string | boolean>} [flags]
 * @returns {{ ok: true, config: Record<string, unknown> } | { ok: false, reason: string }}
 */
export function resolveLogicalSpacesConfig(env = process.env, flags = {}) {
  const bucket =
    readFlag(flags, "bucket") ??
    env.BOBA_RECOVERY_LOGICAL_SPACES_BUCKET ??
    env.BOBA_RECOVERY_SPACES_BUCKET ??
    "";
  const endpoint =
    readFlag(flags, "endpoint") ??
    env.BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT ??
    env.BOBA_RECOVERY_SPACES_ENDPOINT ??
    "";
  const region =
    readFlag(flags, "region") ??
    env.BOBA_RECOVERY_LOGICAL_SPACES_REGION ??
    env.BOBA_RECOVERY_SPACES_REGION ??
    "us-east-1";
  const credentialEnvPrefix =
    readFlag(flags, "credential-env-prefix") ??
    env.BOBA_RECOVERY_LOGICAL_SPACES_CREDENTIAL_PREFIX ??
    env.BOBA_RECOVERY_SPACES_CREDENTIAL_PREFIX ??
    LOGICAL_SPACES_CREDENTIAL_PREFIX_DEFAULT;

  if (!String(bucket).trim()) {
    return {
      ok: false,
      reason:
        "Layer 2 Spaces bucket required (BOBA_RECOVERY_LOGICAL_SPACES_BUCKET or --local-store)",
    };
  }
  if (!String(endpoint).trim()) {
    return {
      ok: false,
      reason:
        "Layer 2 Spaces endpoint required (BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT) — distinct from physical/pgBackRest credentials",
    };
  }

  const accessKeyId =
    env[`${credentialEnvPrefix}_ACCESS_KEY_ID`] ??
    env[`${credentialEnvPrefix}_KEY`] ??
    env.BOBA_LOGICAL_SPACES_ACCESS_KEY_ID ??
    env.BOBA_LOGICAL_SPACES_KEY ??
    "";
  const secretAccessKey =
    env[`${credentialEnvPrefix}_SECRET_ACCESS_KEY`] ??
    env[`${credentialEnvPrefix}_SECRET`] ??
    env.BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY ??
    env.BOBA_LOGICAL_SPACES_SECRET ??
    "";

  if (!String(accessKeyId).trim() || !String(secretAccessKey).trim()) {
    return {
      ok: false,
      reason: `Layer 2 Spaces credentials missing under prefix ${credentialEnvPrefix}_* (do not reuse physical/pgBackRest keys)`,
    };
  }

  const config = {
    backend: "spaces",
    bucket: String(bucket).trim(),
    endpoint: String(endpoint).trim(),
    region: String(region).trim() || "us-east-1",
    credentialEnvPrefix,
    accessKeyId: String(accessKeyId).trim(),
    secretAccessKey: String(secretAccessKey).trim(),
    versioningEnabled: true,
  };
  const validated = validateSpacesBucketConfig(config);
  if (!validated.ok) {
    return { ok: false, reason: validated.reason };
  }
  return { ok: true, config };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {Record<string, string | boolean>} [flags]
 * @param {{ requireVersioning?: boolean }} [options]
 */
export async function createLogicalSpacesObjectStore(env = process.env, flags = {}, options = {}) {
  const resolved = resolveLogicalSpacesConfig(env, flags);
  if (!resolved.ok) {
    return resolved;
  }

  let objectStore;
  try {
    objectStore = createS3SpacesClient({
      accessKeyId: String(resolved.config.accessKeyId),
      secretAccessKey: String(resolved.config.secretAccessKey),
      region: String(resolved.config.region ?? "us-east-1"),
      endpoint: String(resolved.config.endpoint),
      bucket: String(resolved.config.bucket),
    });
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (options.requireVersioning === true) {
    if (env.BOBA_RECOVERY_REAL_SPACES !== "1") {
      return {
        ok: false,
        reason:
          "production-shaped Spaces Layer 2 requires BOBA_RECOVERY_REAL_SPACES=1 to verify bucket versioning ENABLED",
        code: "REAL_SPACES_FLAG_REQUIRED",
      };
    }
    if (typeof objectStore.verifyBucketVersioning !== "function") {
      return {
        ok: false,
        reason: "object store cannot verify bucket versioning",
        code: "VERSIONING_VERIFY_UNAVAILABLE",
      };
    }
    const versioning = await objectStore.verifyBucketVersioning();
    if (!versioning.ok) {
      return {
        ok: false,
        reason: versioning.reason ?? "Spaces bucket versioning not confirmed ENABLED",
        code: "SPACES_VERSIONING_NOT_ENABLED",
        versioning,
      };
    }
  }

  return { ok: true, objectStore, config: resolved.config };
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} name
 * @returns {string | undefined}
 */
function readFlag(flags, name) {
  const value = flags?.[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

