/**
 * Isolated validation network + provider suppression (IMP-037 §12).
 * Fail-closed: missing suppression proof refuses the run.
 */
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
