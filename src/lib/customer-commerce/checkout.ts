/**
 * Checkout transport wrappers through evaluate (IMP-025).
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type {
  CommerceCheckout,
  CommerceCheckoutSnapshot,
  CommerceDestinationInput,
} from "./types";

type CheckoutEnvelope = Readonly<{ ok: true; checkout: CommerceCheckout | null }>;
type EvaluateEnvelope = Readonly<{
  ok: true;
  checkout: CommerceCheckout;
  snapshot: CommerceCheckoutSnapshot;
}>;

export async function getActiveCheckout(input: {
  cartId?: string;
  checkoutId?: string;
}): Promise<CommerceHttpResult<{ checkout: CommerceCheckout | null }>> {
  const result = await commerceRequest<CheckoutEnvelope>("/api/v1/checkouts/active", {
    method: "GET",
    query: {
      cartId: input.cartId,
      checkoutId: input.checkoutId,
    },
  });
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { checkout: result.data.checkout } };
}

export async function startCheckout(input: {
  cartId: string;
}): Promise<CommerceHttpResult<{ checkout: CommerceCheckout }>> {
  const result = await commerceRequest<CheckoutEnvelope>("/api/v1/checkouts", {
    method: "POST",
    body: { cartId: input.cartId },
  });
  if (!result.ok) return result;
  if (!result.data.checkout) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { checkout: result.data.checkout } };
}

export async function setCheckoutDestination(input: {
  checkoutId: string;
  expectedCheckoutRevision: string;
  destination: CommerceDestinationInput;
}): Promise<CommerceHttpResult<{ checkout: CommerceCheckout }>> {
  const result = await commerceRequest<CheckoutEnvelope>(
    `/api/v1/checkouts/${input.checkoutId}/destination`,
    {
      method: "PUT",
      body: {
        expectedCheckoutRevision: input.expectedCheckoutRevision,
        destination: input.destination,
      },
    },
  );
  if (!result.ok) return result;
  if (!result.data.checkout) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { checkout: result.data.checkout } };
}

export async function clearCheckoutDestination(input: {
  checkoutId: string;
  expectedCheckoutRevision: string;
}): Promise<CommerceHttpResult<{ checkout: CommerceCheckout }>> {
  const result = await commerceRequest<CheckoutEnvelope>(
    `/api/v1/checkouts/${input.checkoutId}/destination/clear`,
    {
      method: "POST",
      body: { expectedCheckoutRevision: input.expectedCheckoutRevision },
    },
  );
  if (!result.ok) return result;
  if (!result.data.checkout) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { checkout: result.data.checkout } };
}

export async function evaluateCheckout(input: {
  checkoutId: string;
  expectedCheckoutRevision: string;
}): Promise<
  CommerceHttpResult<{ checkout: CommerceCheckout; snapshot: CommerceCheckoutSnapshot }>
> {
  const result = await commerceRequest<EvaluateEnvelope>(
    `/api/v1/checkouts/${input.checkoutId}/evaluate`,
    {
      method: "POST",
      body: { expectedCheckoutRevision: input.expectedCheckoutRevision },
    },
  );
  if (!result.ok) return result;
  return {
    ok: true,
    status: result.status,
    data: { checkout: result.data.checkout, snapshot: result.data.snapshot },
  };
}
