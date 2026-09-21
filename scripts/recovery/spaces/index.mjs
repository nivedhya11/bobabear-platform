/**
 * Object-store factory for IMP-037 recovery tooling.
 * Fail-closed on unknown backends.
 */
import { validateSpacesBucketConfig } from "./config.mjs";
import { createLocalObjectStore } from "./local.mjs";
import { createS3SpacesClient } from "./s3.mjs";

/**
 * @param {Record<string, unknown>} config
 */
export function createObjectStore(config) {
  if (config == null || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("object store config must be an object");
  }
  const backend = typeof config.backend === "string" ? config.backend.trim().toLowerCase() : "";
  const hasLocalRoot = typeof config.localRoot === "string" && config.localRoot.trim().length > 0;

  if (backend === "local" || (!backend && hasLocalRoot)) {
    return createLocalObjectStore({
      localRoot: String(config.localRoot),
      bucket: typeof config.bucket === "string" ? config.bucket : undefined,
    });
  }

  if (backend === "spaces" || backend === "s3") {
    const validated = validateSpacesBucketConfig({
      ...config,
      versioningEnabled: config.versioningEnabled === true ? true : config.versioningEnabled,
    });
    if (!validated.ok) {
      throw new Error(validated.reason);
    }
    if (process.env.BOBA_RECOVERY_REAL_SPACES !== "1") {
      throw new Error(
        "REAL_SPACES_FLAG_REQUIRED: live Spaces client creation requires BOBA_RECOVERY_REAL_SPACES=1 before any network request",
      );
    }
    return createS3SpacesClient({
      accessKeyId: String(config.accessKeyId ?? ""),
      secretAccessKey: String(config.secretAccessKey ?? ""),
      region: String(config.region ?? "us-east-1"),
      endpoint: String(config.endpoint ?? ""),
      bucket: validated.config.bucket,
    });
  }

  throw new Error(`unknown object store backend: ${backend || "(missing)"}`);
}

export { validateSpacesBucketConfig } from "./config.mjs";
export { createLocalObjectStore } from "./local.mjs";
export { createS3SpacesClient, assertVersioningSemantics } from "./s3.mjs";
export {
  createLogicalSpacesObjectStore,
  resolveLogicalSpacesConfig,
  resolveLayer2ObjectStore,
  assertS3StoreLiveAuthorized,
  LOGICAL_SPACES_CREDENTIAL_PREFIX_DEFAULT,
} from "./logical.mjs";
