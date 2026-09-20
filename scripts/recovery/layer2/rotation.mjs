/**
 * Layer 2 age key rotation metadata (IMP-037 §8.2).
 *
 * - New backups may use a new recipient / public key.
 * - Old private identities remain available in off-host custody for retained artifacts.
 * - Metadata records recipient fingerprint / keyVersion only — never private key material.
 * - Backup-only mode must not have private identity on the host path.
 */
import { redactText } from "../redact.mjs";
import { fingerprintRecipient } from "./age.mjs";

/**
 * Fail closed if private age identity appears configured for backup-only mode.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertPrivateKeyNotOnBackupPath(env = process.env) {
  if (typeof env.AGE_SECRET_KEY === "string" && env.AGE_SECRET_KEY.trim().length > 0) {
    return {
      ok: false,
      reason: redactText("AGE_SECRET_KEY must not be present on the backup-only host path"),
    };
  }
  const identityPathKeys = [
    "AGE_IDENTITY_FILE",
    "BOBA_RECOVERY_AGE_IDENTITY_FILE",
    "AGE_PRIVATE_IDENTITY_PATH",
  ];
  for (const key of identityPathKeys) {
    if (typeof env[key] === "string" && env[key].trim().length > 0) {
      return {
        ok: false,
        reason: redactText(`${key} must not be set for backup-only age encryption`),
      };
    }
  }
  return { ok: true };
}

/**
 * Build rotation metadata for a new Layer 2 recipient without recording secrets.
 *
 * @param {object} input
 * @param {string} input.newRecipient
 * @param {string} [input.keyVersion]
 * @param {string[]} [input.retainedRecipientFingerprints]
 * @param {boolean} [input.oldPrivateIdentitiesRetained]
 * @returns {{ ok: true, metadata: object } | { ok: false, reason: string }}
 */
export function planAgeRecipientRotation(input) {
  if (typeof input?.newRecipient !== "string" || input.newRecipient.trim().length === 0) {
    return { ok: false, reason: "newRecipient is required for age key rotation" };
  }
  if (input.oldPrivateIdentitiesRetained !== true) {
    return {
      ok: false,
      reason:
        "old private identities must remain resolvable for retained artifacts (RETIRED_KEYS_MUST_REMAIN_RESOLVABLE_FOR_RETAINED_ARTIFACTS)",
    };
  }
  const fingerprint = fingerprintRecipient(input.newRecipient);
  const keyVersion =
    typeof input.keyVersion === "string" && input.keyVersion.trim()
      ? input.keyVersion.trim()
      : fingerprint;
  return {
    ok: true,
    metadata: {
      keyVersion,
      recipientFingerprint: fingerprint,
      retainedRecipientFingerprints: Array.isArray(input.retainedRecipientFingerprints)
        ? input.retainedRecipientFingerprints
        : [],
      oldPrivateIdentitiesRetained: true,
      recordsPrivateKeyMaterial: false,
    },
  };
}
