/**
 * D-357 customer Order status presentation only.
 * Does not invent kitchen or delivery states.
 */

export const CUSTOMER_ORDER_STATUSES = ["PLACED", "ACCEPTED", "FULFILLED", "CANCELLED"] as const;

export type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUSES)[number];

const LABELS: Readonly<Record<CustomerOrderStatus, string>> = Object.freeze({
  PLACED: "Order placed",
  ACCEPTED: "Order accepted",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
});

export function isCustomerOrderStatus(status: string): status is CustomerOrderStatus {
  return (CUSTOMER_ORDER_STATUSES as readonly string[]).includes(status);
}

export function orderStatusLabel(status: string): string {
  if (isCustomerOrderStatus(status)) return LABELS[status];
  return status;
}
