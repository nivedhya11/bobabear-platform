/**
 * Fixtures for IMP-028 Slice 8–9 Payment → RECEIPT_VOUCHER /
 * Order FULFILLED → TAX_INVOICE workflow tests.
 */
import {
  insertIssuerProfile,
  insertNumberingSeries,
} from "../../../src/server/financial-document";
import { deriveIndianFinancialYear } from "../../../src/shared/financial-document";
import type { Persistence } from "../../../src/server/persistence/types";
import { FIXED_NOW } from "./payment-fixtures";

export const WORKFLOW_FINANCIAL_YEAR = deriveIndianFinancialYear(FIXED_NOW);

const COMPLETE_GST = Object.freeze({
  gstLegalName: "NIVEDHYA11 HOSPITALITY PRIVATE LIMITED",
  gstin: "05AAJCN9151F1ZE",
  stateCode: "05",
  registrationScheme: "regular" as const,
  registrationStatus: "registered" as const,
  registeredAddressLine1: "8th Floor, C-802, HIG, MDDA Colony",
  registeredAddressLine2: "Near ISBT, Dehradun, Clement Town",
  registeredAddressCity: "Dehradun",
  registeredAddressPostalCode: "248002",
  defaultSacCode: "996331",
  reverseChargeApplicable: false,
});

export type ReceiptVoucherWorkflowConfig = Readonly<{
  issuerProfileId: string;
  receiptVoucherSeriesId: string;
  financialYear: string;
  legalEntityId: string;
}>;

export type TaxInvoiceWorkflowConfig = Readonly<{
  issuerProfileId: string;
  receiptVoucherSeriesId: string;
  taxInvoiceSeriesId: string;
  financialYear: string;
  legalEntityId: string;
}>;

export async function seedReceiptVoucherWorkflowConfig(
  persistence: Persistence,
  input: {
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    issuancePolicy?: "uninvoiced_advance" | "invoice_at_payment" | null;
    enableReceiptVoucher?: boolean;
    enableTaxInvoice?: boolean;
    createSeries?: boolean;
    duplicateSeries?: boolean;
    financialYear?: string;
    now?: Date;
  },
): Promise<ReceiptVoucherWorkflowConfig> {
  const now = input.now ?? new Date(FIXED_NOW.getTime());
  const financialYear = input.financialYear ?? WORKFLOW_FINANCIAL_YEAR;
  const issuancePolicy =
    input.issuancePolicy === undefined
      ? ("uninvoiced_advance" as const)
      : input.issuancePolicy;
  const enableReceiptVoucher = input.enableReceiptVoucher ?? true;
  const enableTaxInvoice = input.enableTaxInvoice ?? true;
  const createSeries = input.createSeries ?? true;

  return persistence.transaction(async (tx) => {
    const profile = await insertIssuerProfile(tx, {
      brandId: input.brandId,
      organizationId: input.organizationId,
      legalEntityId: input.legalEntityId,
      profileVersion: 1,
      ...COMPLETE_GST,
      enableTaxInvoice,
      enableBillOfSupply: false,
      enableReceiptVoucher,
      enableRefundVoucher: true,
      enableCreditNote: true,
      dynamicQrApplicable: false,
      issuancePolicy,
      validFrom: now,
      lifecycleStatus: "active",
      now,
    });

    let receiptVoucherSeriesId = "";
    if (createSeries) {
      const series = await insertNumberingSeries(tx, {
        legalEntityId: input.legalEntityId,
        documentType: "RECEIPT_VOUCHER",
        financialYear,
        seriesCode: "RV",
        prefix: "RV/2627/",
        now,
      });
      receiptVoucherSeriesId = series.id;
      if (input.duplicateSeries) {
        await insertNumberingSeries(tx, {
          legalEntityId: input.legalEntityId,
          documentType: "RECEIPT_VOUCHER",
          financialYear,
          seriesCode: "RV2",
          prefix: "RV2/2627/",
          now,
        });
      }
    }

    return Object.freeze({
      issuerProfileId: profile.id,
      receiptVoucherSeriesId,
      financialYear,
      legalEntityId: input.legalEntityId,
    });
  });
}

/**
 * Seed issuer profile + TAX_INVOICE (and optionally RECEIPT_VOUCHER) series
 * for Order FULFILLED → Tax Invoice workflow tests.
 */
export async function seedTaxInvoiceWorkflowConfig(
  persistence: Persistence,
  input: {
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    issuancePolicy?: "uninvoiced_advance" | "invoice_at_payment" | null;
    enableReceiptVoucher?: boolean;
    enableTaxInvoice?: boolean;
    createTaxInvoiceSeries?: boolean;
    createReceiptVoucherSeries?: boolean;
    duplicateTaxInvoiceSeries?: boolean;
    financialYear?: string;
    now?: Date;
  },
): Promise<TaxInvoiceWorkflowConfig> {
  const now = input.now ?? new Date(FIXED_NOW.getTime());
  const financialYear = input.financialYear ?? WORKFLOW_FINANCIAL_YEAR;
  const issuancePolicy =
    input.issuancePolicy === undefined
      ? ("uninvoiced_advance" as const)
      : input.issuancePolicy;
  const enableReceiptVoucher = input.enableReceiptVoucher ?? true;
  const enableTaxInvoice = input.enableTaxInvoice ?? true;
  const createTaxInvoiceSeries = input.createTaxInvoiceSeries ?? true;
  const createReceiptVoucherSeries = input.createReceiptVoucherSeries ?? true;

  return persistence.transaction(async (tx) => {
    const profile = await insertIssuerProfile(tx, {
      brandId: input.brandId,
      organizationId: input.organizationId,
      legalEntityId: input.legalEntityId,
      profileVersion: 1,
      ...COMPLETE_GST,
      enableTaxInvoice,
      enableBillOfSupply: false,
      enableReceiptVoucher,
      enableRefundVoucher: true,
      enableCreditNote: true,
      dynamicQrApplicable: false,
      issuancePolicy,
      validFrom: now,
      lifecycleStatus: "active",
      now,
    });

    let receiptVoucherSeriesId = "";
    if (createReceiptVoucherSeries) {
      const rvSeries = await insertNumberingSeries(tx, {
        legalEntityId: input.legalEntityId,
        documentType: "RECEIPT_VOUCHER",
        financialYear,
        seriesCode: "RV",
        prefix: "RV/2627/",
        now,
      });
      receiptVoucherSeriesId = rvSeries.id;
    }

    let taxInvoiceSeriesId = "";
    if (createTaxInvoiceSeries) {
      const tiSeries = await insertNumberingSeries(tx, {
        legalEntityId: input.legalEntityId,
        documentType: "TAX_INVOICE",
        financialYear,
        seriesCode: "TI",
        prefix: "TI/2627/",
        now,
      });
      taxInvoiceSeriesId = tiSeries.id;
      if (input.duplicateTaxInvoiceSeries) {
        await insertNumberingSeries(tx, {
          legalEntityId: input.legalEntityId,
          documentType: "TAX_INVOICE",
          financialYear,
          seriesCode: "TI2",
          prefix: "TI2/2627/",
          now,
        });
      }
    }

    return Object.freeze({
      issuerProfileId: profile.id,
      receiptVoucherSeriesId,
      taxInvoiceSeriesId,
      financialYear,
      legalEntityId: input.legalEntityId,
    });
  });
}
