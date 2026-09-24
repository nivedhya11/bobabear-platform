/**
 * IMP-036H-C — Financial Document Option A for Pickup (AF-036H-12).
 *
 * RECEIPT_VOUCHER on Payment SUCCEEDED and TAX_INVOICE on Order FULFILLED
 * must seal null recipients for PICKUP (no mutable customer lookup; no pickup
 * location → recipientAddress substitution). DELIVERY recipients preserved.
 */
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  issueFinancialDocument,
  issueReceiptVoucherForSucceededPayment,
  issueTaxInvoiceForFulfilledOrder,
  loadFinancialDocument,
  findFinancialDocumentByLogicalIssuanceKey,
  receiptVoucherLogicalIssuanceKey,
  taxInvoiceLogicalIssuanceKey,
} from "../../src/server/financial-document";
import {
  acceptOrder,
  fulfilOrder,
} from "../../src/server/order";
import { closeTrackedPersistenceHandles } from "./support/cart-fixtures";
import {
  orderOpts,
  withCompletedPositiveOrderHarness,
  withCompletedPositivePickupOrderHarness,
} from "./support/order-fixtures";
import { standardTaxInvoiceLines } from "./support/financial-document-issuance-fixtures";
import { seedTaxInvoiceWorkflowConfig } from "./support/financial-document-workflow-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-C financial documents — Pickup Option A", () => {
  it("PICKUP RECEIPT_VOUCHER and TAX_INVOICE seal null recipients; placeOfSupply from issuer", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });

      expect(h.paymentId).toBeTruthy();
      const receiptOutcome = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        h.paymentId!,
      );
      // Payment success hook may already have issued once adapters allow Option A.
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(receiptOutcome.disposition);
      if (
        receiptOutcome.disposition !== "ISSUED" &&
        receiptOutcome.disposition !== "ALREADY_EXISTS"
      ) {
        return;
      }

      expect(receiptOutcome.document.recipientDisplayName).toBeNull();
      expect(receiptOutcome.document.recipientPhoneE164).toBeNull();
      expect(receiptOutcome.document.recipientAddress).toBeNull();
      // Issuer profile stateCode from COMPLETE_GST fixture ("05").
      expect(receiptOutcome.document.placeOfSupplyStateCode).toBe("05");
      // Pickup location must not be substituted as recipientAddress.
      expect(String(receiptOutcome.document.recipientAddress ?? "")).not.toContain(
        "Mall Road",
      );

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

      const taxOutcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      // Fulfil hook may already have issued; both dispositions are sealed truth.
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(taxOutcome.disposition);
      if (
        taxOutcome.disposition !== "ISSUED" &&
        taxOutcome.disposition !== "ALREADY_EXISTS"
      ) {
        return;
      }

      expect(taxOutcome.document.recipientDisplayName).toBeNull();
      expect(taxOutcome.document.recipientPhoneE164).toBeNull();
      expect(taxOutcome.document.recipientAddress).toBeNull();
      expect(taxOutcome.document.placeOfSupplyStateCode).toBe(
        receiptOutcome.document.placeOfSupplyStateCode,
      );
      expect(String(taxOutcome.document.recipientAddress ?? "")).not.toContain(
        "Mall Road",
      );

      // Reloaded rows remain sealed.
      const reloadedTax = await h.persistence.withContext(async (ctx) => {
        const row = await findFinancialDocumentByLogicalIssuanceKey(
          ctx,
          taxInvoiceLogicalIssuanceKey(h.order.id),
        );
        if (!row) return null;
        return loadFinancialDocument(ctx, row.id);
      });
      expect(reloadedTax?.recipientDisplayName).toBeNull();
      expect(reloadedTax?.recipientAddress).toBeNull();

      const reloadedReceipt = await h.persistence.withContext(async (ctx) => {
        const row = await findFinancialDocumentByLogicalIssuanceKey(
          ctx,
          receiptVoucherLogicalIssuanceKey(h.paymentId!),
        );
        if (!row) return null;
        return loadFinancialDocument(ctx, row.id);
      });
      expect(reloadedReceipt?.recipientPhoneE164).toBeNull();
    });
  });

  it("DELIVERY TAX_INVOICE still seals destination recipients", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });

      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(accepted.revision),
        },
        orderOpts(),
      );

      const taxOutcome = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(taxOutcome.disposition);
      if (
        taxOutcome.disposition !== "ISSUED" &&
        taxOutcome.disposition !== "ALREADY_EXISTS"
      ) {
        return;
      }
      expect(taxOutcome.document.recipientDisplayName).toBeTruthy();
      expect(taxOutcome.document.recipientPhoneE164).toBeTruthy();
      expect(taxOutcome.document.recipientAddress).toBeTruthy();
    });
  });

  it("DELIVERY snapshot + absent recipients → RECIPIENT_PARTICULARS_REQUIRED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const cfg = await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });

      await expect(
        issueFinancialDocument(h.persistence, {
          logicalIssuanceKey: `fd-delivery-absent-${randomUUID()}`,
          documentType: "TAX_INVOICE",
          legalEntityId: h.tree.leA.id,
          financialYear: cfg.financialYear,
          numberingSeriesId: cfg.taxInvoiceSeriesId,
          issueAt: new Date(),
          lines: standardTaxInvoiceLines(),
          checkoutId: h.checkoutId,
          checkoutSnapshotId: h.snapshotId,
          paymentId: h.paymentId,
          orderId: h.order.id,
          placeOfSupplyStateCode: "05",
          recipientDisplayName: null,
          recipientPhoneE164: null,
          recipientAddress: null,
        }),
      ).rejects.toMatchObject({ code: "RECIPIENT_PARTICULARS_REQUIRED" });
    });
  });
});
