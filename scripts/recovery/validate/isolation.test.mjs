import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateProviderSuppression, ISOLATED_VALIDATION_NETWORK } from "./isolation.mjs";

test("provider suppression requires positive isolation proof", () => {
  const missing = evaluateProviderSuppression({
    networkIsolated: false,
    productionDnsAbsent: true,
    productionCredentialsAbsent: true,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /isolated/i);

  const ok = evaluateProviderSuppression({
    networkIsolated: true,
    productionDnsAbsent: true,
    productionCredentialsAbsent: true,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.mode, "SUPPRESSED");
  assert.equal(ISOLATED_VALIDATION_NETWORK.outboundProviderInitiation, false);
});

test("payment/notification initiation flags refuse suppression", () => {
  const result = evaluateProviderSuppression({
    env: { BOBA_PAYMENT_INITIATE: "1" },
    networkIsolated: true,
    productionDnsAbsent: true,
    productionCredentialsAbsent: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /initiation/i);
});
