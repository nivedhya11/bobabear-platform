/**
 * Operations Refund HTTP routes (IMP-036D).
 *
 * Provider-free reservation only. No PaymentProvider / Razorpay composition.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { WorkforceAuthRuntime } from "../../auth/workforce";
import type { Persistence } from "../../persistence";
import { getOrderRefundSupport, reserveOrderRefund } from "../../refund";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapRefundOperationsError } from "./refund-error-map";

export type RefundRoute =
  | Readonly<{ kind: "list_refunds"; orderId: string }>
  | Readonly<{ kind: "create_refund"; orderId: string }>;

function serializeBigInt(value: bigint): string {
  return value.toString(10);
}

function toSafeRefundProjection(refund: {
  id: string;
  amountPaise: bigint;
  currency: string;
  status: string;
  reason: string;
  operatorNote: string | null;
  createdAt: Date;
  acceptedAt: Date;
  pendingAt: Date | null;
  indeterminateAt: Date | null;
  processedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
}): Record<string, unknown> {
  return {
    refundId: refund.id,
    amountPaise: serializeBigInt(refund.amountPaise),
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    operatorNote: refund.operatorNote,
    createdAt: refund.createdAt.toISOString(),
    acceptedAt: refund.acceptedAt.toISOString(),
    pendingAt: refund.pendingAt?.toISOString() ?? null,
    indeterminateAt: refund.indeterminateAt?.toISOString() ?? null,
    processedAt: refund.processedAt?.toISOString() ?? null,
    failedAt: refund.failedAt?.toISOString() ?? null,
    recoveryHint:
      refund.status === "INDETERMINATE"
        ? "Refund status is being verified."
        : refund.status === "ACCEPTED"
          ? "Refund has been authorized and is awaiting provider processing."
          : refund.status === "FAILED"
            ? refund.failureReason
              ? "Refund did not complete."
              : "Refund did not complete."
            : null,
  };
}

function toSafeBalanceProjection(balance: {
  capturedAmount: bigint;
  successfulRefundedAmount: bigint;
  reservedRefundAmount: bigint;
  remainingRefundableAmount: bigint;
  fullyRefunded: boolean;
}): Record<string, unknown> {
  return {
    capturedAmountPaise: serializeBigInt(balance.capturedAmount),
    processedRefundedAmountPaise: serializeBigInt(balance.successfulRefundedAmount),
    reservedAmountPaise: serializeBigInt(balance.reservedRefundAmount),
    remainingRefundableAmountPaise: serializeBigInt(balance.remainingRefundableAmount),
    fullyRefunded: balance.fullyRefunded,
  };
}

export function classifyRefundRoute(pathname: string): RefundRoute | null {
  const segments = pathname.split("/");
  if (segments.slice(1, 5).join("/") !== "api/operations/v1/orders" || !segments[5]) {
    return null;
  }
  if (segments.length === 7 && segments[6] === "refunds") {
    return { kind: "list_refunds", orderId: segments[5] };
  }
  return null;
}

export async function handleRefundRoute(
  req: IncomingMessage,
  route: RefundRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const operation = route.kind;
  const allowedMethod = route.kind === "list_refunds" ? "GET" : "POST";
  // create_refund is classified by the router as POST on the same path.
  if (route.kind === "list_refunds" && method === "POST") {
    return handleCreateRefund(req, route.orderId, deps, requestId);
  }
  if (method !== allowedMethod) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "REFUND_INVALID_INPUT", requestId },
    };
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    const support = await getOrderRefundSupport(deps.persistence, principal, route.orderId);
    return {
      status: 200,
      operation,
      code: "OK",
      body: {
        ok: true,
        paymentStatus: support.paymentStatus,
        balance: toSafeBalanceProjection(support.balance),
        refunds: support.refunds.map(toSafeRefundProjection),
      },
    };
  } catch (error) {
    const mapped = mapRefundOperationsError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body,
    };
  }
}

async function handleCreateRefund(
  req: IncomingMessage,
  orderId: string,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const operation = "create_refund";
  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    const body = await readOperationsJsonObjectBody(req);
    if (!body.ok) {
      return {
        status: 400,
        operation,
        code: "REFUND_INVALID_INPUT",
        body: { ok: false, code: "REFUND_INVALID_INPUT", requestId },
      };
    }
    const result = await reserveOrderRefund(deps.persistence, principal, {
      ...body.value,
      orderId,
    });
    return {
      status: 200,
      operation,
      code: "OK",
      body: {
        ok: true,
        paymentStatus: result.paymentStatus,
        balance: toSafeBalanceProjection(result.balance),
        refund: toSafeRefundProjection(result.refund),
      },
    };
  } catch (error) {
    const mapped = mapRefundOperationsError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body,
    };
  }
}
