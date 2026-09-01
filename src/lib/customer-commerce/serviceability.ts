/**
 * Serviceability transport wrapper (IMP-036B).
 *
 * Read-only coordinate check — no auth required.
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CommerceServiceabilityDecision, CommerceServiceabilityEvaluateInput } from "./types";

export async function evaluateDeliveryServiceability(
  brandId: string,
  coordinates: Readonly<{ latitude: string; longitude: string }>,
  postalCode?: string | null,
): Promise<CommerceHttpResult<{ decision: CommerceServiceabilityDecision }>> {
  const input: CommerceServiceabilityEvaluateInput = {
    brandId,
    location: {
      coordinates,
      ...(postalCode && /^\d{6}$/.test(postalCode) ? { postalCode } : {}),
    },
  };
  return commerceRequest("/api/v1/serviceability/evaluate", {
    method: "POST",
    body: input,
  });
}
