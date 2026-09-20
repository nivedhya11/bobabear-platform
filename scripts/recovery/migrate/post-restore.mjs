/**
 * Post-restore schema reconciliation via existing migration authority only (IMP-037 §13).
 * Editing historical migrations is FORBIDDEN. Source remains authoritative.
 */
import { redactText } from "../redact.mjs";

/**
 * @param {object} options
 * @param {() => Promise<{ ok: boolean, reason?: string }> | { ok: boolean, reason?: string }} options.migrateFn
 * @param {string} options.targetIdentity
 * @param {boolean} [options.sourceAuthoritative]
 * @param {boolean} [options.editHistoricalMigrations]
 * @param {boolean} [options.manualSchemaSurgery]
 * @returns {Promise<{ ok: boolean, status: string, reason?: string }>}
 */
export async function runPostRestoreMigrations(options) {
  if (options?.editHistoricalMigrations === true) {
    return {
      ok: false,
      status: "BLOCKED",
      reason: "EDIT_HISTORICAL_MIGRATIONS is FORBIDDEN",
    };
  }
  if (options?.manualSchemaSurgery === true) {
    return {
      ok: false,
      status: "BLOCKED",
      reason: "MANUAL_SCHEMA_SURGERY is FORBIDDEN",
    };
  }
  if (options.sourceAuthoritative !== true) {
    return {
      ok: false,
      status: "BLOCKED",
      reason: "source must remain authoritative during post-restore migration",
    };
  }
  if (typeof options.targetIdentity !== "string" || options.targetIdentity.trim().length === 0) {
    return {
      ok: false,
      status: "FAILED",
      reason: "targetIdentity is required",
    };
  }
  if (typeof options.migrateFn !== "function") {
    return {
      ok: false,
      status: "FAILED",
      reason: "migrateFn wrapping existing migration authority is required",
    };
  }

  try {
    const result = await options.migrateFn();
    if (!result?.ok) {
      return {
        ok: false,
        status: "FAILED",
        reason: redactText(result?.reason ?? "migration authority reported failure"),
      };
    }
    return {
      ok: true,
      status: "SUCCEEDED",
      targetIdentity: options.targetIdentity,
      note: "applied through existing repository migration authority only",
    };
  } catch (error) {
    return {
      ok: false,
      status: "FAILED",
      reason: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}
