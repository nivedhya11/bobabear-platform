/**
 * IMP-037 recovery-foundation constants.
 * Locked product/architecture vocabulary only; no provider or restore execution.
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
