/**
 * Server-derived outlet context for customer Menu projection.
 *
 * Coordinates remain geographic authority. selectedOutletId is read/projection
 * context only — never stored as browser geographic authority.
 */
import { evaluateDeliveryServiceability } from "./serviceability";
import type { CommerceServiceabilityDecision } from "./types";
import type { DeliveryCoordinates } from "@/lib/customer-location/delivery-context";

export type CustomerOrderingOutletContext =
  | Readonly<{ kind: "no_location" }>
  | Readonly<{
      kind: "serviceable";
      outletId: string;
      decision: CommerceServiceabilityDecision;
    }>
  | Readonly<{
      kind: "not_orderable";
      decision: CommerceServiceabilityDecision;
    }>
  | Readonly<{ kind: "indeterminate" }>;

/**
 * Freshly evaluate Serviceability from coordinates and return projection outlet
 * context. Does not invent a default outlet client-side.
 */
export async function resolveCustomerOrderingOutletContext(input: {
  brandId: string;
  coordinates: DeliveryCoordinates | null | undefined;
  postalCode?: string | null;
}): Promise<CustomerOrderingOutletContext> {
  if (!input.coordinates) {
    return { kind: "no_location" };
  }

  const result = await evaluateDeliveryServiceability(
    input.brandId,
    input.coordinates,
    input.postalCode,
  );
  if (!result.ok) {
    return { kind: "indeterminate" };
  }

  const decision = result.data.decision;
  if (decision.status === "SERVICEABLE" && decision.selectedOutletId) {
    return {
      kind: "serviceable",
      outletId: decision.selectedOutletId,
      decision,
    };
  }

  return { kind: "not_orderable", decision };
}

export function menuOutletIdFromOrderingContext(
  context: CustomerOrderingOutletContext,
): string | undefined {
  return context.kind === "serviceable" ? context.outletId : undefined;
}
