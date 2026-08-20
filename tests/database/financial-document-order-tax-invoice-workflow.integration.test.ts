/**
 * IMP-028 Slice 9 — Order FULFILLED → TAX_INVOICE workflow (FD-WO01..WO30).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";

import {
  generateCustomerFinancialDocumentArtifact,
  issueTaxInvoiceForFulfilledOrder,
  listFinancialDocumentsForCustomerOrder,
  loadFinancialDocument,
  recoverMissingTaxInvoicesBatch,
  taxInvoiceLogicalIssuanceKey,
  findFinancialDocumentByLogicalIssuanceKey,
  runRecoverMissingTaxInvoicesOperator,
  receiptVoucherLogicalIssuanceKey,
} from "../../src/server/financial-document";
import { signFinancialDocumentWithRenderedPdf } from "./support/manual-signed-upload-fixtures";
import { executeRecoverMissingTaxInvoicesCli } from "../../scripts/financial-document/recover-missing-tax-invoices";
import {
  acceptOrder,
  fulfilOrder,
} from "../../src/server/order";
import { findOrderById, mapOrderRow } from "../../src/server/order/repository";
import {
  deriveIndianFinancialYear,
  FinancialDocumentError,
} from "../../src/shared/financial-document";
import {
  closeTrackedPersistenceHandles,
  orderOpts,
  withCompletedPositiveOrderHarness,
  withCompletedZeroOrderHarness,
  type CompletedOrderHarness,
} from "./support/order-fixtures";
import {
  seedTaxInvoiceWorkflowConfig,
  WORKFLOW_FINANCIAL_YEAR,
} from "./support/financial-document-workflow-fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function loadTaxInvoice(
  persistence: CompletedOrderHarness["persistence"],
  orderId: string,
) {
  return persistence.withContext(async (ctx) => {
    const row = await findFinancialDocumentByLogicalIssuanceKey(
      ctx,
      taxInvoiceLogicalIssuanceKey(orderId),
    );
    if (!row) return null;
    return loadFinancialDocument(ctx, row.id);
  });
}

async function loadReceiptVoucher(
  persistence: CompletedOrderHarness["persistence"],
  paymentId: string,
) {
  return persistence.withContext(async (ctx) => {
    const row = await findFinancialDocumentByLogicalIssuanceKey(
      ctx,
      receiptVoucherLogicalIssuanceKey(paymentId),
    );
    if (!row) return null;
    return loadFinancialDocument(ctx, row.id);
  });
}

async function countTaxInvoicesForOrder(
  persistence: CompletedOrderHarness["persistence"],
  orderId: string,
): Promise<number> {
  const result = await persistence.withContext((ctx) =>
    ctx.db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
      FROM app.financial_documents
      WHERE order_id = ${orderId}::uuid
        AND document_type = 'TAX_INVOICE'
        AND status = 'ISSUED'
    `),
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function reloadOrder(
  persistence: CompletedOrderHarness["persistence"],
  orderId: string,
) {
  const row = await persistence.withContext((ctx) => findOrderById(ctx, orderId));
  if (!row) throw new Error(`Order not found: ${orderId}`);
  return mapOrderRow(row);
}

async function seedTiConfig(h: CompletedOrderHarness, overrides: Partial<Parameters<typeof seedTaxInvoiceWorkflowConfig>[1]> = {}) {
  return seedTaxInvoiceWorkflowConfig(h.persistence, {
    brandId: h.brandId,
    organizationId: h.tree.orgA.id,
    legalEntityId: h.tree.leA.id,
    ...overrides,
  });
}

async function acceptAndFulfil(h: CompletedOrderHarness) {
  const accepted = await acceptOrder(
    h.persistence,
    h.workforce.outletManager,
    {
      orderId: h.order.id,
      expectedOrderRevision: h.order.revision,
    },
    orderOpts(),
  );
  const fulfilled = await fulfilOrder(
    h.persistence,
    h.workforce.kitchen,
    {
      orderId: h.order.id,
      expectedOrderRevision: BigInt(accepted.revision),
    },
    orderOpts(),
  );
  expect(fulfilled.status).toBe("FULFILLED");
  return fulfilled;
}

describe("IMP-028 Slice 9 Order FULFILLED → TAX_INVOICE workflow (FD-WO)", () => {
  it("deriveIndianFinancialYear: August 2026 → 2026-27", () => {
    expect(deriveIndianFinancialYear(new Date("2026-08-16T12:00:00.000Z"))).toBe(
      "2026-27",
    );
    expect(WORKFLOW_FINANCIAL_YEAR).toBe("2026-27");
  });

  it("FD-WO01/02/03/09/18/20/21/25/26 Order FULFILLED issues one sealed TAX_INVOICE", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      const fulfilled = await acceptAndFulfil(h);
      const order = await reloadOrder(h.persistence, h.order.id);
      expect(order.status).toBe("FULFILLED");
      expect(order.fulfilledAt).not.toBeNull();

      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();
      expect(invoice!.documentType).toBe("TAX_INVOICE");
      expect(invoice!.orderId).toBe(h.order.id);
      expect(invoice!.checkoutId).toBe(h.checkoutId);
      expect(invoice!.checkoutSnapshotId).toBe(h.snapshotId);
      expect(invoice!.paymentId).toBe(h.paymentId);
      expect(invoice!.logicalIssuanceKey).toBe(
        taxInvoiceLogicalIssuanceKey(h.order.id),
      );
      expect(invoice!.financialYear).toBe("2026-27");
      expect(invoice!.statutoryDocumentNumber.startsWith("TI/2627/")).toBe(true);
      expect(invoice!.issueAt.getTime()).toBe(order.fulfilledAt!.getTime());
      expect(invoice!.issueAt.getTime()).toBe(fulfilled.fulfilledAt!.getTime());
      expect(invoice!.taxableTotalPaise).toBeGreaterThanOrEqual(BigInt(0));
      expect(invoice!.lines.length).toBe(1);
      expect(invoice!.lines[0]!.taxComponents.length).toBeGreaterThan(0);
      expect(await countTaxInvoicesForOrder(h.persistence, h.order.id)).toBe(1);

      const ownershipListed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.order.id },
      );
      expect(
        ownershipListed.some((item) => item.financialDocumentId === invoice!.id),
      ).toBe(true);
    });
  });

  it("FD-WO04 Current menu mutation after fulfillment cannot alter Tax Invoice facts", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      await acceptAndFulfil(h);
      const before = await loadTaxInvoice(h.persistence, h.order.id);
      expect(before).not.toBeNull();
      const sealedDescription = before!.lines[0]!.description;

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          UPDATE app.catalog_products
          SET name = 'MUTATED-MENU-NAME-SHOULD-NOT-LEAK'
          WHERE brand_id = ${h.brandId}::uuid
        `);
      });

      const again = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS" || again.disposition === "ISSUED") {
        expect(again.document.lines[0]!.description).toBe(sealedDescription);
        expect(again.document.lines[0]!.description).not.toContain(
          "MUTATED-MENU-NAME",
        );
      }
    });
  });

  it("FD-WO05 Current customer-profile mutation cannot alter Tax Invoice facts", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      await acceptAndFulfil(h);
      const before = await loadTaxInvoice(h.persistence, h.order.id);
      expect(before).not.toBeNull();
      const sealedRecipient = before!.recipientDisplayName;

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          UPDATE app.customer_profiles
          SET given_name = 'MUTATED-PROFILE-NAME'
          WHERE customer_auth_user_id = ${h.actor.authUserId}
        `);
      });

      const again = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS" || again.disposition === "ISSUED") {
        expect(again.document.recipientDisplayName).toBe(sealedRecipient);
        expect(again.document.recipientDisplayName).not.toBe(
          "MUTATED-PROFILE-NAME",
        );
      }
    });
  });

  it("FD-WO06 PLACED produces no Tax Invoice", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      expect(h.order.status).toBe("PLACED");
      const outcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(outcome.disposition).toBe("SKIPPED");
      expect(outcome).toMatchObject({ reason: "ORDER_NOT_FULFILLED" });
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
    });
  });

  it("FD-WO07 ACCEPTED produces no Tax Invoice", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      const order = await reloadOrder(h.persistence, h.order.id);
      expect(order.status).toBe("ACCEPTED");
      const outcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(outcome.disposition).toBe("SKIPPED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
    });
  });

  it("FD-WO08 CANCELLED produces no Tax Invoice", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      const { cancelOrder } = await import("../../src/server/order");
      await cancelOrder(
        h.persistence,
        h.workforce.support,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        },
        orderOpts(),
      );
      const order = await reloadOrder(h.persistence, h.order.id);
      expect(order.status).toBe("CANCELLED");
      const outcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(outcome.disposition).toBe("SKIPPED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
    });
  });

  it("FD-WO10 Repeated fulfillment/retry → exactly one Tax Invoice and one statutory number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      const fulfilled = await acceptAndFulfil(h);
      const first = await loadTaxInvoice(h.persistence, h.order.id);
      expect(first).not.toBeNull();
      const number = first!.statutoryDocumentNumber;

      const noop = await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(fulfilled.revision),
        },
        orderOpts(),
      );
      expect(noop.status).toBe("FULFILLED");

      const again = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS") {
        expect(again.document.statutoryDocumentNumber).toBe(number);
        expect(again.document.id).toBe(first!.id);
      }
      expect(await countTaxInvoicesForOrder(h.persistence, h.order.id)).toBe(1);
    });
  });

  it("FD-WO11 Concurrent Tax Invoice orchestration → one document / one number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      // Fulfil without config so automatic hook leaves a durable gap, then race issuance.
      await acceptAndFulfil(h);
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      await seedTiConfig(h);

      const results = await Promise.all([
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
      ]);
      const ids = new Set(
        results
          .filter((r) => r.disposition === "ISSUED" || r.disposition === "ALREADY_EXISTS")
          .map((r) =>
            r.disposition === "ISSUED" || r.disposition === "ALREADY_EXISTS"
              ? r.document.id
              : null,
          ),
      );
      expect(ids.size).toBe(1);
      expect(await countTaxInvoicesForOrder(h.persistence, h.order.id)).toBe(1);
    });
  });

  it("FD-WO12/13/14 Transient Tax Invoice failure does not revert FULFILLED; recovery catches up once", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      // No issuer profile yet — automatic hook fails closed; Order remains FULFILLED.
      const fulfilled = await acceptAndFulfil(h);
      expect(fulfilled.status).toBe("FULFILLED");
      const orderAfterFail = await reloadOrder(h.persistence, h.order.id);
      expect(orderAfterFail.status).toBe("FULFILLED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();

      await seedTiConfig(h);

      const recovery = await recoverMissingTaxInvoicesBatch(h.persistence, {
        limit: 50,
      });
      const item = recovery.results.find((r) => r.orderId === h.order.id);
      expect(item?.disposition).toBe("ISSUED");

      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();
      const number = invoice!.statutoryDocumentNumber;

      const retry = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(retry.disposition).toBe("ALREADY_EXISTS");
      if (retry.disposition === "ALREADY_EXISTS") {
        expect(retry.document.statutoryDocumentNumber).toBe(number);
      }
      expect(await countTaxInvoicesForOrder(h.persistence, h.order.id)).toBe(1);

      const recovery2 = await recoverMissingTaxInvoicesBatch(h.persistence, {
        limit: 50,
      });
      expect(
        recovery2.results.every((r) => r.orderId !== h.order.id),
      ).toBe(true);

      const stillFulfilled = await reloadOrder(h.persistence, h.order.id);
      expect(stillFulfilled.status).toBe("FULFILLED");
    });
  });

  it("FD-WO15 Missing effective issuer profile blocks statutory issuance but preserves FULFILLED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptAndFulfil(h);
      const order = await reloadOrder(h.persistence, h.order.id);
      expect(order.status).toBe("FULFILLED");
      await expect(
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
    });
  });

  it("FD-WO16 Locked profile issuancePolicy=invoice_at_payment does not issue Tax Invoice", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h, { issuancePolicy: "invoice_at_payment" });
      await acceptAndFulfil(h);
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      const direct = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(direct).toEqual({
        disposition: "SKIPPED",
        reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
      });
    });
  });

  it("FD-WO17 Locked profile enableTaxInvoice=false blocks issuance and preserves FULFILLED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h, { enableTaxInvoice: false });
      await acceptAndFulfil(h);
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      const direct = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(direct.disposition).toBe("SKIPPED");
      expect(direct).toMatchObject({ reason: "TAX_INVOICE_DISABLED" });
    });
  });

  it("FD-WO19 Missing/ambiguous Tax Invoice series fails closed without corrupting Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h, { createTaxInvoiceSeries: false });
      await acceptAndFulfil(h);
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
      await expect(
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
      ).rejects.toMatchObject({ code: "NUMBERING_SERIES_NOT_FOUND" });
    });

    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h, { duplicateTaxInvoiceSeries: true });
      await acceptAndFulfil(h);
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
      await expect(
        issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id),
      ).rejects.toMatchObject({ code: "NUMBERING_SERIES_AMBIGUOUS" });
    });
  });

  it("FD-WO22/23 Owner discovers Tax Invoice; another customer cannot", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      await acceptAndFulfil(h);
      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();

      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.order.id },
      );
      expect(listed.some((i) => i.financialDocumentId === invoice!.id)).toBe(true);

      await expect(
        listFinancialDocumentsForCustomerOrder(
          h.persistence,
          h.actors.customerB,
          { orderId: h.order.id },
        ),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });

      await expect(
        generateCustomerFinancialDocumentArtifact(
          h.persistence,
          h.actors.customerB,
          { financialDocumentId: invoice!.id },
        ),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });

      await signFinancialDocumentWithRenderedPdf(
        {
          persistence: h.persistence,
          legalEntityId: h.tree.leA.id,
          clock: { now: () => new Date() },
        },
        invoice!.id,
      );
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: invoice!.id },
      );
      expect(artifact.mediaType).toBe("application/pdf");
      expect(artifact.byteLength).toBeGreaterThan(100);
    });
  });

  it("FD-WO24 Tax Invoice uses generic UI/transport without a document-specific route", () => {
    const router = readFileSync(
      path.join(HERE, "../../src/server/customer-commerce/http/router.ts"),
      "utf8",
    );
    const ui = readFileSync(
      path.join(HERE, "../../src/components/ordering/OrderFinancialDocuments.tsx"),
      "utf8",
    );
    const lifecycle = readFileSync(
      path.join(HERE, "../../src/server/order/lifecycle.ts"),
      "utf8",
    );
    expect(router).toMatch(/\/api\/v1\/orders\/\{orderId\}\/financial-documents/);
    expect(router).toMatch(/\/api\/v1\/financial-documents\/\{financialDocumentId\}\/pdf/);
    expect(router).not.toMatch(/tax-invoice/i);
    expect(ui).toMatch(/listCustomerOrderFinancialDocuments/);
    expect(ui).not.toMatch(/tax-invoice/i);
    expect(lifecycle).toMatch(/tryIssueTaxInvoiceAfterOrderFulfilled/);
  });

  it("FD-WO27 Zero-payable fulfilled Order issues Tax Invoice without inventing Payment/RV", async () => {
    await withCompletedZeroOrderHarness(async (h) => {
      await seedTiConfig(h, { createReceiptVoucherSeries: false });
      expect(h.paymentId).toBeNull();
      await acceptAndFulfil(h);
      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();
      expect(invoice!.paymentId).toBeNull();
      expect(invoice!.orderId).toBe(h.order.id);
      expect(invoice!.checkoutSnapshotId).toBe(h.snapshotId);
      expect(invoice!.documentType).toBe("TAX_INVOICE");

      const rvCount = await h.persistence.withContext((ctx) =>
        ctx.db.execute<{ count: string }>(sql`
          SELECT count(*)::text AS count
          FROM app.financial_documents
          WHERE checkout_id = ${h.checkoutId}::uuid
            AND document_type = 'RECEIPT_VOUCHER'
        `),
      );
      expect(Number(rvCount.rows[0]?.count ?? "0")).toBe(0);
    });
  });

  it("FD-WO28 Existing Receipt Voucher remains unchanged after Tax Invoice issuance", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      expect(h.paymentId).not.toBeNull();
      // Payment success already issued RV via Slice-8 hook when config exists —
      // seed after payment, then recover RV, then fulfil for TI.
      const recoveryRv = await (
        await import("../../src/server/financial-document")
      ).recoverMissingReceiptVouchersBatch(h.persistence, { limit: 50 });
      const rvItem = recoveryRv.results.find((r) => r.paymentId === h.paymentId);
      expect(rvItem?.disposition === "ISSUED" || rvItem?.disposition === "ALREADY_EXISTS" || rvItem === undefined).toBe(true);

      // Ensure RV exists before TI (recover if payment-time hook had no config).
      let voucher = await loadReceiptVoucher(h.persistence, h.paymentId!);
      if (!voucher) {
        const issued = await (
          await import("../../src/server/financial-document")
        ).issueReceiptVoucherForSucceededPayment(h.persistence, h.paymentId!);
        expect(issued.disposition === "ISSUED" || issued.disposition === "ALREADY_EXISTS").toBe(true);
        voucher = await loadReceiptVoucher(h.persistence, h.paymentId!);
      }
      expect(voucher).not.toBeNull();
      const rvSnapshot = Object.freeze({
        id: voucher!.id,
        statutoryDocumentNumber: voucher!.statutoryDocumentNumber,
        issueAt: voucher!.issueAt.toISOString(),
        orderId: voucher!.orderId,
        paymentId: voucher!.paymentId,
        checkoutId: voucher!.checkoutId,
        checkoutSnapshotId: voucher!.checkoutSnapshotId,
        taxableTotalPaise: voucher!.taxableTotalPaise.toString(),
        grandTotalPaise: voucher!.grandTotalPaise.toString(),
        recipientDisplayName: voucher!.recipientDisplayName,
        logicalIssuanceKey: voucher!.logicalIssuanceKey,
      });

      await acceptAndFulfil(h);
      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();
      expect(invoice!.id).not.toBe(voucher!.id);
      expect(invoice!.priorFinancialDocumentId).toBeNull();

      const voucherAfter = await loadReceiptVoucher(h.persistence, h.paymentId!);
      expect(voucherAfter).not.toBeNull();
      expect({
        id: voucherAfter!.id,
        statutoryDocumentNumber: voucherAfter!.statutoryDocumentNumber,
        issueAt: voucherAfter!.issueAt.toISOString(),
        orderId: voucherAfter!.orderId,
        paymentId: voucherAfter!.paymentId,
        checkoutId: voucherAfter!.checkoutId,
        checkoutSnapshotId: voucherAfter!.checkoutSnapshotId,
        taxableTotalPaise: voucherAfter!.taxableTotalPaise.toString(),
        grandTotalPaise: voucherAfter!.grandTotalPaise.toString(),
        recipientDisplayName: voucherAfter!.recipientDisplayName,
        logicalIssuanceKey: voucherAfter!.logicalIssuanceKey,
      }).toEqual(rvSnapshot);
      expect(voucherAfter!.orderId).toBeNull();
    });
  });

  it("FD-WO29 Soft-eligible profile racing away from uninvoiced_advance issues nothing; Order stays FULFILLED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptAndFulfil(h);
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();

      const config = await seedTiConfig(h, { issuancePolicy: "uninvoiced_advance" });

      const sequenceBefore = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ next_sequence: string }>(sql`
          select next_sequence::text as next_sequence
          from app.financial_document_numbering_series
          where id = ${config.taxInvoiceSeriesId}::uuid
        `);
        return Number(rows.rows[0]?.next_sequence ?? "0");
      });

      const outcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
        {
          afterSoftProfileResolved: async () => {
            await h.persistence.withContext(async (ctx) => {
              await ctx.db.execute(sql`
                update app.financial_document_issuer_profiles
                set issuance_policy = 'invoice_at_payment',
                    updated_at = now()
                where id = ${config.issuerProfileId}::uuid
              `);
            });
          },
        },
      );

      expect(outcome).toEqual({
        disposition: "SKIPPED",
        reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
      });
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      expect((await reloadOrder(h.persistence, h.order.id)).status).toBe("FULFILLED");

      const sequenceAfter = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ next_sequence: string }>(sql`
          select next_sequence::text as next_sequence
          from app.financial_document_numbering_series
          where id = ${config.taxInvoiceSeriesId}::uuid
        `);
        return Number(rows.rows[0]?.next_sequence ?? "0");
      });
      expect(sequenceAfter).toBe(sequenceBefore);
    });
  });

  it("FD-WO30 Historical exact Tax Invoice retry returns same document after profile drift", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTiConfig(h);
      await acceptAndFulfil(h);
      const first = await loadTaxInvoice(h.persistence, h.order.id);
      expect(first).not.toBeNull();

      // Drift the effective issuer-profile set without mutating the sealed
      // referenced profile (ARCH-G16). Historical retry must return before
      // current profile resolution.
      await h.persistence.transaction(async (tx) => {
        const { insertIssuerProfile } = await import(
          "../../src/server/financial-document"
        );
        await insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.tree.orgA.id,
          legalEntityId: h.tree.leA.id,
          profileVersion: 2,
          gstLegalName: "NIVEDHYA11 HOSPITALITY PRIVATE LIMITED",
          gstin: "05AAJCN9151F1ZE",
          stateCode: "05",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "8th Floor, C-802, HIG, MDDA Colony",
          registeredAddressCity: "Dehradun",
          registeredAddressPostalCode: "248002",
          defaultSacCode: "996331",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          enableBillOfSupply: false,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          enableCreditNote: true,
          dynamicQrApplicable: false,
          issuancePolicy: "invoice_at_payment",
          validFrom: new Date(Date.now() - 60_000),
          lifecycleStatus: "active",
          now: new Date(),
        });
      });

      const retry = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
        {
          beforeIssuerProfileLock: async () => {
            throw new Error("historical retry must not lock current issuer profile");
          },
        },
      );
      expect(retry.disposition).toBe("ALREADY_EXISTS");
      if (retry.disposition === "ALREADY_EXISTS") {
        expect(retry.document.id).toBe(first!.id);
        expect(retry.document.statutoryDocumentNumber).toBe(
          first!.statutoryDocumentNumber,
        );
      }
      expect(await countTaxInvoicesForOrder(h.persistence, h.order.id)).toBe(1);
    });
  });

  it("Production recovery entrypoint wires recoverMissingTaxInvoicesBatch", async () => {
    const source = readFileSync(
      path.join(
        HERE,
        "../../scripts/financial-document/recover-missing-tax-invoices.ts",
      ),
      "utf8",
    );
    expect(source).toMatch(/runRecoverMissingTaxInvoicesOperator/);
    expect(source).toMatch(/recover_missing_tax_invoices_batch/);

    const packageJson = JSON.parse(
      readFileSync(path.join(HERE, "../../package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts["financial-document:recover-missing-tax-invoices"]).toMatch(
      /recover-missing-tax-invoices\.ts/,
    );

    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptAndFulfil(h);
      expect(await loadTaxInvoice(h.persistence, h.order.id)).toBeNull();
      await seedTiConfig(h);

      const lines: string[] = [];
      await executeRecoverMissingTaxInvoicesCli({
        persistence: h.persistence,
        argv: ["--limit=50"],
        write: (line) => lines.push(line),
      });
      expect(lines.length).toBe(1);
      const payload = JSON.parse(lines[0]!) as {
        ok: boolean;
        operation: string;
        issued: number;
      };
      expect(payload.ok).toBe(true);
      expect(payload.operation).toBe("recover_missing_tax_invoices_batch");
      expect(payload.issued).toBeGreaterThanOrEqual(1);

      const invoice = await loadTaxInvoice(h.persistence, h.order.id);
      expect(invoice).not.toBeNull();

      const operator = await runRecoverMissingTaxInvoicesOperator(h.persistence, {
        limit: 50,
      });
      expect(
        operator.batch.results.every((r) => r.orderId !== h.order.id),
      ).toBe(true);
    });
  });
});
