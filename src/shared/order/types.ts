/**
 * Order domain types (IMP-023).
 */

import type {
  OrderCancellationReasonCode,
  OrderCartFinalizationDisposition,
  OrderCustomerPaymentSatisfaction,
  OrderMaterializationDisposition,
  OrderPaymentProvenanceKind,
  OrderRecoveryDisposition,
  OrderStatus,
} from "./constants";
import type { OrderMoneySummary } from "./money-summary";

export type OrderPolicy = Readonly<{
  /** Bounded Order-number collision retries before fail-closed. */
  orderNumberMaxAttempts: number;
  /** Bounded recovery discovery batch size. */
  recoveryBatchSize: number;
}>;

export type OrderClock = Readonly<{
  now: () => Date;
}>;

/** Internal Order aggregate (not a public transport projection). */
export type Order = Readonly<{
  id: string;
  orderNumber: string;
  checkoutId: string;
  checkoutSnapshotId: string;
  paymentProvenanceKind: OrderPaymentProvenanceKind;
  paymentId: string | null;
  status: OrderStatus;
  revision: bigint;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  acceptedByWorkforceUserId: string | null;
  fulfilledAt: Date | null;
  fulfilledByWorkforceUserId: string | null;
  cancelledAt: Date | null;
  cancelledByWorkforceUserId: string | null;
  cancellationReasonCode: OrderCancellationReasonCode | null;
}>;

export type OrderMoney = Readonly<{
  /** Exact integer paise as decimal string. */
  grandTotalMinor: string;
  currency: "INR";
}>;

export type OrderOutletSummary = Readonly<{
  outletId: string;
  brandId: string;
  code: string;
  name: string;
}>;

export type OrderDestinationProjection = Readonly<{
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

export type OrderLineProjection = Readonly<{
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

export type CustomerOrderSummary = Readonly<{
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  revision: string;
  createdAt: Date;
  money: OrderMoney;
  paymentSatisfaction: OrderCustomerPaymentSatisfaction;
  outlet: OrderOutletSummary;
}>;

export type CustomerOrderDetail = CustomerOrderSummary &
  Readonly<{
    updatedAt: Date;
    acceptedAt: Date | null;
    fulfilledAt: Date | null;
    cancelledAt: Date | null;
    cancellationReasonCode: OrderCancellationReasonCode | null;
    destination: OrderDestinationProjection;
    lines: readonly OrderLineProjection[];
    moneySummary: OrderMoneySummary;
    delivery: Readonly<{
      statusLabel: string;
      providerDisplayName: string | null;
      trackingUrl: string | null;
      lastUpdatedAt: Date;
    }> | null;
  }>;

export type WorkforceOrderSummary = Readonly<{
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  revision: string;
  createdAt: Date;
  acceptedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  money: OrderMoney;
  outlet: OrderOutletSummary;
}>;

export type WorkforceOrderDetail = WorkforceOrderSummary &
  Readonly<{
    updatedAt: Date;
    paymentProvenanceKind: OrderPaymentProvenanceKind;
    acceptedByWorkforceUserId: string | null;
    fulfilledByWorkforceUserId: string | null;
    cancelledByWorkforceUserId: string | null;
    cancellationReasonCode: OrderCancellationReasonCode | null;
    destination: OrderDestinationProjection;
    lines: readonly OrderLineProjection[];
  }>;

export type OrderMutationResult = Readonly<{
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  revision: string;
  updatedAt: Date;
  acceptedAt?: Date | null;
  fulfilledAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReasonCode?: OrderCancellationReasonCode | null;
}>;

export type OrderMaterializationResult = Readonly<{
  disposition: OrderMaterializationDisposition;
  order: Order;
  cartFinalization: OrderCartFinalizationDisposition | null;
}>;

export type OrderRecoveryCursor = Readonly<{
  lastCheckoutUpdatedAt: Date;
  lastCheckoutId: string;
}>;

export type OrderRecoveryItemResult = Readonly<{
  checkoutId: string;
  disposition: OrderRecoveryDisposition;
  orderId?: string;
  orderNumber?: string;
}>;

export type OrderRecoveryBatchResult = Readonly<{
  results: readonly OrderRecoveryItemResult[];
  nextCursor: OrderRecoveryCursor | null;
}>;

export type AcceptOrderInput = Readonly<{
  orderId: string;
  expectedOrderRevision: bigint;
}>;

export type FulfilOrderInput = Readonly<{
  orderId: string;
  expectedOrderRevision: bigint;
}>;

export type CancelOrderInput = Readonly<{
  orderId: string;
  expectedOrderRevision: bigint;
  cancellationReasonCode: OrderCancellationReasonCode;
}>;

export type GetCustomerOrderInput = Readonly<{
  orderId: string;
}>;

export type ListCustomerOrdersInput = Readonly<{
  cursor?: string;
  limit?: number;
}>;

export type GetWorkforceOrderInput = Readonly<{
  orderId: string;
}>;

export type SearchWorkforceOrdersInput = Readonly<{
  orderNumber?: string;
  status?: OrderStatus;
  createdFrom?: Date;
  createdTo?: Date;
  brandId?: string;
  outletId?: string;
  cursor?: string;
  limit?: number;
}>;

export type RecoverMissingOrdersBatchInput = Readonly<{
  cursor?: OrderRecoveryCursor;
}>;
