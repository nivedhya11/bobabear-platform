/**
 * Serviceability transport wrapper (IMP-036B).
 *
 * Read-only PIN check — no auth required.
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CommerceServiceabilityDecision, CommerceServiceabilityEvaluateInput } from "./types";

export async function evaluateDeliveryServiceability(
  brandId: string,
  postalCode: string,
  coordinates?: Readonly<{ latitude: string; longitude: string }> | null,
): Promise<CommerceHttpResult<{ decision: CommerceServiceabilityDecision }>> {
  const input: CommerceServiceabilityEvaluateInput = {
    brandId,
    location: {
      postalCode,
      ...(coordinates !== undefined ? { coordinates } : {}),
    },
  };
  return commerceRequest("/api/v1/serviceability/evaluate", {
    method: "POST",
    body: input,
  });
}
