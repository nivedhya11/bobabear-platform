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

export type OperationsOrderDestination = Readonly<{
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  label: string | null;
}>;

export type OperationsOrderLine = Readonly<{
  productName: string;
  variantName: string;
  quantity: number;
  lineTotalMinor: string;
  modifiers: readonly Readonly<{
    groupName: string;
    optionName: string;
    quantity: number;
  }>[];
}>;

export type OperationsOrderDetail = OperationsOrderSummary & Readonly<{
  updatedAt: string;
  paymentProvenanceKind: string;
  acceptedByWorkforceUserId: string | null;
  fulfilledByWorkforceUserId: string | null;
  cancelledByWorkforceUserId: string | null;
  cancellationReasonCode: string | null;
  destination: OperationsOrderDestination;
  lines: readonly OperationsOrderLine[];
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

export const OPERATIONS_LIFECYCLE_ACTIONS = ["ACCEPT", "FULFIL", "CANCEL"] as const;

export type OperationsLifecycleAction = (typeof OPERATIONS_LIFECYCLE_ACTIONS)[number];

/** Exact accepted Operations cancellation reason codes (presentation labels are separate). */
export const OPERATIONS_CANCELLATION_REASON_CODES = [
  "CUSTOMER_REQUESTED",
  "ITEM_UNAVAILABLE",
  "OUTLET_UNABLE_TO_FULFIL",
  "OPERATIONAL_DISRUPTION",
  "BUSINESS_DECISION",
] as const;

export type OperationsCancellationReasonCode =
  (typeof OPERATIONS_CANCELLATION_REASON_CODES)[number];

export const OPERATIONS_CANCELLATION_REASON_LABELS: Readonly<
  Record<OperationsCancellationReasonCode, string>
> = {
  CUSTOMER_REQUESTED: "Customer requested",
  ITEM_UNAVAILABLE: "Item unavailable",
  OUTLET_UNABLE_TO_FULFIL: "Outlet unable to fulfil",
  OPERATIONAL_DISRUPTION: "Operational disruption",
  BUSINESS_DECISION: "Business decision",
};

/** Server-confirmed mutation projection (slim; dates are ISO strings over HTTP). */
export type OperationsOrderMutationResult = Readonly<{
  orderId: string;
  orderNumber: string;
  status: string;
  revision: string;
  updatedAt: string;
  acceptedAt?: string | null;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  cancellationReasonCode?: string | null;
}>;
