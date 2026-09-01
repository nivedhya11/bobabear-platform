/**
 * Google Maps Platform location-provider runtime configuration (IMP-036B).
 *
 * Server-only. Missing credentials disable search/reverse-geocode without
 * failing process startup — Google is an enhancement, not a customer SPOF.
 */
import "server-only";

import type { AppEnvironment } from "../../../platform/config";
import {
  LOCATION_PROVIDER_SELECTORS,
  type LocationProviderSelector,
} from "../../../platform/config/schema";
import type { CustomerCommerceEnvSource } from "../config";
import { CustomerCommerceConfigurationError } from "../errors";

export type CustomerCommerceLocationConfig =
  | Readonly<{
      selector: "disabled";
      configured: false;
      googleMapsApiKey: null;
    }>
  | Readonly<{
      selector: "google_maps_platform";
      configured: false;
      googleMapsApiKey: null;
    }>
  | Readonly<{
      selector: "google_maps_platform";
      configured: true;
      googleMapsApiKey: string;
    }>;

function validateOptionalSecret(
  key: string,
  raw: string | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw.length === 0) return { ok: true, value: null };
  if (raw.trim() !== raw || /\s/.test(raw)) {
    return { ok: false, message: "Must not contain surrounding or internal whitespace." };
  }
  if (raw.length < 8) {
    return { ok: false, message: "Must be at least 8 characters." };
  }
  return { ok: true, value: raw };
}

export function locationProviderDiagnosticStatus(
  config: CustomerCommerceLocationConfig,
): "CONFIGURED" | "NOT_CONFIGURED" {
  return config.configured ? "CONFIGURED" : "NOT_CONFIGURED";
}

export function loadCustomerCommerceLocationConfig(
  source: CustomerCommerceEnvSource,
  environmentType: AppEnvironment,
): CustomerCommerceLocationConfig {
  void environmentType;
  const rawSelector = source.BOBA_BEAR_LOCATION_PROVIDER;
  const selector: LocationProviderSelector =
    rawSelector === undefined || rawSelector.length === 0
      ? "google_maps_platform"
      : (rawSelector as LocationProviderSelector);

  if (!(LOCATION_PROVIDER_SELECTORS as readonly string[]).includes(selector)) {
    throw new CustomerCommerceConfigurationError([
      {
        key: "BOBA_BEAR_LOCATION_PROVIDER",
        message: 'Must be exactly "disabled" or "google_maps_platform".',
      },
    ]);
  }

  const keyResult = validateOptionalSecret(
    "BOBA_BEAR_GOOGLE_MAPS_API_KEY",
    source.BOBA_BEAR_GOOGLE_MAPS_API_KEY,
  );
  if (!keyResult.ok) {
    throw new CustomerCommerceConfigurationError([
      { key: "BOBA_BEAR_GOOGLE_MAPS_API_KEY", message: keyResult.message },
    ]);
  }

  if (selector === "disabled") {
    return Object.freeze({
      selector: "disabled",
      configured: false,
      googleMapsApiKey: null,
    });
  }

  if (keyResult.value === null) {
    return Object.freeze({
      selector: "google_maps_platform",
      configured: false,
      googleMapsApiKey: null,
    });
  }

  return Object.freeze({
    selector: "google_maps_platform",
    configured: true,
    googleMapsApiKey: keyResult.value,
  });
}
