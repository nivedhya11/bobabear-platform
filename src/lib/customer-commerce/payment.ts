/**
 * Payment + zero-payable transport wrappers (IMP-025 / D-360).
 *
 * Thin `/api/v1/*` client only. No Payment business rules.
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type {
  CommercePayment,
  CommercePaymentMethodIntent,
  CommercePaymentStartResult,
  CommercePaymentState,
  CommerceZeroPayableResult,
} from "./types";

type StartEnvelope = Readonly<{ ok: true }> & CommercePaymentStartResult;
type PaymentEnvelope = Readonly<{ ok: true; payment: CommercePayment }>;
type StateEnvelope = Readonly<{ ok: true; state: CommercePaymentState }>;
type ZeroEnvelope = Readonly<{ ok: true }> & CommerceZeroPayableResult;

export async function startPayment(input: {
  checkoutId: string;
  expectedCheckoutRevision: string;
  paymentMethodIntent: CommercePaymentMethodIntent;
  idempotencyKey: string;
}): Promise<CommerceHttpResult<CommercePaymentStartResult>> {
  const result = await commerceRequest<StartEnvelope>("/api/v1/payments", {
    method: "POST",
    body: {
      checkoutId: input.checkoutId,
      expectedCheckoutRevision: input.expectedCheckoutRevision,
      paymentMethodIntent: input.paymentMethodIntent,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (!result.ok) return result;
  if (result.data.kind !== "payment_started" || !result.data.payment) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return {
    ok: true,
    status: result.status,
    data: {
      kind: "payment_started",
      payment: result.data.payment,
      attempt: result.data.attempt,
      checkoutId: result.data.checkoutId,
      checkoutRevision: result.data.checkoutRevision,
      ...(result.data.clientAction ? { clientAction: result.data.clientAction } : {}),
    },
  };
}

export async function retryPayment(input: {
  paymentId: string;
  expectedCheckoutRevision: string;
  paymentMethodIntent: CommercePaymentMethodIntent;
  idempotencyKey: string;
}): Promise<CommerceHttpResult<CommercePaymentStartResult>> {
  const result = await commerceRequest<StartEnvelope>(
    `/api/v1/payments/${input.paymentId}/retry`,
    {
      method: "POST",
      body: {
        expectedCheckoutRevision: input.expectedCheckoutRevision,
        paymentMethodIntent: input.paymentMethodIntent,
        idempotencyKey: input.idempotencyKey,
      },
    },
  );
  if (!result.ok) return result;
  if (result.data.kind !== "payment_started" || !result.data.payment) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return {
    ok: true,
    status: result.status,
    data: {
      kind: "payment_started",
      payment: result.data.payment,
      attempt: result.data.attempt,
      checkoutId: result.data.checkoutId,
      checkoutRevision: result.data.checkoutRevision,
      ...(result.data.clientAction ? { clientAction: result.data.clientAction } : {}),
    },
  };
}

export async function getPayment(
  paymentId: string,
): Promise<CommerceHttpResult<{ payment: CommercePayment }>> {
  const result = await commerceRequest<PaymentEnvelope>(`/api/v1/payments/${paymentId}`, {
    method: "GET",
  });
  if (!result.ok) return result;
  if (!result.data.payment) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { payment: result.data.payment } };
}

export async function getPaymentState(
  paymentId: string,
): Promise<CommerceHttpResult<{ state: CommercePaymentState }>> {
  const result = await commerceRequest<StateEnvelope>(`/api/v1/payments/${paymentId}/state`, {
    method: "GET",
  });
  if (!result.ok) return result;
  if (!result.data.state) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { state: result.data.state } };
}

export async function submitPaymentClientEvidence(input: {
  paymentId: string;
  kind: string;
  payload: Readonly<Record<string, string>>;
}): Promise<CommerceHttpResult<{ state: CommercePaymentState }>> {
  const result = await commerceRequest<StateEnvelope>(
    `/api/v1/payments/${input.paymentId}/client-evidence`,
    {
      method: "POST",
      body: {
        kind: input.kind,
        payload: input.payload,
      },
    },
  );
  if (!result.ok) return result;
  if (!result.data.state) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { state: result.data.state } };
}

export async function completeZeroPayableCheckout(input: {
  checkoutId: string;
  expectedCheckoutRevision: string;
  idempotencyKey: string;
}): Promise<CommerceHttpResult<CommerceZeroPayableResult>> {
  const result = await commerceRequest<ZeroEnvelope>(
    `/api/v1/checkouts/${input.checkoutId}/complete-zero-payable`,
    {
      method: "POST",
      body: {
        expectedCheckoutRevision: input.expectedCheckoutRevision,
        idempotencyKey: input.idempotencyKey,
      },
    },
  );
  if (!result.ok) return result;
  if (result.data.kind !== "zero_payable_completed") {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return {
    ok: true,
    status: result.status,
    data: {
      kind: "zero_payable_completed",
      checkoutId: result.data.checkoutId,
      checkoutRevision: result.data.checkoutRevision,
      snapshotId: result.data.snapshotId,
    },
  };
}
