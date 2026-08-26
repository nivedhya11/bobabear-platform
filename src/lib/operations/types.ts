/**
 * Operations list projection types (IMP-030).
 *
 * Mirrors the accepted IMP-029 list envelope. Dates arrive as ISO strings over HTTP.
 */

export const WORKFORCE_ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "FULFILLED",
  "CANCELLED",
] as const;

export type WorkforceOrderStatus = (typeof WORKFORCE_ORDER_STATUSES)[number];

export type OperationsOrderMoney = Readonly<{
  grandTotalMinor: string;
  currency: string;
}>;

export type OperationsOutletSummary = Readonly<{
  outletId: string;
  brandId: string;
  code: string;
  name: string;
}>;

export type OperationsOrderSummary = Readonly<{
  orderId: string;
  orderNumber: string;
  status: WorkforceOrderStatus | string;
  revision: string;
  createdAt: string;
  acceptedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  money: OperationsOrderMoney;
  outlet: OperationsOutletSummary;
}>;

export type ListWorkforceOrdersInput = Readonly<{
  orderNumber?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  brandId?: string;
  outletId?: string;
  cursor?: string;
  limit?: number;
}>;
