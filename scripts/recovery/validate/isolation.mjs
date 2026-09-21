/**
 * Isolated validation network + provider suppression (IMP-037 §12).
 * Fail-closed: missing suppression proof refuses the run.
 */

/** Production / live provider credential env keys that must be absent during validation. */
export const FORBIDDEN_PRODUCTION_PROVIDER_ENV_KEYS = Object.freeze([
  "BOBA_LOGICAL_SPACES_ACCESS_KEY_ID",
  "BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY",
  "BOBA_LOGICAL_SPACES_KEY",
  "BOBA_LOGICAL_SPACES_SECRET",
  "BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID",
  "BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY",
  "BOBA_RECOVERY_REAL_SPACES",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ACCESS_KEY_ID",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
]);

/**
 * Positively verify production provider credentials are absent from env.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true } | { ok: false, reason: string, code: string, presentKeys: string[] }}
 */
export function assertProductionProviderCredentialsAbsent(env = process.env) {
  const presentKeys = FORBIDDEN_PRODUCTION_PROVIDER_ENV_KEYS.filter((key) => {
    const value = env[key];
    return value != null && String(value).trim() !== "";
  });
  if (presentKeys.length > 0) {
    return {
      ok: false,
      code: "PRODUCTION_CREDENTIALS_PRESENT",
      reason: `production provider credentials present in validation environment: ${presentKeys.join(", ")}`,
      presentKeys,
    };
  }
  return { ok: true };
}

/**
 * Derive networkIsolated from observed runtime proof when a provisioned target exists.
 * Never hard-code true for provisioned targets — missing/non-internal proof → false.
 *
 * @param {object} input
 * @param {{ networkInternalVerified?: boolean } | null | undefined} [input.provisioned]
 * @param {boolean} [input.networkIsolatedClaim]
 * @returns {boolean}
 */
export function deriveNetworkIsolated(input = {}) {
  if (input.provisioned) {
    return input.provisioned.networkInternalVerified === true;
  }
  return input.networkIsolatedClaim === true;
}

/**
 * Derive productionDnsAbsent from provisioned target proof when available.
 * @param {object} input
 * @param {{ productionDnsAbsentVerified?: boolean } | null | undefined} [input.provisioned]
 * @param {boolean} [input.productionDnsAbsentClaim]
 * @returns {boolean}
 */
export function deriveProductionDnsAbsent(input = {}) {
  if (input.provisioned) {
    return input.provisioned.productionDnsAbsentVerified === true;
  }
  return input.productionDnsAbsentClaim === true;
}

/**
 * Build suppression inputs from runtime proof + controlled env (fail-closed).
 * @param {object} input
 * @param {NodeJS.ProcessEnv} [input.env]
 * @param {object | null} [input.provisioned]
 * @param {boolean} [input.networkIsolatedClaim]
 * @param {boolean} [input.productionDnsAbsentClaim]
 */
export function resolveProviderSuppressionInput(input = {}) {
  const env = input.env ?? process.env;
  const credentials = assertProductionProviderCredentialsAbsent(env);
  return {
    env,
    networkIsolated: deriveNetworkIsolated({
      provisioned: input.provisioned,
      networkIsolatedClaim: input.networkIsolatedClaim,
    }),
    productionDnsAbsent: deriveProductionDnsAbsent({
      provisioned: input.provisioned,
      productionDnsAbsentClaim: input.productionDnsAbsentClaim,
    }),
    productionCredentialsAbsent: credentials.ok,
    credentialsCheck: credentials,
  };
}

/**
 * @param {object} input
 * @param {NodeJS.ProcessEnv} [input.env]
 * @param {boolean} [input.networkIsolated]
 * @param {boolean} [input.productionDnsAbsent]
 * @param {boolean} [input.productionCredentialsAbsent]
 * @returns {{ ok: true, mode: "SUPPRESSED" } | { ok: false, reason: string, code: string }}
 */
export function evaluateProviderSuppression(input = {}) {
  const env = input.env ?? process.env;

  if (env.BOBA_RECOVERY_ALLOW_LIVE_PROVIDERS === "1") {
    return {
      ok: false,
      code: "LIVE_PROVIDERS_FORBIDDEN",
      reason: "live provider initiation is forbidden during recovery validation",
    };
  }
  if (env.BOBA_PAYMENT_INITIATE === "1" || env.BOBA_NOTIFICATION_INITIATE === "1") {
    return {
      ok: false,
      code: "PROVIDER_INITIATION_FLAG_SET",
      reason: "payment/notification initiation flags must not be set during validation",
    };
  }

  if (input.networkIsolated !== true) {
    return {
      ok: false,
      code: "NETWORK_NOT_ISOLATED",
      reason: "missing isolated Docker network proof; provider suppression refused",
    };
  }
  if (input.productionDnsAbsent !== true) {
    return {
      ok: false,
      code: "PRODUCTION_DNS_PRESENT",
      reason: "production DNS must be absent from the validation environment",
    };
  }
  if (input.productionCredentialsAbsent !== true) {
    return {
      ok: false,
      code: "PRODUCTION_CREDENTIALS_PRESENT",
      reason: "production provider credentials must be absent from the validation environment",
    };
  }

  return { ok: true, mode: "SUPPRESSED" };
}

/**
 * Suggested isolated Docker network configuration for disposable validation.
 */
export const ISOLATED_VALIDATION_NETWORK = Object.freeze({
  name: "boba-recovery-validation",
  internal: true,
  attachProductionServices: false,
  outboundProviderInitiation: false,
});
