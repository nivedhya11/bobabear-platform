import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertProductionProviderCredentialsAbsent,
  deriveNetworkIsolated,
  deriveProductionDnsAbsent,
  evaluateProviderSuppression,
  ISOLATED_VALIDATION_NETWORK,
  resolveProviderSuppressionInput,
} from "./isolation.mjs";

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

test("internal network verified → isolation eligible", () => {
  assert.equal(
    deriveNetworkIsolated({
      provisioned: { networkInternalVerified: true },
      networkIsolatedClaim: false,
    }),
    true,
  );
  const resolved = resolveProviderSuppressionInput({
    env: {},
    provisioned: {
      networkInternalVerified: true,
      productionDnsAbsentVerified: true,
    },
    networkIsolatedClaim: false,
    productionDnsAbsentClaim: false,
  });
  assert.equal(resolved.networkIsolated, true);
  assert.equal(resolved.productionDnsAbsent, true);
  assert.equal(resolved.productionCredentialsAbsent, true);
  const suppression = evaluateProviderSuppression(resolved);
  assert.equal(suppression.ok, true);
});

test("default/non-internal network → BLOCKED", () => {
  assert.equal(
    deriveNetworkIsolated({
      provisioned: { networkInternalVerified: false, networkName: "bridge" },
      networkIsolatedClaim: true,
    }),
    false,
  );
  const suppression = evaluateProviderSuppression({
    networkIsolated: false,
    productionDnsAbsent: true,
    productionCredentialsAbsent: true,
  });
  assert.equal(suppression.ok, false);
  assert.equal(suppression.code, "NETWORK_NOT_ISOLATED");
});

test("missing network proof → BLOCKED", () => {
  assert.equal(deriveNetworkIsolated({ provisioned: {}, networkIsolatedClaim: true }), false);
  assert.equal(deriveNetworkIsolated({ provisioned: null, networkIsolatedClaim: false }), false);
  assert.equal(deriveProductionDnsAbsent({ provisioned: {}, productionDnsAbsentClaim: true }), false);
  const resolved = resolveProviderSuppressionInput({
    env: {},
    provisioned: { networkName: "boba-rec-net-x" },
    networkIsolatedClaim: true,
    productionDnsAbsentClaim: true,
  });
  assert.equal(resolved.networkIsolated, false);
  assert.equal(evaluateProviderSuppression(resolved).ok, false);
});

test("production credentials present → BLOCKED; controlled absent env → eligible", () => {
  const present = assertProductionProviderCredentialsAbsent({
    BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY: "secret",
  });
  assert.equal(present.ok, false);
  assert.equal(present.code, "PRODUCTION_CREDENTIALS_PRESENT");

  const absent = assertProductionProviderCredentialsAbsent({
    BOBA_BEAR_ENV: "local",
    PATH: "/usr/bin",
  });
  assert.equal(absent.ok, true);

  const resolved = resolveProviderSuppressionInput({
    env: { BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID: "phys-key" },
    provisioned: {
      networkInternalVerified: true,
      productionDnsAbsentVerified: true,
    },
  });
  assert.equal(resolved.productionCredentialsAbsent, false);
  assert.equal(evaluateProviderSuppression(resolved).ok, false);
});
