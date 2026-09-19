/**
 * Fail-closed source/target identity guard for IMP-037 recovery.
 * This tranche does not restore. There is no --force-production override.
 */
import { DEFAULT_KNOWN_PRODUCTION_PGDATA_PATHS, ENVIRONMENT_CLASSIFICATION } from "./constants.mjs";

const ALLOWED_TARGET_CLASSIFICATIONS = new Set([ENVIRONMENT_CLASSIFICATION.RECOVERY]);
const KNOWN_CLASSIFICATIONS = new Set(Object.values(ENVIRONMENT_CLASSIFICATION));

/**
 * @typedef {object} IdentitySafetyInput
 * @property {string | null | undefined} sourceIdentity
 * @property {string | null | undefined} targetIdentity
 * @property {string | null | undefined} sourceClassification
 * @property {string | null | undefined} targetClassification
 * @property {string | null | undefined} [targetPgdataPath]
 * @property {string[]} [knownProductionPgdataPaths]
 */

/**
 * @param {IdentitySafetyInput} input
 * @returns {{ allowed: true } | { allowed: false, reason: string, code: string }}
 */
export function evaluateTargetIdentitySafety(input) {
  const sourceIdentity = normalizeIdentity(input.sourceIdentity);
  const targetIdentity = normalizeIdentity(input.targetIdentity);
  const sourceClassification = normalizeClassification(input.sourceClassification);
  const targetClassification = normalizeClassification(input.targetClassification);

  if (!targetIdentity) {
    return deny("TARGET_IDENTITY_MISSING", "Target identity is missing");
  }
  if (!sourceIdentity) {
    return deny("SOURCE_IDENTITY_MISSING", "Source identity is missing");
  }
  if (sourceIdentity === targetIdentity) {
    return deny("SOURCE_EQUALS_TARGET", "Target identity equals source identity");
  }

  if (sourceClassification === "ambiguous" || targetClassification === "ambiguous") {
    return deny("CLASSIFICATION_AMBIGUOUS", "Environment classification is ambiguous");
  }
  if (!sourceClassification || !KNOWN_CLASSIFICATIONS.has(sourceClassification)) {
    return deny("SOURCE_CLASSIFICATION_UNRESOLVED", "Source environment classification is missing or unresolved");
  }
  if (!targetClassification || !KNOWN_CLASSIFICATIONS.has(targetClassification)) {
    return deny("TARGET_CLASSIFICATION_UNRESOLVED", "Target environment classification is missing or unresolved");
  }
  if (!ALLOWED_TARGET_CLASSIFICATIONS.has(targetClassification)) {
    return deny(
      "PRODUCTION_OR_AUTHORITATIVE_TARGET",
      "Recovery target must be a fresh isolated recovery environment; production/authoritative targets are forbidden",
    );
  }

  const productionPaths = (input.knownProductionPgdataPaths ?? DEFAULT_KNOWN_PRODUCTION_PGDATA_PATHS).map(normalizePath);
  const targetPgdata = normalizePath(input.targetPgdataPath);
  if (targetPgdata && productionPaths.includes(targetPgdata)) {
    return deny("PRODUCTION_PGDATA_FORBIDDEN", "Known production PGDATA identity/path is forbidden as a recovery target");
  }

  return { allowed: true };
}

function deny(code, reason) {
  return { allowed: false, code, reason };
}

function normalizeIdentity(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function normalizeClassification(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "ambiguous" || trimmed === "unknown" || trimmed === "unresolved") return trimmed === "ambiguous" ? "ambiguous" : "";
  return trimmed;
}

function normalizePath(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "").toLowerCase();
}
