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
 * Live provider execution is forbidden unless BOBA_RECOVERY_REAL_SPACES=1.
 * The guard runs before any client construction or network request.
 * Wiring config may be resolved without the flag; it must not open a socket.
 */
import { validateSpacesBucketConfig } from "./config.mjs";
import { createLocalObjectStore } from "./local.mjs";
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
 * @param {{ transport?: Function }} [options]
 */
export async function createLogicalSpacesObjectStore(env = process.env, flags = {}, options = {}) {
  const resolved = resolveLogicalSpacesConfig(env, flags);
  if (!resolved.ok) {
    return resolved;
  }

  // Block before constructing a client that can emit a network request.
  if (env.BOBA_RECOVERY_REAL_SPACES !== "1") {
    return {
      ok: false,
      status: "BLOCKED",
      reason:
        "real Spaces operations require BOBA_RECOVERY_REAL_SPACES=1 before any network request",
      code: "REAL_SPACES_FLAG_REQUIRED",
    };
  }

  let objectStore;
  try {
    objectStore = createS3SpacesClient({
      accessKeyId: String(resolved.config.accessKeyId),
      secretAccessKey: String(resolved.config.secretAccessKey),
      region: String(resolved.config.region ?? "us-east-1"),
      endpoint: String(resolved.config.endpoint),
      bucket: String(resolved.config.bucket),
      transport: options.transport,
    });
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
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
      status: "BLOCKED",
      reason: versioning.reason ?? "Spaces bucket versioning not confirmed ENABLED",
      code: "SPACES_VERSIONING_NOT_ENABLED",
      versioning,
    };
  }

  objectStore.liveAuthorized = true;
  objectStore.versioningVerified = true;
  return { ok: true, objectStore, config: resolved.config };
}

/**
 * One Layer 2 object-store resolver for backup, restore, drill/rehearsal, and reconcile.
 * `--local-store` selects the disposable local store. Otherwise logical Spaces env
 * selects the live-flag-guarded Spaces client.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {Record<string, string | boolean>} [flags]
 * @param {{ localStore?: string, transport?: Function }} [options]
 */
export async function resolveLayer2ObjectStore(env = process.env, flags = {}, options = {}) {
  const localStore =
    (typeof options.localStore === "string" && options.localStore.trim()) ||
    readFlag(flags, "local-store") ||
    (typeof env.BOBA_RECOVERY_LOCAL_STORE === "string" ? env.BOBA_RECOVERY_LOCAL_STORE.trim() : "") ||
    "";
  if (localStore) {
    return {
      ok: true,
      mode: "local",
      objectStore: createLocalObjectStore({ localRoot: localStore }),
    };
  }
  const spaces = await createLogicalSpacesObjectStore(env, flags, options);
  if (!spaces.ok) {
    return { ...spaces, mode: "spaces", status: spaces.status ?? "BLOCKED" };
  }
  return { ok: true, mode: "spaces", objectStore: spaces.objectStore, config: spaces.config };
}

/**
 * Real Spaces stores may not perform network I/O unless the live flag was honored
 * and versioning was confirmed before the store was returned.
 * Local stores are unaffected.
 *
 * @param {{ backend?: string, liveAuthorized?: boolean }} [objectStore]
 * @returns {{ ok: true } | { ok: false, code: string, reason: string }}
 */
export function assertS3StoreLiveAuthorized(objectStore) {
  if (!objectStore || objectStore.backend !== "s3") return { ok: true };
  if (objectStore.liveAuthorized === true) return { ok: true };
  return {
    ok: false,
    code: "REAL_SPACES_FLAG_REQUIRED",
    reason:
      "real Spaces operations require BOBA_RECOVERY_REAL_SPACES=1 before any network request",
  };
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

