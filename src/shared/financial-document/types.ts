/**
 * Financial Document domain types (IMP-028 / D-365).
 */
import type {
  FinancialDocumentIssuancePolicy,
  FinancialDocumentIssuerProfileLifecycleStatus,
  FinancialDocumentRegistrationScheme,
  FinancialDocumentStatus,
  FinancialDocumentStatutoryType,
  FinancialDocumentTaxType,
} from "./constants";

export type {
  FinancialDocumentIssuancePolicy,
  FinancialDocumentIssuerProfileLifecycleStatus,
  FinancialDocumentRegistrationScheme,
  FinancialDocumentStatus,
  FinancialDocumentStatutoryType,
  FinancialDocumentTaxType,
} from "./constants";

export type FinancialDocumentIssuerProfile = Readonly<{
  id: string;
  brandId: string;
  organizationId: string;
  legalEntityId: string;
  legalEntityTaxProfileId: string | null;
  profileVersion: number;
  gstLegalName: string | null;
  gstin: string | null;
  registeredAddressLine1: string | null;
  registeredAddressLine2: string | null;
  registeredAddressCity: string | null;
  registeredAddressPostalCode: string | null;
  stateCode: string | null;
  registrationScheme: FinancialDocumentRegistrationScheme | null;
  registrationStatus: "registered" | "unregistered" | null;
  defaultSacCode: string | null;
  defaultHsnCode: string | null;
  defaultTaxRateBps: number | null;
  itcAllowed: boolean | null;
  placeOfSupplyPolicy: string | null;
  /**
   * Explicit reverse-charge authority for statutory indication.
   * Null means unset (incomplete for types that require RCM indication).
   * Never inferred from tax rates/amounts/GSTIN/customer type.
   */
  reverseChargeApplicable: boolean | null;
  enableTaxInvoice: boolean;
  enableBillOfSupply: boolean;
  enableReceiptVoucher: boolean;
  enableRefundVoucher: boolean;
  enableCreditNote: boolean;
  dynamicQrApplicable: boolean | null;
  issuancePolicy: FinancialDocumentIssuancePolicy | null;
  validFrom: Date;
  validTo: Date | null;
  lifecycleStatus: FinancialDocumentIssuerProfileLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  retiredAt: Date | null;
}>;

export type FinancialDocumentNumberingSeries = Readonly<{
  id: string;
  legalEntityId: string;
  documentType: FinancialDocumentStatutoryType;
  financialYear: string;
  seriesCode: string;
  prefix: string;
  nextSequence: bigint;
  createdAt: Date;
  updatedAt: Date;
}>;

export type FinancialDocumentLineTaxComponent = Readonly<{
  id: string;
  financialDocumentLineId: string;
  taxType: FinancialDocumentTaxType;
  rateBps: number;
  taxableAmountPaise: bigint;
  taxAmountPaise: bigint;
}>;

export type FinancialDocumentLine = Readonly<{
  id: string;
  financialDocumentId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  discountPaise: bigint;
  chargePaise: bigint;
  taxableValuePaise: bigint;
  lineTotalPaise: bigint;
  sacCode: string | null;
  hsnCode: string | null;
  /** Opaque historical catalog identity — never a live FK to mutable catalog. */
  historicalCatalogItemId: string | null;
  taxComponents: readonly FinancialDocumentLineTaxComponent[];
}>;

export type FinancialDocument = Readonly<{
  id: string;
  documentType: FinancialDocumentStatutoryType;
  status: FinancialDocumentStatus;
  statutoryDocumentNumber: string;
  issueAt: Date;
  financialYear: string;
  currency: "INR";
  logicalIssuanceKey: string;
  numberingSeriesId: string;
  sequenceNumber: bigint;
  legalEntityId: string;
  issuerProfileId: string;
  issuerProfileVersion: number;
  supplierGstLegalName: string | null;
  supplierGstin: string | null;
  supplierRegisteredAddress: string | null;
  supplierStateCode: string | null;
  supplierRegistrationScheme: FinancialDocumentRegistrationScheme | null;
  recipientDisplayName: string | null;
  recipientPhoneE164: string | null;
  recipientAddress: string | null;
  taxableTotalPaise: bigint;
  taxTotalPaise: bigint;
  discountTotalPaise: bigint;
  chargeTotalPaise: bigint;
  grandTotalPaise: bigint;
  placeOfSupplyStateCode: string | null;
  /**
   * Sealed reverse-charge indication authority at issuance.
   * Null only for pre-C1 historical rows; new issuance seals boolean for
   * types that require the particular.
   */
  reverseChargeApplicable: boolean | null;
  checkoutId: string | null;
  checkoutSnapshotId: string | null;
  paymentId: string | null;
  refundId: string | null;
  orderId: string | null;
  priorFinancialDocumentId: string | null;
  priorDocumentType: FinancialDocumentStatutoryType | null;
  createdAt: Date;
  lines: readonly FinancialDocumentLine[];
}>;

export type AllocateStatutoryNumberInput = Readonly<{
  numberingSeriesId: string;
  now: Date;
}>;

export type AllocatedStatutoryNumber = Readonly<{
  numberingSeriesId: string;
  sequenceNumber: bigint;
  statutoryDocumentNumber: string;
  financialYear: string;
  documentType: FinancialDocumentStatutoryType;
}>;

export type InsertFinancialDocumentLineInput = Readonly<{
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  discountPaise: bigint;
  chargePaise: bigint;
  taxableValuePaise: bigint;
  lineTotalPaise: bigint;
  sacCode?: string | null;
  hsnCode?: string | null;
  historicalCatalogItemId?: string | null;
  taxComponents?: readonly Readonly<{
    taxType: FinancialDocumentTaxType;
    rateBps: number;
    taxableAmountPaise: bigint;
    taxAmountPaise: bigint;
  }>[];
}>;

export type InsertFinancialDocumentInput = Readonly<{
  documentType: FinancialDocumentStatutoryType;
  statutoryDocumentNumber: string;
  issueAt: Date;
  financialYear: string;
  logicalIssuanceKey: string;
  numberingSeriesId: string;
  sequenceNumber: bigint;
  legalEntityId: string;
  issuerProfileId: string;
  issuerProfileVersion: number;
  supplierGstLegalName?: string | null;
  supplierGstin?: string | null;
  supplierRegisteredAddress?: string | null;
  supplierStateCode?: string | null;
  supplierRegistrationScheme?: FinancialDocumentRegistrationScheme | null;
  recipientDisplayName?: string | null;
  recipientPhoneE164?: string | null;
  recipientAddress?: string | null;
  taxableTotalPaise: bigint;
  taxTotalPaise: bigint;
  discountTotalPaise: bigint;
  chargeTotalPaise: bigint;
  grandTotalPaise: bigint;
  placeOfSupplyStateCode?: string | null;
  reverseChargeApplicable?: boolean | null;
  checkoutId?: string | null;
  checkoutSnapshotId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  orderId?: string | null;
  priorFinancialDocumentId?: string | null;
  priorDocumentType?: FinancialDocumentStatutoryType | null;
  lines: readonly InsertFinancialDocumentLineInput[];
  now: Date;
}>;

/** Application-level issuance command (IMP-028 Slice 2). Totals are derived. */
export type IssueFinancialDocumentLineCommand = Readonly<{
  lineNumber: number;
  description: string;
  quantity: number;
  unitPaise: bigint;
  discountPaise: bigint;
  chargePaise: bigint;
  taxableValuePaise: bigint;
  sacCode?: string | null;
  hsnCode?: string | null;
  historicalCatalogItemId?: string | null;
  taxComponents?: readonly Readonly<{
    taxType: FinancialDocumentTaxType;
    rateBps: number;
    taxableAmountPaise: bigint;
    /**
     * Optional. When present must equal canonical exclusive GST amount
     * from `taxExclusivePaise(taxableAmountPaise, rateBps)`. Persisted
     * amount is always the derived canonical value.
     */
    taxAmountPaise?: bigint;
  }>[];
}>;

export type IssueFinancialDocumentCommand = Readonly<{
  logicalIssuanceKey: string;
  documentType: FinancialDocumentStatutoryType;
  legalEntityId: string;
  financialYear: string;
  numberingSeriesId: string;
  issueAt: Date;
  lines: readonly IssueFinancialDocumentLineCommand[];
  /** Optional; when present must match sealed derived totals. */
  taxableTotalPaise?: bigint;
  taxTotalPaise?: bigint;
  discountTotalPaise?: bigint;
  chargeTotalPaise?: bigint;
  grandTotalPaise?: bigint;
  placeOfSupplyStateCode?: string | null;
  checkoutId?: string | null;
  checkoutSnapshotId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  orderId?: string | null;
  priorFinancialDocumentId?: string | null;
  recipientDisplayName?: string | null;
  recipientPhoneE164?: string | null;
  recipientAddress?: string | null;
}>;
