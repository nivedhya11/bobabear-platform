/**
 * Operations Refund client (IMP-036D).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";

export type OperationsRefundBalance = Readonly<{
  capturedAmountPaise: string;
  processedRefundedAmountPaise: string;
  reservedAmountPaise: string;
  remainingRefundableAmountPaise: string;
  fullyRefunded: boolean;
}>;

export type OperationsRefundItem = Readonly<{
  refundId: string;
  amountPaise: string;
  currency: string;
  status: string;
  reason: string;
  operatorNote: string | null;
  createdAt: string;
  acceptedAt: string;
  pendingAt: string | null;
  indeterminateAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
  recoveryHint: string | null;
}>;

type ListEnvelope = Readonly<{
  ok: true;
  paymentStatus: string;
  balance: OperationsRefundBalance;
  refunds: readonly OperationsRefundItem[];
}>;

type CreateEnvelope = Readonly<{
  ok: true;
  paymentStatus: string;
  balance: OperationsRefundBalance;
  refund: OperationsRefundItem;
}>;

export function createRefundRequestId(): string {
  return crypto.randomUUID();
}

export function refundStatusLabel(status: string): string {
  if (status === "ACCEPTED") return "Authorized — awaiting provider processing";
  if (status === "PENDING") return "Provider processing";
  if (status === "INDETERMINATE") return "Refund status is being verified";
  if (status === "PROCESSED") return "Refund completed";
  if (status === "FAILED") return "Refund did not complete";
  return status;
}

export async function getOrderRefunds(
  orderId: string,
): Promise<
  OperationsHttpResult<{
    paymentStatus: string;
    balance: OperationsRefundBalance;
    refunds: readonly OperationsRefundItem[];
  }>
> {
  const result = await operationsRequest<ListEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}/refunds`,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    status: result.status,
    data: {
      paymentStatus: result.data.paymentStatus,
      balance: result.data.balance,
      refunds: result.data.refunds,
    },
  };
}

export async function createOrderRefund(
  orderId: string,
  input: Readonly<{
    refundRequestId: string;
    amountPaise: string;
    reason: string;
    operatorNote?: string;
  }>,
): Promise<
  OperationsHttpResult<{
    paymentStatus: string;
    balance: OperationsRefundBalance;
    refund: OperationsRefundItem;
  }>
> {
  const result = await operationsRequest<CreateEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "POST",
      body: {
        refundRequestId: input.refundRequestId,
        amountPaise: input.amountPaise,
        reason: input.reason,
        ...(input.operatorNote !== undefined && input.operatorNote.length > 0
          ? { operatorNote: input.operatorNote }
          : {}),
      },
    },
  );
  if (!result.ok) return result;
  return {
    ok: true,
    status: result.status,
    data: {
      paymentStatus: result.data.paymentStatus,
      balance: result.data.balance,
      refund: result.data.refund,
    },
  };
}
