/**
 * Customer-commerce service configuration (IMP-024).
 *
 * Never reads environment variables directly — `main.ts` passes an explicit source.
 * Validates listen host/port/trust-proxy hops plus the customer-auth realm
 * secrets required to resolve same-origin session cookies.
 */
import "server-only";

import type { AppEnvironment } from "../../platform/config";
import { validateCustomerAuthConfig } from "../auth/shared/config";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import type { CustomerAuthConfig } from "../auth/shared/types";
import {
  createCustomerTemporaryIdentityDeriver,
  loadCustomerPiiHashSecret,
  type CustomerPiiHashSecret,
  type CustomerTemporaryIdentityDeriver,
} from "../customer-auth/pii";
import { CustomerCommerceConfigurationError } from "./errors";

export type CustomerCommerceEnvSource = Readonly<Record<string, string | undefined>>;

/** Accepted Cart guest TTL policy (not a new env var — foundation rule). */
export const CUSTOMER_COMMERCE_CART_POLICY = Object.freeze({
  guestCartTtlMs: 3_600_000,
});

/** Accepted Checkout TTL policy (not a new env var — foundation rule). */
export const CUSTOMER_COMMERCE_CHECKOUT_POLICY = Object.freeze({
  checkoutTtlMs: 15 * 60 * 1000,
});

export type CustomerCommerceServiceConfig = Readonly<{
  environmentType: AppEnvironment;
  auth: CustomerAuthConfig;
  piiHashSecret: CustomerPiiHashSecret;
  identityDeriver: CustomerTemporaryIdentityDeriver;
  trustProxyHops: number;
  serviceHost: string;
  servicePort: number;
  trustedOrigin: string;
}>;

function parseTrustProxyHops(
  raw: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  const value = raw === undefined || raw.length === 0 ? "0" : raw;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Must be an integer between 0 and 2 inclusive." };
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 0 || parsed > 2) {
    return { ok: false, message: "Must be an integer between 0 and 2 inclusive." };
  }
  return { ok: true, value: parsed };
}

function parseServicePort(
  raw: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  const value = raw === undefined || raw.length === 0 ? "8083" : raw;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > 65535) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  return { ok: true, value: parsed };
}

/**
 * Load customer-commerce listen + customer-auth session validation config.
 */
export function loadCustomerCommerceServiceConfig(
  source: CustomerCommerceEnvSource,
  environmentType: AppEnvironment,
): CustomerCommerceServiceConfig {
  const customerResult = validateCustomerAuthConfig(source, environmentType);
  if (!customerResult.ok) {
    throw new AuthFoundationConfigurationError(customerResult.issues);
  }
  const auth = customerResult.config;

  const issues: Array<{ key: string; message: string }> = [];

  const hopsResult = parseTrustProxyHops(source.CUSTOMER_COMMERCE_TRUST_PROXY_HOPS);
  if (!hopsResult.ok) {
    issues.push({
      key: "CUSTOMER_COMMERCE_TRUST_PROXY_HOPS",
      message: hopsResult.message,
    });
  }

  const portResult = parseServicePort(source.CUSTOMER_COMMERCE_SERVICE_PORT);
  if (!portResult.ok) {
    issues.push({
      key: "CUSTOMER_COMMERCE_SERVICE_PORT",
      message: portResult.message,
    });
  }

  const host =
    source.CUSTOMER_COMMERCE_SERVICE_HOST === undefined ||
    source.CUSTOMER_COMMERCE_SERVICE_HOST.length === 0
      ? "0.0.0.0"
      : source.CUSTOMER_COMMERCE_SERVICE_HOST;
  if (host.trim() !== host || host.length === 0) {
    issues.push({
      key: "CUSTOMER_COMMERCE_SERVICE_HOST",
      message: "Must be a non-empty host without surrounding whitespace.",
    });
  }

  if (issues.length > 0) {
    throw new CustomerCommerceConfigurationError(issues);
  }

  const piiHashSecret = loadCustomerPiiHashSecret(source, {
    customerAuthSecret: auth.secret,
  });

  return Object.freeze({
    environmentType,
    auth,
    piiHashSecret,
    identityDeriver: createCustomerTemporaryIdentityDeriver(piiHashSecret),
    trustProxyHops: (hopsResult as { ok: true; value: number }).value,
    serviceHost: host,
    servicePort: (portResult as { ok: true; value: number }).value,
    trustedOrigin: auth.baseURL.origin,
  });
}
