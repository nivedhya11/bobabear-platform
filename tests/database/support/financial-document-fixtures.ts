/**
 * Fixtures for Financial Document persistence foundation tests (IMP-028).
 */
import { randomUUID } from "node:crypto";

import {
  allocateStatutoryNumber,
  insertIssuedFinancialDocument,
  insertIssuerProfile,
  insertNumberingSeries,
  loadFinancialDocument,
} from "../../../src/server/financial-document";
import type { FinancialDocumentStatutoryType } from "../../../src/shared/financial-document";
import { FIXED_NOW } from "./payment-fixtures";
import {
  closeTrackedPersistenceHandles,
  withCompletedPositiveOrderHarness,
  type CompletedOrderHarness,
} from "./order-fixtures";

export { closeTrackedPersistenceHandles };

const FIXED_CLOCK = { now: () => new Date(FIXED_NOW.getTime()) };

export type FinancialDocumentReadyHarness = CompletedOrderHarness &
  Readonly<{
    legalEntityId: string;
    organizationId: string;
    issuerProfileId: string;
    issuerProfileVersion: number;
    numberingSeriesId: string;
    financialYear: string;
    checkoutSnapshotId: string;
    orderId: string;
    clock: { now: () => Date };
  }>;

export async function withFinancialDocumentReadyHarness<T>(
  fn: (harness: FinancialDocumentReadyHarness) => Promise<T>,
): Promise<T> {
  return withCompletedPositiveOrderHarness(async (harness) => {
    const now = FIXED_CLOCK.now();
    const financialYear = "2025-26";
    const legalEntityId = harness.tree.leA.id;
    const organizationId = harness.tree.orgA.id;

    const prepared = await harness.persistence.transaction(async (tx) => {
      const profile = await insertIssuerProfile(tx, {
        brandId: harness.brandId,
        organizationId,
        legalEntityId,
        profileVersion: 1,
        // Incomplete on purpose — no fake production GST defaults.
        gstLegalName: null,
        gstin: null,
        stateCode: null,
        enableTaxInvoice: true,
        enableCreditNote: true,
        validFrom: now,
        lifecycleStatus: "draft",
        now,
      });

      const series = await insertNumberingSeries(tx, {
        legalEntityId,
        documentType: "TAX_INVOICE",
        financialYear,
        seriesCode: "TI",
        prefix: "TI/2526/",
        now,
      });

      return {
        legalEntityId,
        organizationId,
        issuerProfileId: profile.id,
        issuerProfileVersion: profile.profileVersion,
        numberingSeriesId: series.id,
        financialYear,
      };
    });

    if (!harness.paymentId) {
      throw new Error("Financial Document harness requires a Payment id.");
    }

    return fn({
      ...harness,
      ...prepared,
      paymentId: harness.paymentId,
      checkoutSnapshotId: harness.snapshotId,
      orderId: harness.order.id,
      clock: FIXED_CLOCK,
    });
  });
}

export async function issueTaxInvoiceForHarness(
  harness: FinancialDocumentReadyHarness,
  overrides: {
    logicalIssuanceKey?: string;
    documentType?: FinancialDocumentStatutoryType;
    priorFinancialDocumentId?: string | null;
    priorDocumentType?: FinancialDocumentStatutoryType | null;
    description?: string;
    numberingSeriesId?: string;
    allocate?: boolean;
  } = {},
) {
  const now = harness.clock.now();
  return harness.persistence.transaction(async (tx) => {
    const seriesId = overrides.numberingSeriesId ?? harness.numberingSeriesId;
    const allocated = overrides.allocate === false
      ? null
      : await allocateStatutoryNumber(tx, seriesId, now);

    const documentType = overrides.documentType ?? "TAX_INVOICE";
    const statutoryDocumentNumber =
      allocated?.statutoryDocumentNumber ?? "TI/2526/MANUAL";
    const sequenceNumber = allocated?.sequenceNumber ?? 1n;

    return insertIssuedFinancialDocument(tx, {
      documentType,
      statutoryDocumentNumber,
      issueAt: now,
      financialYear: harness.financialYear,
      logicalIssuanceKey:
        overrides.logicalIssuanceKey ?? `fd-issue-${randomUUID()}`,
      numberingSeriesId: seriesId,
      sequenceNumber,
      legalEntityId: harness.legalEntityId,
      issuerProfileId: harness.issuerProfileId,
      issuerProfileVersion: harness.issuerProfileVersion,
      supplierGstLegalName: null,
      supplierGstin: null,
      taxableTotalPaise: 10000n,
      taxTotalPaise: 500n,
      discountTotalPaise: 0n,
      chargeTotalPaise: 0n,
      grandTotalPaise: 10500n,
      checkoutId: harness.checkoutId,
      checkoutSnapshotId: harness.checkoutSnapshotId,
      paymentId: harness.paymentId,
      orderId: harness.orderId,
      priorFinancialDocumentId: overrides.priorFinancialDocumentId ?? null,
      priorDocumentType: overrides.priorDocumentType ?? null,
      lines: [
        {
          lineNumber: 1,
          description: overrides.description ?? "Sealed historical line",
          quantity: 1,
          unitPaise: 10000n,
          discountPaise: 0n,
          chargePaise: 0n,
          taxableValuePaise: 10000n,
          lineTotalPaise: 10500n,
          sacCode: "9983",
          historicalCatalogItemId: "hist-item-1",
          taxComponents: [
            {
              taxType: "cgst",
              rateBps: 250,
              taxableAmountPaise: 10000n,
              taxAmountPaise: 250n,
            },
            {
              taxType: "sgst",
              rateBps: 250,
              taxableAmountPaise: 10000n,
              taxAmountPaise: 250n,
            },
          ],
        },
      ],
      now,
    });
  });
}

export async function reloadDocument(
  harness: FinancialDocumentReadyHarness,
  documentId: string,
) {
  return harness.persistence.withContext((ctx) =>
    loadFinancialDocument(ctx, documentId),
  );
}
