/**
 * Safe Order projections (IMP-023).
 */

import type { CheckoutSnapshot } from "../../shared/checkout";
import {
  serializeMoneyMinor,
  serializeOrderRevision,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
  type Order,
  type OrderLineProjection,
  type OrderMutationResult,
  type OrderOutletSummary,
  type WorkforceOrderDetail,
  type WorkforceOrderSummary,
} from "../../shared/order";
import { moneySummaryFromSnapshot } from "../../shared/order/money-summary";

function paymentSatisfaction(order: Order) {
  return order.paymentProvenanceKind === "PAYMENT"
    ? ("PAID" as const)
    : ("NO_PAYMENT_REQUIRED" as const);
}

function moneyFromSnapshot(snapshot: {
  grandTotalPaise: bigint;
  currency: string;
}) {
  return Object.freeze({
    grandTotalMinor: serializeMoneyMinor(snapshot.grandTotalPaise),
    currency: "INR" as const,
  });
}

function destinationFromSnapshot(snapshot: CheckoutSnapshot) {
  const dest = snapshot.destination;
  return Object.freeze({
    recipientName: dest.recipientName,
    recipientPhone: dest.recipientPhone,
    addressLine1: dest.addressLine1,
    addressLine2: dest.addressLine2,
    landmark: dest.landmark,
    locality: dest.locality,
    city: dest.city,
    stateCode: dest.stateCode,
    postalCode: dest.postalCode,
    label: dest.label,
  });
}

function linesFromSnapshot(
  snapshot: CheckoutSnapshot,
): readonly OrderLineProjection[] {
  return Object.freeze(
    snapshot.lines.map((line) =>
      Object.freeze({
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        lineTotalMinor: serializeMoneyMinor(line.lineTotalPaise),
        modifiers: Object.freeze(
          line.modifiers.map((m) =>
            Object.freeze({
              groupName: m.groupName,
              optionName: m.optionName,
              quantity: m.quantity,
            }),
          ),
        ),
      }),
    ),
  );
}

export function toCustomerOrderSummary(
  order: Order,
  outlet: OrderOutletSummary,
  snapshot: { grandTotalPaise: bigint; currency: string },
): CustomerOrderSummary {
  return Object.freeze({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    revision: serializeOrderRevision(order.revision),
    createdAt: order.createdAt,
    money: moneyFromSnapshot(snapshot),
    paymentSatisfaction: paymentSatisfaction(order),
    outlet,
  });
}

export function toCustomerOrderDetail(
  order: Order,
  outlet: OrderOutletSummary,
  snapshot: CheckoutSnapshot,
  delivery: CustomerOrderDetail["delivery"] = null,
): CustomerOrderDetail {
  return Object.freeze({
    ...toCustomerOrderSummary(order, outlet, snapshot),
    updatedAt: order.updatedAt,
    acceptedAt: order.acceptedAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    cancellationReasonCode: order.cancellationReasonCode,
    destination: destinationFromSnapshot(snapshot),
    lines: linesFromSnapshot(snapshot),
    moneySummary: moneySummaryFromSnapshot(snapshot),
    delivery,
  });
}

export function toWorkforceOrderSummary(
  order: Order,
  outlet: OrderOutletSummary,
  snapshot: { grandTotalPaise: bigint; currency: string },
): WorkforceOrderSummary {
  return Object.freeze({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    revision: serializeOrderRevision(order.revision),
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    money: moneyFromSnapshot(snapshot),
    outlet,
  });
}

export function toWorkforceOrderDetail(
  order: Order,
  outlet: OrderOutletSummary,
  snapshot: CheckoutSnapshot,
): WorkforceOrderDetail {
  return Object.freeze({
    ...toWorkforceOrderSummary(order, outlet, snapshot),
    updatedAt: order.updatedAt,
    paymentProvenanceKind: order.paymentProvenanceKind,
    acceptedByWorkforceUserId: order.acceptedByWorkforceUserId,
    fulfilledByWorkforceUserId: order.fulfilledByWorkforceUserId,
    cancelledByWorkforceUserId: order.cancelledByWorkforceUserId,
    cancellationReasonCode: order.cancellationReasonCode,
    destination: destinationFromSnapshot(snapshot),
    lines: linesFromSnapshot(snapshot),
  });
}

export function toOrderMutationResult(order: Order): OrderMutationResult {
  const base: OrderMutationResult = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    revision: serializeOrderRevision(order.revision),
    updatedAt: order.updatedAt,
  };
  if (order.status === "FULFILLED") {
    return Object.freeze({
      ...base,
      acceptedAt: order.acceptedAt,
      fulfilledAt: order.fulfilledAt,
    });
  }
  if (order.status === "CANCELLED") {
    return Object.freeze({
      ...base,
      acceptedAt: order.acceptedAt,
      cancelledAt: order.cancelledAt,
      cancellationReasonCode: order.cancellationReasonCode,
    });
  }
  if (order.status === "ACCEPTED") {
    return Object.freeze({ ...base, acceptedAt: order.acceptedAt });
  }
  return Object.freeze(base);
}

export function outletSummaryFromOutlet(outlet: {
  id: string;
  brandId: string;
  code: string;
  name: string;
}): OrderOutletSummary {
  return Object.freeze({
    outletId: outlet.id,
    brandId: outlet.brandId,
    code: outlet.code,
    name: outlet.name,
  });
}
