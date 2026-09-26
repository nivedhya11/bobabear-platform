/**
 * IMP-036I Tranche 5 — financial-document non-regression for Scheduled Orders.
 *
 * Uses the existing D-365 issuance and D-366 refund-correction paths.
 * Scheduling does not add a document type, formula, or statutory decision.
 */
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { financialDocumentsTable } from "../../src/platform/database/schema/financial-document";
import { ordersTable } from "../../src/platform/database/schema/order";
import { refundsTable } from "../../src/platform/database/schema/refund";
import { refundStatutoryDecisionsTable } from "../../src/platform/database/schema/refund-statutory-decision";
import {
  evaluateCheckout,
  listCheckoutScheduledWindows,
  setCheckoutDestination,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { insertNumberingSeries, issueReceiptVoucherForSucceededPayment } from "../../src/server/financial-document";
import { cancelCustomerScheduledOrder, cancelOrder } from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import { requestRefund } from "../../src/server/refund";
import {
  finalizeRefundStatutoryDecision,
  issueRefundStatutoryReversal,
} from "../../src/server/refund-statutory-decision";
import {
  saveOutletSchedulingProfile,
  updateBrandScheduledFulfilmentPolicy,
} from "../../src/server/scheduled-fulfilment/foundations";
import {
  deriveIndianFinancialYear,
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  type FinancialDocument,
} from "../../src/shared/financial-document";
import { taxExclusivePaise } from "../../src/shared/pricing/money";
import { mintCustomerSessionCookieHeader, withCustomerCommerceHttpService } from "../customer-commerce/support/service-harness";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import { checkoutOpts, withCheckoutReadyHarness } from "./support/checkout-fixtures";
import { seedTaxInvoiceWorkflowConfig } from "./support/financial-document-workflow-fixtures";
import {
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
} from "./support/order-fixtures";
import { ensureProviderPaymentReference } from "./support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const LIVE = { now: () => new Date() };
const FAR_WINDOW = (start: Date, now: Date) => start.getTime() - now.getTime() > 2 * 60 * 60 * 1000;

type Harness = Parameters<Parameters<typeof withCheckoutReadyHarness>[0]>[0];

function commercialSeal(document: FinancialDocument) {
  return {
    id: document.id,
    documentType: document.documentType,
    status: document.status,
    statutoryDocumentNumber: document.statutoryDocumentNumber,
    logicalIssuanceKey: document.logicalIssuanceKey,
    checkoutSnapshotId: document.checkoutSnapshotId,
    paymentId: document.paymentId,
    taxableTotalPaise: document.taxableTotalPaise.toString(),
    taxTotalPaise: document.taxTotalPaise.toString(),
    discountTotalPaise: document.discountTotalPaise.toString(),
    chargeTotalPaise: document.chargeTotalPaise.toString(),
    grandTotalPaise: document.grandTotalPaise.toString(),
    lines: document.lines.map((line) => ({
      description: line.description,
      unitPaise: line.unitPaise.toString(),
      taxableValuePaise: line.taxableValuePaise.toString(),
      taxComponents: line.taxComponents.map((tax) => ({
        taxType: tax.taxType,
        rateBps: tax.rateBps,
        taxableAmountPaise: tax.taxableAmountPaise.toString(),
        taxAmountPaise: tax.taxAmountPaise.toString(),
      })),
    })),
  };
}

async function purchasedCommercialTruth(persistence: Harness["persistence"], snapshotId: string) {
  const rows = await persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select fulfilment_mode,
             fulfilment_timing,
             scheduled_window_start_at,
             scheduled_window_end_at,
             scheduled_timezone,
             scheduled_cancellation_cutoff_minutes,
             base_paise::text as base_paise,
             charges_paise::text as charges_paise,
             promotion_discount_paise::text as promotion_discount_paise,
             taxable_paise::text as taxable_paise,
             tax_paise::text as tax_paise,
             grand_total_paise::text as grand_total_paise
      from app.checkout_snapshots
      where id = ${snapshotId}::uuid
    `);
    return result.rows;
  });
  return rows[0];
}

async function documentTypesForPayment(persistence: Harness["persistence"], paymentId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({ documentType: financialDocumentsTable.documentType })
      .from(financialDocumentsTable)
      .where(eq(financialDocumentsTable.paymentId, paymentId))
      .orderBy(financialDocumentsTable.documentType),
  );
  return rows.map((row) => row.documentType);
}

async function seedIssuer(h: Harness) {
  const seededAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const financialYear = deriveIndianFinancialYear(new Date());
  await seedTaxInvoiceWorkflowConfig(h.persistence, {
    brandId: h.actors.tree.brand.id,
    organizationId: h.actors.tree.orgA.id,
    legalEntityId: h.actors.tree.leA.id,
    financialYear,
    now: seededAt,
  });
  await h.persistence.transaction((tx) =>
    insertNumberingSeries(tx, {
      legalEntityId: h.actors.tree.leA.id,
      documentType: "REFUND_VOUCHER",
      financialYear,
      seriesCode: "RFV",
      prefix: "RFV/2627/",
      now: seededAt,
    }),
  );
}

async function scheduleDelivery(h: Harness) {
  await saveOutletSchedulingProfile(h.persistence, {
    outletId: h.actors.tree.outletA.id,
    pickupMinLeadMinutes: 30,
    deliveryMinLeadMinutes: 30,
    now: new Date(),
  });
  const opts = checkoutOpts(LIVE);
  const started = await startCheckout(h.persistence, h.actors.customerA, { cartId: h.cartId }, opts);
  const destination = await setCheckoutDestination(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: started.id,
      expectedCheckoutRevision: started.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
    },
    opts,
  );
  const listed = await listCheckoutScheduledWindows(
    h.persistence,
    h.actors.customerA,
    { checkoutId: destination.id },
    opts,
  );
  if (!("windows" in listed)) throw new Error("Scheduled windows were not listed.");
  const now = new Date();
  const window = listed.windows.find((candidate) => FAR_WINDOW(candidate.startAt, now));
  if (!window) throw new Error("No scheduled window matched the required boundary.");
  const timed = await setCheckoutFulfilmentTiming(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: destination.id,
      expectedCheckoutRevision: destination.revision,
      fulfilmentTiming: "SCHEDULED",
      scheduledWindowStartAt: window.startAt,
      scheduledWindowEndAt: window.endAt,
    },
    opts,
  );
  const ready = await evaluateCheckout(
    h.persistence,
    h.actors.customerA,
    { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
    opts,
  );
  return { ready, window };
}

async function purchasePositive(h: Harness, checkoutId: string, revision: bigint) {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  provider.setRefundOutcome("processed");
  const opts = paymentOpts(provider, LIVE);
  const started = await startPayment(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId,
      expectedCheckoutRevision: revision,
      paymentMethodIntent: "upi",
      idempotencyKey: newIdempotencyKey("tranche5-fd"),
    },
    opts,
  );
  await verifyAndProcessWebhook(
    h.persistence,
    provider,
    {
      executionIdentity: started.attempt.providerExecutionIdentity,
      outcome: "succeed",
      amountPaise: started.payment.expectedAmountPaise,
    },
    opts,
  );
  return {
    provider,
    paymentId: started.payment.id,
    amountPaise: started.payment.expectedAmountPaise,
  };
}

async function orderRow(persistence: Harness["persistence"], checkoutId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db.select().from(ordersTable).where(eq(ordersTable.checkoutId, checkoutId)),
  );
  const order = rows[0];
  if (!order) throw new Error("Order was not materialized.");
  return order;
}

function assertExistingReceipt(document: FinancialDocument, snapshotId: string, paymentId: string, taxablePaise: bigint) {
  expect(document.documentType).toBe("RECEIPT_VOUCHER");
  expect(FINANCIAL_DOCUMENT_STATUTORY_TYPES).toContain(document.documentType);
  expect(document.status).toBe("ISSUED");
  expect(document.logicalIssuanceKey).toBe(`payment:${paymentId}:RECEIPT_VOUCHER`);
  expect(document.checkoutSnapshotId).toBe(snapshotId);
  expect(document.paymentId).toBe(paymentId);
  expect(document.refundId).toBeNull();
  expect(document.priorFinancialDocumentId).toBeNull();
  expect(document.taxableTotalPaise).toBe(taxablePaise);
  expect(document.lines).toHaveLength(1);
  const line = document.lines[0]!;
  expect(line.taxableValuePaise).toBe(taxablePaise);
  expect(line.historicalCatalogItemId).toBe(snapshotId);
  let derivedTax = BigInt(0);
  for (const tax of line.taxComponents) {
    const expectedTax = taxExclusivePaise(taxablePaise, tax.rateBps);
    expect(tax.taxAmountPaise).toBe(expectedTax);
    expect(tax.taxableAmountPaise).toBe(taxablePaise);
    derivedTax += expectedTax;
  }
  expect(document.taxTotalPaise).toBe(derivedTax);
  expect(document.grandTotalPaise).toBe(taxablePaise + derivedTax);
}

async function issueExistingRefundVoucher(
  h: Harness,
  receipt: FinancialDocument,
  refundId: string,
) {
  const pending = await h.persistence.withContext((ctx) =>
    ctx.db
      .select({
        id: refundStatutoryDecisionsTable.id,
        status: refundStatutoryDecisionsTable.status,
        disposition: refundStatutoryDecisionsTable.disposition,
      })
      .from(refundStatutoryDecisionsTable)
      .where(eq(refundStatutoryDecisionsTable.refundId, refundId)),
  );
  expect(pending).toEqual([{ id: pending[0]?.id, status: "PENDING", disposition: null }]);
  const decisionId = pending[0]!.id;
  const now = new Date();
  const finalized = await finalizeRefundStatutoryDecision(h.persistence, {
    decisionId,
    actorKind: "workforce",
    actorId: h.actors.brandAdmin.id,
    now,
    disposition: "REFUND_VOUCHER",
    priorReceiptVoucherId: receipt.id,
    noSupplyAuthorityKind: "ORDER_CANCELLED",
    reversalScope: "FULL",
  });
  const issued = await issueRefundStatutoryReversal(h.persistence, {
    decisionId: finalized.id,
    now,
  });
  expect(issued.decision.status).toBe("ISSUED");
  expect(issued.decision.disposition).toBe("REFUND_VOUCHER");
  expect(issued.financialDocument.documentType).toBe("REFUND_VOUCHER");
  expect(issued.financialDocument.priorDocumentType).toBe("RECEIPT_VOUCHER");
  expect(issued.financialDocument.priorFinancialDocumentId).toBe(receipt.id);
  expect(issued.financialDocument.logicalIssuanceKey).toBe(`refund:${refundId}:STATUTORY_REVERSAL`);
  expect(issued.financialDocument.grandTotalPaise).toBe(receipt.grandTotalPaise);
  expect(issued.financialDocument.taxableTotalPaise).toBe(receipt.taxableTotalPaise);
  expect(issued.financialDocument.taxTotalPaise).toBe(receipt.taxTotalPaise);
  return issued.financialDocument;
}

describe("IMP-036I tranche 5 scheduled financial-document continuity", () => {
  it("issues the existing receipt for a paid scheduled order and keeps it sealed across later config changes and refund correction", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await seedIssuer(h);
      const { ready, window } = await scheduleDelivery(h);
      expect(ready.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(60);
      expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
      const purchased = await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      expect(purchased.amountPaise).toBe(ready.snapshot.grandTotalPaise);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const before = await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId);

      const issued = await issueReceiptVoucherForSucceededPayment(h.persistence, purchased.paymentId);
      expect(issued.disposition).toBe("ALREADY_EXISTS");
      if (issued.disposition !== "ALREADY_EXISTS") return;
      const receipt = issued.document;
      assertExistingReceipt(
        receipt,
        order.checkoutSnapshotId,
        purchased.paymentId,
        ready.snapshot.taxablePaise,
      );
      expect(receipt.grandTotalPaise).toBe(purchased.amountPaise);
      for (const component of ready.snapshot.taxComponents) {
        expect(receipt.lines[0]!.taxComponents.map((tax) => tax.taxType)).toContain(component.taxType);
        expect(receipt.lines[0]!.taxComponents.map((tax) => tax.rateBps)).toContain(component.rateBps);
      }
      const receiptSeal = commercialSeal(receipt);
      expect(await documentTypesForPayment(h.persistence, purchased.paymentId)).toEqual([
        "RECEIPT_VOUCHER",
      ]);

      await expect(
        updateBrandScheduledFulfilmentPolicy(h.persistence, {
          brandId: h.actors.tree.brand.id,
          expectedRevision: BigInt(0),
          pickupCancellationCutoffMinutes: 30,
          deliveryCancellationCutoffMinutes: 241,
          now: new Date(),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "deliveryCancellationCutoffMinutes must be an integer from 0 through 240.",
      });

      const changed = await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 120,
        deliveryCancellationCutoffMinutes: 15,
        now: new Date(),
      });
      expect(changed.pickupCancellationCutoffMinutes).toBe(120);
      expect(changed.deliveryCancellationCutoffMinutes).toBe(15);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 45,
        deliveryMinLeadMinutes: 90,
        expectedRevision: BigInt(1),
        now: new Date(),
      });

      const afterConfig = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        purchased.paymentId,
      );
      expect(afterConfig.disposition).toBe("ALREADY_EXISTS");
      if (afterConfig.disposition === "ALREADY_EXISTS") {
        expect(commercialSeal(afterConfig.document)).toEqual(receiptSeal);
      }
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
      expect(await documentTypesForPayment(h.persistence, purchased.paymentId)).toEqual([
        "RECEIPT_VOUCHER",
      ]);

      const cutoffAt = new Date(window.startAt.getTime() - 60 * 60 * 1000);
      const cancelled = await cancelCustomerScheduledOrder(
        h.persistence,
        h.actors.customerA,
        { orderId: order.id, expectedOrderRevision: order.revision },
        { clock: { now: () => new Date(cutoffAt.getTime() - 1000) } },
      );
      expect(cancelled.status).toBe("CANCELLED");
      const refundsAfterCustomerCancel = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: refundsTable.id }).from(refundsTable).where(eq(refundsTable.orderId, order.id)),
      );
      expect(refundsAfterCustomerCancel).toEqual([]);
      expect(await documentTypesForPayment(h.persistence, purchased.paymentId)).toEqual([
        "RECEIPT_VOUCHER",
      ]);

      await ensureProviderPaymentReference({
        persistence: h.persistence,
        paymentId: purchased.paymentId,
        provider: purchased.provider,
      } as Parameters<typeof ensureProviderPaymentReference>[0]);
      await expect(
        requestRefund(
          h.persistence,
          h.actors.brandAdminActor,
          {
            paymentId: purchased.paymentId,
            amountPaise: purchased.amountPaise + BigInt(1),
            reason: "exceeds captured scheduled payment",
          },
          { provider: purchased.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_AMOUNT_EXCEEDS_REMAINING" });
      const refunded = await requestRefund(
        h.persistence,
        h.actors.brandAdminActor,
        {
          paymentId: purchased.paymentId,
          amountPaise: purchased.amountPaise,
          reason: "customer cancelled scheduled order",
        },
        { provider: purchased.provider },
      );
      expect(refunded.refund.status).toBe("PROCESSED");
      expect(refunded.refund.amountPaise).toBe(purchased.amountPaise);
      expect(refunded.balance.fullyRefunded).toBe(true);
      expect(refunded.balance.successfulRefundedAmount).toBe(purchased.amountPaise);
      await expect(
        requestRefund(
          h.persistence,
          h.actors.brandAdminActor,
          {
            paymentId: purchased.paymentId,
            amountPaise: BigInt(1),
            reason: "second scheduled refund",
          },
          { provider: purchased.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_FULLY_REFUNDED" });

      const correction = await issueExistingRefundVoucher(h, receipt, refunded.refund.id);
      expect(FINANCIAL_DOCUMENT_STATUTORY_TYPES).toContain(correction.documentType);
      const reloaded = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        purchased.paymentId,
      );
      expect(reloaded.disposition).toBe("ALREADY_EXISTS");
      if (reloaded.disposition === "ALREADY_EXISTS") {
        expect(commercialSeal(reloaded.document)).toEqual(receiptSeal);
      }
      expect(await documentTypesForPayment(h.persistence, purchased.paymentId)).toEqual([
        "RECEIPT_VOUCHER",
        "REFUND_VOUCHER",
      ]);
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
    });
  });

  it("recovers an unhonourable paid scheduled order through the existing refund and refund-voucher path", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await seedIssuer(h);
      const { ready, window } = await scheduleDelivery(h);
      const purchased = await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const before = await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId);
      const issued = await issueReceiptVoucherForSucceededPayment(h.persistence, purchased.paymentId);
      expect(issued.disposition).toBe("ALREADY_EXISTS");
      if (issued.disposition !== "ALREADY_EXISTS") return;
      const receiptSeal = commercialSeal(issued.document);
      expect(issued.document.grandTotalPaise).toBe(purchased.amountPaise);

      const closed = new Date(window.startAt.getTime());
      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerA,
          { orderId: order.id, expectedOrderRevision: order.revision },
          { clock: { now: () => closed } },
        ),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_CUTOFF_CLOSED" });
      const workforceCancelled = await cancelOrder(
        h.persistence,
        h.actors.brandAdminActor,
        {
          orderId: order.id,
          expectedOrderRevision: order.revision,
          cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
        },
        { clock: { now: () => closed } },
      );
      expect(workforceCancelled.status).toBe("CANCELLED");
      expect(workforceCancelled.cancellationReasonCode).toBe("OUTLET_UNABLE_TO_FULFIL");

      await ensureProviderPaymentReference({
        persistence: h.persistence,
        paymentId: purchased.paymentId,
        provider: purchased.provider,
      } as Parameters<typeof ensureProviderPaymentReference>[0]);
      const refunded = await requestRefund(
        h.persistence,
        h.actors.brandAdminActor,
        {
          paymentId: purchased.paymentId,
          amountPaise: purchased.amountPaise,
          reason: "unhonourable scheduled fulfilment",
        },
        { provider: purchased.provider },
      );
      expect(refunded.refund.amountPaise).toBe(purchased.amountPaise);
      expect(refunded.balance.fullyRefunded).toBe(true);
      await issueExistingRefundVoucher(h, issued.document, refunded.refund.id);

      const reloaded = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        purchased.paymentId,
      );
      expect(reloaded.disposition).toBe("ALREADY_EXISTS");
      if (reloaded.disposition === "ALREADY_EXISTS") {
        expect(commercialSeal(reloaded.document)).toEqual(receiptSeal);
      }
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
      expect(await documentTypesForPayment(h.persistence, purchased.paymentId)).toEqual([
        "RECEIPT_VOUCHER",
        "REFUND_VOUCHER",
      ]);

      const owner = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerAId,
      );
      await withCustomerCommerceHttpService(h.database.connectionString, async ({ baseUrl }) => {
        const reschedule = await fetch(`${baseUrl}/api/v1/orders/${order.id}/reschedule`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: owner },
          body: JSON.stringify({ expectedOrderRevision: workforceCancelled.revision.toString() }),
        });
        expect(reschedule.status).toBe(404);
      });
      const persisted = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({
            status: ordersTable.status,
            checkoutSnapshotId: ordersTable.checkoutSnapshotId,
          })
          .from(ordersTable)
          .where(eq(ordersTable.id, order.id)),
      );
      expect(persisted[0]).toEqual({
        status: "CANCELLED",
        checkoutSnapshotId: order.checkoutSnapshotId,
      });
    });
  });
});
