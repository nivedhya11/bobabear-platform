/**
 * Shared fixtures for Refund tests (IMP-027).
 */
import { sql } from "drizzle-orm";

import { insertProviderReferences } from "../../../src/server/payment/repository";
import { RAZORPAY_PAYMENT_REFERENCE_KIND } from "../../../src/shared/payment";
import { getApplicationPersistence } from "../../../src/server/persistence";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "./cart-fixtures";
import {
  withCompletedPositiveOrderHarness,
  type CompletedOrderHarness,
} from "./order-fixtures";

export type RefundReadyHarness = CompletedOrderHarness &
  Readonly<{
    providerPaymentId: string;
  }>;

export async function ensureProviderPaymentReference(
  harness: CompletedOrderHarness,
  providerPaymentId = `pay_fake_${harness.paymentId}`,
): Promise<string> {
  if (!harness.paymentId) {
    throw new Error("Refund harness requires a Payment id.");
  }
  const existing = await harness.persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute<{ value: string }>(sql`
      select reference_value as value
      from app.payment_provider_references
      where payment_id = ${harness.paymentId}::uuid
        and provider = ${harness.provider.name}
        and reference_kind = ${RAZORPAY_PAYMENT_REFERENCE_KIND}
      limit 1
    `);
    return rows.rows[0]?.value ?? null;
  });
  if (existing) return existing;
  await harness.persistence.transaction((tx) =>
    insertProviderReferences(tx, {
      paymentId: harness.paymentId!,
      attemptId: null,
      provider: harness.provider.name,
      references: [
        { kind: RAZORPAY_PAYMENT_REFERENCE_KIND, value: providerPaymentId },
      ],
      now: new Date(),
    }),
  );
  return providerPaymentId;
}

export async function withRefundReadyHarness<T>(
  fn: (harness: RefundReadyHarness) => Promise<T>,
): Promise<T> {
  return withCompletedPositiveOrderHarness(async (harness) => {
    const providerPaymentId = await ensureProviderPaymentReference(harness);
    harness.provider.setRefundOutcome("processed");
    return fn({ ...harness, providerPaymentId });
  });
}

export function secondPersistence(connectionString: string) {
  const handle = getApplicationPersistence(applicationConfig(connectionString));
  trackPersistenceHandle(handle);
  return handle;
}
