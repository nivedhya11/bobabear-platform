import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { notificationRequestsTable } from "../../platform/database/schema/notifications";
import { outboxEventsTable } from "../../platform/database/schema/outbox-events";
import { paymentProviderEventInboxTable } from "../../platform/database/schema/payment-provider-event-inbox";
import { refundsTable } from "../../platform/database/schema/refund";
import { NOTIFICATION_OUTBOX_EVENT_TYPES } from "../notifications/outbox-events";
import type { Persistence } from "./types";

export type OperationalQueueBacklog = Readonly<{
  notificationOutboxPending: number;
  notificationReviewRequired: number;
  paymentInboxPending: number;
  paymentInboxProcessing: number;
  refundReconciliationBacklog: number;
}>;

async function countWhere(
  persistence: Persistence,
  query: (ctx: Parameters<Parameters<Persistence["withContext"]>[0]>[0]) => Promise<number>,
): Promise<number> {
  return persistence.withContext(async (ctx) => query(ctx));
}

export async function loadOperationalQueueBacklog(
  persistence: Persistence,
): Promise<OperationalQueueBacklog> {
  const [
    notificationOutboxPending,
    notificationReviewRequired,
    paymentInboxPending,
    paymentInboxProcessing,
    refundReconciliationBacklog,
  ] = await Promise.all([
    countWhere(persistence, async (ctx) => {
      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(outboxEventsTable)
        .where(and(
          inArray(outboxEventsTable.eventType, [...NOTIFICATION_OUTBOX_EVENT_TYPES]),
          inArray(outboxEventsTable.status, ["pending", "processing"]),
        ));
      return rows[0]?.count ?? 0;
    }),
    countWhere(persistence, async (ctx) => {
      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationRequestsTable)
        .where(eq(notificationRequestsTable.status, "REVIEW_REQUIRED"));
      return rows[0]?.count ?? 0;
    }),
    countWhere(persistence, async (ctx) => {
      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(paymentProviderEventInboxTable)
        .where(eq(paymentProviderEventInboxTable.processingState, "pending"));
      return rows[0]?.count ?? 0;
    }),
    countWhere(persistence, async (ctx) => {
      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(paymentProviderEventInboxTable)
        .where(eq(paymentProviderEventInboxTable.processingState, "processing"));
      return rows[0]?.count ?? 0;
    }),
    countWhere(persistence, async (ctx) => {
      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(refundsTable)
        .where(inArray(refundsTable.status, ["ACCEPTED", "PENDING", "INDETERMINATE"]));
      return rows[0]?.count ?? 0;
    }),
  ]);

  return {
    notificationOutboxPending,
    notificationReviewRequired,
    paymentInboxPending,
    paymentInboxProcessing,
    refundReconciliationBacklog,
  };
}
