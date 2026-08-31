/**
 * Customer Order reads (IMP-023).
 */

import {
  OrderError,
  decodeOrderListCursor,
  encodeOrderListCursor,
  parseGetCustomerOrderInput,
  parseListCustomerOrdersInput,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
} from "../../shared/order";
import { requireCustomerActor } from "../cart/actor";
import { CartError } from "../../shared/cart";
import { findOutletById } from "../organization/outlets";
import type { Persistence } from "../persistence/types";
import {
  loadFullSnapshotForOrder,
  peekCheckoutForOrder,
} from "./adapters/checkout";
import {
  outletSummaryFromOutlet,
  toCustomerOrderDetail,
  toCustomerOrderSummary,
} from "./projections";
import { buildCustomerDeliveryProjection } from "../delivery/customer-projection";
import {
  findOrderById,
  listOrdersForCustomer,
  mapOrderRow,
} from "./repository";

function mapCustomerAuthError(error: unknown): never {
  if (error instanceof CartError && error.code === "CUSTOMER_AUTH_REQUIRED") {
    throw new OrderError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer authentication is required.",
    );
  }
  throw error;
}

export async function getCustomerOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<CustomerOrderDetail> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseGetCustomerOrderInput(input);

  return persistence.withContext(async (ctx) => {
    const row = await findOrderById(ctx, parsed.orderId);
    if (!row) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const checkout = await peekCheckoutForOrder(ctx, row.checkoutId);
    if (!checkout || checkout.customerAuthUserId !== customer.authUserId) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const snapshot = await loadFullSnapshotForOrder(
      ctx,
      row.checkoutSnapshotId,
    );
    if (!snapshot) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const outlet = await findOutletById(ctx, snapshot.selectedOutletId);
    if (!outlet) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const deliveryProjection = await buildCustomerDeliveryProjection(ctx, parsed.orderId);
    return toCustomerOrderDetail(
      mapOrderRow(row),
      outletSummaryFromOutlet(outlet),
      snapshot,
      deliveryProjection,
    );
  });
}

export async function listCustomerOrders(
  persistence: Persistence,
  actor: unknown,
  input: unknown = {},
): Promise<
  Readonly<{
    items: readonly CustomerOrderSummary[];
    nextCursor: string | null;
  }>
> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseListCustomerOrdersInput(input);
  const limit = parsed.limit ?? 20;
  const cursor = parsed.cursor
    ? decodeOrderListCursor(parsed.cursor)
    : undefined;

  return persistence.withContext(async (ctx) => {
    const rows = await listOrdersForCustomer(ctx, {
      customerAuthUserId: customer.authUserId,
      limit: limit + 1,
      ...(cursor ? { cursor } : {}),
    });
    const page = rows.slice(0, limit);
    const items: CustomerOrderSummary[] = [];
    for (const entry of page) {
      const outlet = await findOutletById(ctx, entry.selectedOutletId);
      if (!outlet) continue;
      items.push(
        toCustomerOrderSummary(
          mapOrderRow(entry.order),
          outletSummaryFromOutlet(outlet),
          {
            grandTotalPaise: entry.grandTotalPaise,
            currency: entry.currency,
          },
        ),
      );
    }
    const next =
      rows.length > limit
        ? encodeOrderListCursor(
            page[page.length - 1]!.order.createdAt,
            page[page.length - 1]!.order.id,
          )
        : null;
    return Object.freeze({
      items: Object.freeze(items),
      nextCursor: next,
    });
  });
}
