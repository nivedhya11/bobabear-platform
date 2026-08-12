/**
 * Workforce Order reads / search (IMP-023).
 */

import {
  OrderError,
  decodeOrderListCursor,
  encodeOrderListCursor,
  parseGetWorkforceOrderInput,
  parseSearchWorkforceOrdersInput,
  type WorkforceOrderDetail,
  type WorkforceOrderSummary,
} from "../../shared/order";
import { findOutletById } from "../organization/outlets";
import type { Persistence } from "../persistence/types";
import {
  loadFullSnapshotForOrder,
  loadSnapshotRowForOrder,
} from "./adapters/checkout";
import {
  authorizeOrderOutletAccess,
  requireOrderCapability,
  requireOrderWorkforceActor,
  type WorkforceActor,
} from "./authorize";
import {
  outletSummaryFromOutlet,
  toWorkforceOrderDetail,
  toWorkforceOrderSummary,
} from "./projections";
import {
  findOrderById,
  mapOrderRow,
  searchOrdersForWorkforce,
} from "./repository";
import { outletsTable } from "../../platform/database/schema/organizations";
import { and, eq } from "drizzle-orm";
import { requireAuthorization } from "../access-control/authorize";
import { AuthorizationError } from "../access-control/errors";

async function listAuthorizedOutletIds(
  persistence: Persistence,
  actor: WorkforceActor,
  narrow: { brandId?: string; outletId?: string },
): Promise<readonly string[]> {
  return persistence.withContext(async (ctx) => {
    await requireOrderCapability(ctx, actor, "order.read");

    if (narrow.outletId) {
      await authorizeOrderOutletAccess(
        ctx,
        actor,
        narrow.outletId,
        "order.read",
      );
      return [narrow.outletId];
    }

    const conditions = [eq(outletsTable.status, "active")];
    if (narrow.brandId) {
      conditions.push(eq(outletsTable.brandId, narrow.brandId));
    }
    const candidates = await ctx.db
      .select()
      .from(outletsTable)
      .where(and(...conditions));

    const permitted: string[] = [];
    for (const outlet of candidates) {
      try {
        await requireAuthorization(ctx, {
          actor,
          permission: "order.read",
          resource: {
            type: "outlet",
            brandId: outlet.brandId,
            organizationId: outlet.organizationId,
            territoryId: outlet.territoryId,
            outletId: outlet.id,
          },
        });
        permitted.push(outlet.id);
      } catch (error) {
        if (error instanceof AuthorizationError) continue;
        throw error;
      }
    }
    return permitted;
  });
}

export async function getWorkforceOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<WorkforceOrderDetail> {
  const workforce = requireOrderWorkforceActor(actor);
  const parsed = parseGetWorkforceOrderInput(input);

  return persistence.withContext(async (ctx) => {
    await requireOrderCapability(ctx, workforce, "order.read");
    const row = await findOrderById(ctx, parsed.orderId);
    if (!row) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const snapshotRow = await loadSnapshotRowForOrder(
      ctx,
      row.checkoutSnapshotId,
    );
    if (!snapshotRow) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    await authorizeOrderOutletAccess(
      ctx,
      workforce,
      snapshotRow.selectedOutletId,
      "order.read",
    );
    const snapshot = await loadFullSnapshotForOrder(
      ctx,
      row.checkoutSnapshotId,
    );
    const outlet = await findOutletById(ctx, snapshotRow.selectedOutletId);
    if (!snapshot || !outlet) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    return toWorkforceOrderDetail(
      mapOrderRow(row),
      outletSummaryFromOutlet(outlet),
      snapshot,
    );
  });
}

export async function searchWorkforceOrders(
  persistence: Persistence,
  actor: unknown,
  input: unknown = {},
): Promise<
  Readonly<{
    items: readonly WorkforceOrderSummary[];
    nextCursor: string | null;
  }>
> {
  const workforce = requireOrderWorkforceActor(actor);
  const parsed = parseSearchWorkforceOrdersInput(input);
  const limit = parsed.limit ?? 20;
  const cursor = parsed.cursor
    ? decodeOrderListCursor(parsed.cursor)
    : undefined;

  const permittedOutletIds = await listAuthorizedOutletIds(persistence, workforce, {
    ...(parsed.brandId ? { brandId: parsed.brandId } : {}),
    ...(parsed.outletId ? { outletId: parsed.outletId } : {}),
  });

  return persistence.withContext(async (ctx) => {
    const rows = await searchOrdersForWorkforce(ctx, {
      limit: limit + 1,
      permittedOutletIds,
      ...(parsed.orderNumber ? { orderNumber: parsed.orderNumber } : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.createdFrom ? { createdFrom: parsed.createdFrom } : {}),
      ...(parsed.createdTo ? { createdTo: parsed.createdTo } : {}),
      ...(parsed.brandId ? { brandId: parsed.brandId } : {}),
      ...(parsed.outletId ? { outletId: parsed.outletId } : {}),
      ...(cursor ? { cursor } : {}),
    });
    const page = rows.slice(0, limit);
    const items: WorkforceOrderSummary[] = [];
    for (const entry of page) {
      const outlet = await findOutletById(ctx, entry.selectedOutletId);
      if (!outlet) continue;
      items.push(
        toWorkforceOrderSummary(
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
