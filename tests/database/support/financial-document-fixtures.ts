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
    const sequenceNumber = allocated?.sequenceNumber ?? BigInt(1);

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
      taxableTotalPaise: BigInt(10000),
      taxTotalPaise: BigInt(500),
      discountTotalPaise: BigInt(0),
      chargeTotalPaise: BigInt(0),
      grandTotalPaise: BigInt(10500),
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
          unitPaise: BigInt(10000),
          discountPaise: BigInt(0),
          chargePaise: BigInt(0),
          taxableValuePaise: BigInt(10000),
          lineTotalPaise: BigInt(10500),
          sacCode: "9983",
          historicalCatalogItemId: "hist-item-1",
          taxComponents: [
            {
              taxType: "cgst",
              rateBps: 250,
              taxableAmountPaise: BigInt(10000),
              taxAmountPaise: BigInt(250),
            },
            {
              taxType: "sgst",
              rateBps: 250,
              taxableAmountPaise: BigInt(10000),
              taxAmountPaise: BigInt(250),
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
