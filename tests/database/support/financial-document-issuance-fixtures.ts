/**
 * Fixtures for Financial Document issuance operation tests (IMP-028 Slice 2).
 */
import { randomUUID } from "node:crypto";

import {
  insertIssuerProfile,
  insertNumberingSeries,
} from "../../../src/server/financial-document";
import type {
  FinancialDocumentStatutoryType,
  IssueFinancialDocumentCommand,
  IssueFinancialDocumentLineCommand,
} from "../../../src/shared/financial-document";
import {
  withFinancialDocumentReadyHarness,
  type FinancialDocumentReadyHarness,
  closeTrackedPersistenceHandles,
} from "./financial-document-fixtures";

export { closeTrackedPersistenceHandles };

export type FinancialDocumentIssuanceHarness = FinancialDocumentReadyHarness &
  Readonly<{
    activeIssuerProfileId: string;
    activeIssuerProfileVersion: number;
    creditNoteSeriesId: string;
    billOfSupplySeriesId: string;
    refundVoucherSeriesId: string;
    receiptVoucherSeriesId: string;
  }>;

const COMPLETE_GST = Object.freeze({
  gstLegalName: "BOBA Bear Test Kitchen LLP",
  gstin: "27AAAAA0000A1Z5",
  stateCode: "27",
  registrationScheme: "regular" as const,
  registrationStatus: "registered" as const,
  registeredAddressLine1: "12 Test Street",
  registeredAddressCity: "Mumbai",
  registeredAddressPostalCode: "400001",
  defaultSacCode: "9983",
  reverseChargeApplicable: false,
});

export async function withFinancialDocumentIssuanceHarness<T>(
  fn: (harness: FinancialDocumentIssuanceHarness) => Promise<T>,
): Promise<T> {
  return withFinancialDocumentReadyHarness(async (h) => {
    const now = h.clock.now();
    const prepared = await h.persistence.transaction(async (tx) => {
      // Retire the incomplete draft from Slice-1 harness so it is not eligible.
      // Draft remains non-active; insert a single active complete profile.
      const active = await insertIssuerProfile(tx, {
        brandId: h.brandId,
        organizationId: h.organizationId,
        legalEntityId: h.legalEntityId,
        profileVersion: 2,
        ...COMPLETE_GST,
        enableTaxInvoice: true,
        enableCreditNote: true,
        enableBillOfSupply: true,
        enableReceiptVoucher: true,
        enableRefundVoucher: true,
        issuancePolicy: "uninvoiced_advance",
        validFrom: now,
        lifecycleStatus: "active",
        now,
      });

      const creditNoteSeries = await insertNumberingSeries(tx, {
        legalEntityId: h.legalEntityId,
        documentType: "CREDIT_NOTE",
        financialYear: h.financialYear,
        seriesCode: "CN",
        prefix: "CN/2526/",
        now,
      });
      const billOfSupplySeries = await insertNumberingSeries(tx, {
        legalEntityId: h.legalEntityId,
        documentType: "BILL_OF_SUPPLY",
        financialYear: h.financialYear,
        seriesCode: "BOS",
        prefix: "BOS/2526/",
        now,
      });
      const refundVoucherSeries = await insertNumberingSeries(tx, {
        legalEntityId: h.legalEntityId,
        documentType: "REFUND_VOUCHER",
        financialYear: h.financialYear,
        seriesCode: "RFV",
        prefix: "RFV/2526/",
        now,
      });
      const receiptVoucherSeries = await insertNumberingSeries(tx, {
        legalEntityId: h.legalEntityId,
        documentType: "RECEIPT_VOUCHER",
        financialYear: h.financialYear,
        seriesCode: "RV",
        prefix: "RV/2526/",
        now,
      });

      return {
        activeIssuerProfileId: active.id,
        activeIssuerProfileVersion: active.profileVersion,
        creditNoteSeriesId: creditNoteSeries.id,
        billOfSupplySeriesId: billOfSupplySeries.id,
        refundVoucherSeriesId: refundVoucherSeries.id,
        receiptVoucherSeriesId: receiptVoucherSeries.id,
      };
    });

    return fn({ ...h, ...prepared });
  });
}

export function standardTaxInvoiceLines(): IssueFinancialDocumentLineCommand[] {
  return [
    {
      lineNumber: 1,
      description: "Sealed issuance line",
      quantity: 1,
      unitPaise: 10000n,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: 10000n,
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
  ];
}

export function buildIssueCommand(
  harness: FinancialDocumentIssuanceHarness,
  overrides: Partial<IssueFinancialDocumentCommand> & {
    documentType?: FinancialDocumentStatutoryType;
  } = {},
): IssueFinancialDocumentCommand {
  const documentType = overrides.documentType ?? "TAX_INVOICE";
  const numberingSeriesId =
    overrides.numberingSeriesId ??
    (documentType === "CREDIT_NOTE"
      ? harness.creditNoteSeriesId
      : documentType === "BILL_OF_SUPPLY"
        ? harness.billOfSupplySeriesId
        : documentType === "REFUND_VOUCHER"
          ? harness.refundVoucherSeriesId
          : documentType === "RECEIPT_VOUCHER"
            ? harness.receiptVoucherSeriesId
            : harness.numberingSeriesId);

  return {
    logicalIssuanceKey: overrides.logicalIssuanceKey ?? `fd-i-${randomUUID()}`,
    documentType,
    legalEntityId: overrides.legalEntityId ?? harness.legalEntityId,
    financialYear: overrides.financialYear ?? harness.financialYear,
    numberingSeriesId,
    issueAt: overrides.issueAt ?? harness.clock.now(),
    lines: overrides.lines ?? standardTaxInvoiceLines(),
    checkoutId:
      overrides.checkoutId === undefined ? harness.checkoutId : overrides.checkoutId,
    checkoutSnapshotId:
      overrides.checkoutSnapshotId === undefined
        ? harness.checkoutSnapshotId
        : overrides.checkoutSnapshotId,
    paymentId:
      overrides.paymentId === undefined ? harness.paymentId : overrides.paymentId,
    orderId: overrides.orderId === undefined ? harness.orderId : overrides.orderId,
    refundId: overrides.refundId ?? null,
    priorFinancialDocumentId: overrides.priorFinancialDocumentId ?? null,
    placeOfSupplyStateCode:
      overrides.placeOfSupplyStateCode === undefined
        ? "27"
        : overrides.placeOfSupplyStateCode,
    recipientDisplayName: overrides.recipientDisplayName ?? "Guest",
    recipientPhoneE164: overrides.recipientPhoneE164 ?? "+919876543210",
    recipientAddress:
      overrides.recipientAddress ?? "12 Test Street, Mumbai, 27, 400001",
    taxableTotalPaise: overrides.taxableTotalPaise,
    taxTotalPaise: overrides.taxTotalPaise,
    discountTotalPaise: overrides.discountTotalPaise,
    chargeTotalPaise: overrides.chargeTotalPaise,
    grandTotalPaise: overrides.grandTotalPaise,
  };
}
