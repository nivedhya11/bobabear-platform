/**
 * IMP-037 recovery constants.
 * Locked product/architecture vocabulary only.
 */

export const EVIDENCE_SCHEMA_VERSION = "imp037-evidence-v1";

export const OPERATION_STATUS = Object.freeze({
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
});

export const READINESS_LEVEL = Object.freeze({
  READY: "READY",
  NOT_READY: "NOT_READY",
});

export const RECOVERY_LAYER = Object.freeze({
  LAYER_1: "LAYER_1",
  LAYER_2: "LAYER_2",
});

export const OPERATION_TYPE = Object.freeze({
  STATUS: "status",
  EVIDENCE_VALIDATE: "evidence-validate",
  TARGET_CHECK: "target-check",
  LAYER1_BACKUP: "layer1-backup",
  LAYER2_LOGICAL_BACKUP: "layer2-logical-backup",
  RESTORE_PITR: "restore-pitr",
  RESTORE_LOGICAL: "restore-logical",
  PORTABILITY_REHEARSAL: "portability-rehearsal",
  HIGH_RISK_GATE: "high-risk-gate",
  CAPACITY_OBSERVE: "capacity-observe",
  LAYER1_HEALTH: "layer1-health",
});

export const ENVIRONMENT_CLASSIFICATION = Object.freeze({
  PRODUCTION: "production",
  STAGING: "staging",
  RECOVERY: "recovery",
});

export const CHECKSUM_INTEGRITY_STATUS = Object.freeze({
  NOT_CHECKED: "NOT_CHECKED",
  MATCHED: "MATCHED",
  MISMATCHED: "MISMATCHED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const CLI_EXIT = Object.freeze({
  OK: 0,
  FAILURE: 1,
  BLOCKED: 2,
  UNAVAILABLE: 3,
});

export const DEFAULT_KNOWN_PRODUCTION_PGDATA_PATHS = Object.freeze([
  "/var/lib/postgresql/data",
  "/var/lib/postgresql/18/data",
  "/var/lib/pgsql/data",
]);

export const REQUIRED_RECOVERY_LAYERS = Object.freeze([
  RECOVERY_LAYER.LAYER_1,
  RECOVERY_LAYER.LAYER_2,
]);

/**
 * Locked product frequency for Layer 2 independent logical backup: at least daily (FD-037-03).
 * Used as the canonical freshness default when an explicit Layer 2 max-age flag is omitted.
 */
export const LAYER_2_MAX_AGE_MS_DEFAULT = 24 * 60 * 60 * 1000;

/**
 * Locked Layer 1 health-evidence age default: 36 hours (daily differential + margin).
 * Used when an explicit Layer 1 max-age policy flag is omitted.
 * This bounds evidence.endedAt age only — it must NOT mask a stale recovery point.
 * Recovery-point freshness is enforced separately via RPO_TARGET_MS_DEFAULT.
 */
export const LAYER_1_MAX_AGE_MS_DEFAULT = 36 * 60 * 60 * 1000;

/**
 * Locked RPO target (FD-037-01): recovery point must be within 15 minutes.
 * Applied to Layer 1 evidence.recoveryPoint at readiness / high-risk gate time.
 */
export const RPO_TARGET_MS_DEFAULT = 15 * 60 * 1000;

/**
 * Spaces / object-store locked architecture flags (IMP-037 §9).
 * Versioning is ENABLED but is NOT immutability / WORM.
 */
export const SPACES_VERSIONING = "ENABLED";
export const SPACES_VERSIONING_IS_IMMUTABILITY = false;
export const SPACES_OBJECT_LOCK_WORM_REQUIRED = false;

/**
 * Proof / validation result codes recorded in evidence.validationResults.
 */
export const PROOF_CODE = Object.freeze({
  REMOTE_ARTIFACT_SHA256_VERIFIED: "REMOTE_ARTIFACT_SHA256_VERIFIED",
  REMOTE_STORED_ARTIFACT_VERIFIED: "REMOTE_STORED_ARTIFACT_VERIFIED",
  COMPLETE_MARKER_WRITTEN_LAST: "COMPLETE_MARKER_WRITTEN_LAST",
  LAYER2_COMPLETE: "LAYER2_COMPLETE",
  PGBACKREST_CHECK_OK: "PGBACKREST_CHECK_OK",
  PGBACKREST_INFO_OK: "PGBACKREST_INFO_OK",
  PGBACKREST_VERIFY_OK: "PGBACKREST_VERIFY_OK",
  LAYER1_HEALTH_OK: "LAYER1_HEALTH_OK",
  LAYER1_RECOVERY_POINT: "LAYER1_RECOVERY_POINT",
  REPOSITORY_GENERATION: "REPOSITORY_GENERATION",
  DB_REACHABLE: "DB_REACHABLE",
  BUSINESS_INTEGRITY_VALIDATED: "BUSINESS_INTEGRITY_VALIDATED",
});

/**
 * Foundation CLI / schema-validation operation types. Schema-valid SUCCEEDED records of these
 * types are never qualifying Layer 1 or Layer 2 recovery proof.
 */
export const NON_QUALIFYING_FOUNDATION_OPERATION_TYPES = Object.freeze([
  OPERATION_TYPE.STATUS,
  OPERATION_TYPE.EVIDENCE_VALIDATE,
  OPERATION_TYPE.TARGET_CHECK,
]);
