/**
 * Drizzle schema for Financial Document persistence (IMP-028 / D-365).
 *
 * Financial Document is first-class immutable issued statutory authority.
 * Consumes Checkout / Payment / Refund / Order / issuer profile without rewriting them.
 * Amounts are integer paise — never floating point.
 * TAX_RECEIPT is not a statutory type.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { checkoutSnapshotsTable } from "./checkout";
import { appSchema } from "./index";
import { legalEntitiesTable } from "./organizations";
import { ordersTable } from "./order";
import { paymentsTable } from "./payment";
import { legalEntityTaxProfilesTable } from "./pricing";
import { refundsTable } from "./refund";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

export const financialDocumentIssuerProfilesTable = appSchema.table(
  "financial_document_issuer_profiles",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    legalEntityTaxProfileId: uuid("legal_entity_tax_profile_id"),
    profileVersion: integer("profile_version").notNull(),
    gstLegalName: text("gst_legal_name"),
    gstin: text("gstin"),
    registeredAddressLine1: text("registered_address_line1"),
    registeredAddressLine2: text("registered_address_line2"),
    registeredAddressCity: text("registered_address_city"),
    registeredAddressPostalCode: text("registered_address_postal_code"),
    stateCode: text("state_code"),
    registrationScheme: text("registration_scheme"),
    registrationStatus: text("registration_status"),
    defaultSacCode: text("default_sac_code"),
    defaultHsnCode: text("default_hsn_code"),
    defaultTaxRateBps: integer("default_tax_rate_bps"),
    itcAllowed: boolean("itc_allowed"),
    placeOfSupplyPolicy: text("place_of_supply_policy"),
    reverseChargeApplicable: boolean("reverse_charge_applicable"),
    enableTaxInvoice: boolean("enable_tax_invoice").notNull().default(false),
    enableBillOfSupply: boolean("enable_bill_of_supply").notNull().default(false),
    enableReceiptVoucher: boolean("enable_receipt_voucher").notNull().default(false),
    enableRefundVoucher: boolean("enable_refund_voucher").notNull().default(false),
    enableCreditNote: boolean("enable_credit_note").notNull().default(false),
    dynamicQrApplicable: boolean("dynamic_qr_applicable"),
    issuancePolicy: text("issuance_policy"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "fd_issuer_profiles_legal_entity_ancestry_fk",
      columns: [table.legalEntityId, table.brandId, table.organizationId],
      foreignColumns: [
        legalEntitiesTable.id,
        legalEntitiesTable.brandId,
        legalEntitiesTable.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "fd_issuer_profiles_legal_entity_tax_profile_fk",
      columns: [table.legalEntityTaxProfileId],
      foreignColumns: [legalEntityTaxProfilesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("fd_issuer_profiles_entity_version_uidx").on(
      table.legalEntityId,
      table.profileVersion,
    ),
    // Composite identity for document→profile FK (entity + version must match).
    unique("fd_issuer_profiles_id_entity_version_key").on(
      table.id,
      table.legalEntityId,
      table.profileVersion,
    ),
    index("fd_issuer_profiles_legal_entity_status_idx").on(
      table.legalEntityId,
      table.lifecycleStatus,
    ),
    check(
      "fd_issuer_profiles_version_positive_check",
      sql`${table.profileVersion} > 0`,
    ),
    check(
      "fd_issuer_profiles_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    check(
      "fd_issuer_profiles_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or ${table.retiredAt} is null`,
    ),
    check(
      "fd_issuer_profiles_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "fd_issuer_profiles_valid_range_check",
      sql`${table.validTo} is null or ${table.validTo} > ${table.validFrom}`,
    ),
    check(
      "fd_issuer_profiles_registration_scheme_check",
      sql`${table.registrationScheme} is null or ${table.registrationScheme} in ('regular', 'composition')`,
    ),
    check(
      "fd_issuer_profiles_registration_status_check",
      sql`${table.registrationStatus} is null or ${table.registrationStatus} in ('registered', 'unregistered')`,
    ),
    check(
      "fd_issuer_profiles_gstin_format_check",
      sql`${table.gstin} is null or ${table.gstin} ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'`,
    ),
    check(
      "fd_issuer_profiles_state_code_check",
      sql`${table.stateCode} is null or ${table.stateCode} ~ '^[0-9]{2}$'`,
    ),
    check(
      "fd_issuer_profiles_gstin_state_prefix_check",
      sql`${table.gstin} is null or ${table.stateCode} is null or substring(${table.gstin} from 1 for 2) = ${table.stateCode}`,
    ),
    check(
      "fd_issuer_profiles_rate_bps_check",
      sql`${table.defaultTaxRateBps} is null or (${table.defaultTaxRateBps} >= 0 and ${table.defaultTaxRateBps} <= 10000)`,
    ),
    check(
      "fd_issuer_profiles_issuance_policy_check",
      sql`${table.issuancePolicy} is null or ${table.issuancePolicy} in ('uninvoiced_advance', 'invoice_at_payment')`,
    ),
    check(
      "fd_issuer_profiles_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const financialDocumentNumberingSeriesTable = appSchema.table(
  "financial_document_numbering_series",
  {
    id: uuid("id").primaryKey(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    documentType: text("document_type").notNull(),
    financialYear: text("financial_year").notNull(),
    seriesCode: text("series_code").notNull(),
    prefix: text("prefix").notNull(),
    nextSequence: bigint("next_sequence", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "fd_numbering_series_legal_entity_fk",
      columns: [table.legalEntityId],
      foreignColumns: [legalEntitiesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("fd_numbering_series_scope_uidx").on(
      table.legalEntityId,
      table.documentType,
      table.financialYear,
      table.seriesCode,
    ),
    // Composite identity for document→series scope FK (entity/type/FY must match).
    unique("fd_numbering_series_id_scope_key").on(
      table.id,
      table.legalEntityId,
      table.documentType,
      table.financialYear,
    ),
    check(
      "fd_numbering_series_document_type_check",
      sql`${table.documentType} in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')`,
    ),
    check(
      "fd_numbering_series_financial_year_check",
      sql`${table.financialYear} ~ '^[0-9]{4}-[0-9]{2}$'`,
    ),
    check(
      "fd_numbering_series_series_code_nonempty_check",
      sql`length(trim(${table.seriesCode})) > 0`,
    ),
    check(
      "fd_numbering_series_prefix_nonempty_check",
      sql`length(trim(${table.prefix})) > 0`,
    ),
    check(
      "fd_numbering_series_prefix_not_ord_check",
      sql`${table.prefix} !~ '^ORD-'`,
    ),
    check(
      "fd_numbering_series_next_sequence_positive_check",
      sql`${table.nextSequence} >= 1`,
    ),
    check(
      "fd_numbering_series_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const financialDocumentsTable = appSchema.table(
  "financial_documents",
  {
    id: uuid("id").primaryKey(),
    documentType: text("document_type").notNull(),
    status: text("status").notNull(),
    statutoryDocumentNumber: text("statutory_document_number").notNull(),
    issueAt: timestamp("issue_at", { withTimezone: true }).notNull(),
    financialYear: text("financial_year").notNull(),
    currency: text("currency").notNull(),
    logicalIssuanceKey: text("logical_issuance_key").notNull(),
    numberingSeriesId: uuid("numbering_series_id").notNull(),
    sequenceNumber: bigint("sequence_number", { mode: "bigint" }).notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    issuerProfileId: uuid("issuer_profile_id").notNull(),
    issuerProfileVersion: integer("issuer_profile_version").notNull(),
    supplierGstLegalName: text("supplier_gst_legal_name"),
    supplierGstin: text("supplier_gstin"),
    supplierRegisteredAddress: text("supplier_registered_address"),
    supplierStateCode: text("supplier_state_code"),
    supplierRegistrationScheme: text("supplier_registration_scheme"),
    recipientDisplayName: text("recipient_display_name"),
    recipientPhoneE164: text("recipient_phone_e164"),
    recipientAddress: text("recipient_address"),
    taxableTotalPaise: paise("taxable_total_paise").notNull(),
    taxTotalPaise: paise("tax_total_paise").notNull(),
    discountTotalPaise: paise("discount_total_paise").notNull(),
    chargeTotalPaise: paise("charge_total_paise").notNull(),
    grandTotalPaise: paise("grand_total_paise").notNull(),
    placeOfSupplyStateCode: text("place_of_supply_state_code"),
    reverseChargeApplicable: boolean("reverse_charge_applicable"),
    checkoutId: uuid("checkout_id"),
    checkoutSnapshotId: uuid("checkout_snapshot_id"),
    paymentId: uuid("payment_id"),
    refundId: uuid("refund_id"),
    orderId: uuid("order_id"),
    priorFinancialDocumentId: uuid("prior_financial_document_id"),
    priorDocumentType: text("prior_document_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Numbering series must match document legal entity + type + financial year.
    foreignKey({
      name: "financial_documents_numbering_series_scope_fk",
      columns: [
        table.numberingSeriesId,
        table.legalEntityId,
        table.documentType,
        table.financialYear,
      ],
      foreignColumns: [
        financialDocumentNumberingSeriesTable.id,
        financialDocumentNumberingSeriesTable.legalEntityId,
        financialDocumentNumberingSeriesTable.documentType,
        financialDocumentNumberingSeriesTable.financialYear,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_documents_legal_entity_fk",
      columns: [table.legalEntityId],
      foreignColumns: [legalEntitiesTable.id],
    }).onDelete("restrict"),
    // Issuer profile id must belong to the document legal entity at the claimed version.
    foreignKey({
      name: "financial_documents_issuer_profile_identity_fk",
      columns: [
        table.issuerProfileId,
        table.legalEntityId,
        table.issuerProfileVersion,
      ],
      foreignColumns: [
        financialDocumentIssuerProfilesTable.id,
        financialDocumentIssuerProfilesTable.legalEntityId,
        financialDocumentIssuerProfilesTable.profileVersion,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_documents_checkout_snapshot_ownership_fk",
      columns: [table.checkoutSnapshotId, table.checkoutId],
      foreignColumns: [
        checkoutSnapshotsTable.id,
        checkoutSnapshotsTable.checkoutId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_documents_payment_fk",
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_documents_refund_fk",
      columns: [table.refundId],
      foreignColumns: [refundsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_documents_order_fk",
      columns: [table.orderId],
      foreignColumns: [ordersTable.id],
    }).onDelete("restrict"),
    // Section 34: denormalized prior_document_type must match the referenced row.
    foreignKey({
      name: "financial_documents_prior_document_identity_fk",
      columns: [table.priorFinancialDocumentId, table.priorDocumentType],
      foreignColumns: [table.id, table.documentType],
    }).onDelete("restrict"),
    unique("financial_documents_id_document_type_key").on(
      table.id,
      table.documentType,
    ),
    uniqueIndex("financial_documents_logical_issuance_key_uidx").on(
      table.logicalIssuanceKey,
    ),
    uniqueIndex("financial_documents_series_sequence_uidx").on(
      table.numberingSeriesId,
      table.sequenceNumber,
    ),
    uniqueIndex("financial_documents_series_number_uidx").on(
      table.numberingSeriesId,
      table.statutoryDocumentNumber,
    ),
    index("financial_documents_checkout_snapshot_idx").on(table.checkoutSnapshotId),
    index("financial_documents_payment_idx").on(table.paymentId),
    index("financial_documents_order_idx").on(table.orderId),
    index("financial_documents_prior_document_idx").on(table.priorFinancialDocumentId),
    check(
      "financial_documents_document_type_check",
      sql`${table.documentType} in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')`,
    ),
    check("financial_documents_status_check", sql`${table.status} = 'ISSUED'`),
    check(
      "financial_documents_currency_check",
      sql`${table.currency} = 'INR'`,
    ),
    check(
      "financial_documents_financial_year_check",
      sql`${table.financialYear} ~ '^[0-9]{4}-[0-9]{2}$'`,
    ),
    check(
      "financial_documents_statutory_number_nonempty_check",
      sql`length(trim(${table.statutoryDocumentNumber})) > 0`,
    ),
    check(
      "financial_documents_statutory_number_not_ord_check",
      sql`${table.statutoryDocumentNumber} !~ '^ORD-'`,
    ),
    check(
      "financial_documents_logical_issuance_key_nonempty_check",
      sql`length(trim(${table.logicalIssuanceKey})) > 0`,
    ),
    check(
      "financial_documents_sequence_positive_check",
      sql`${table.sequenceNumber} >= 1`,
    ),
    check(
      "financial_documents_issuer_profile_version_positive_check",
      sql`${table.issuerProfileVersion} > 0`,
    ),
    check(
      "financial_documents_amounts_nonnegative_check",
      sql`${table.taxableTotalPaise} >= 0
        and ${table.taxTotalPaise} >= 0
        and ${table.discountTotalPaise} >= 0
        and ${table.chargeTotalPaise} >= 0
        and ${table.grandTotalPaise} >= 0`,
    ),
    check(
      "financial_documents_supplier_scheme_check",
      sql`${table.supplierRegistrationScheme} is null
        or ${table.supplierRegistrationScheme} in ('regular', 'composition')`,
    ),
    check(
      "financial_documents_supplier_state_code_check",
      sql`${table.supplierStateCode} is null or ${table.supplierStateCode} ~ '^[0-9]{2}$'`,
    ),
    check(
      "financial_documents_place_of_supply_state_code_check",
      sql`${table.placeOfSupplyStateCode} is null or ${table.placeOfSupplyStateCode} ~ '^[0-9]{2}$'`,
    ),
    check(
      "financial_documents_snapshot_pair_check",
      sql`(${table.checkoutSnapshotId} is null and ${table.checkoutId} is null)
        or (${table.checkoutSnapshotId} is not null and ${table.checkoutId} is not null)`,
    ),
    check(
      "financial_documents_prior_type_check",
      sql`${table.priorDocumentType} is null
        or ${table.priorDocumentType} in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')`,
    ),
    check(
      "financial_documents_credit_note_prior_check",
      sql`(${table.documentType} <> 'CREDIT_NOTE')
        or (
          ${table.priorFinancialDocumentId} is not null
          and ${table.priorDocumentType} = 'TAX_INVOICE'
        )`,
    ),
    check(
      "financial_documents_refund_voucher_prior_check",
      sql`(${table.documentType} <> 'REFUND_VOUCHER')
        or (
          ${table.priorFinancialDocumentId} is not null
          and ${table.priorDocumentType} = 'RECEIPT_VOUCHER'
        )`,
    ),
    check(
      "financial_documents_prior_pair_check",
      sql`(${table.priorFinancialDocumentId} is null and ${table.priorDocumentType} is null)
        or (${table.priorFinancialDocumentId} is not null and ${table.priorDocumentType} is not null)`,
    ),
  ],
);

export const financialDocumentLinesTable = appSchema.table(
  "financial_document_lines",
  {
    id: uuid("id").primaryKey(),
    financialDocumentId: uuid("financial_document_id").notNull(),
    lineNumber: integer("line_number").notNull(),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPaise: paise("unit_paise").notNull(),
    discountPaise: paise("discount_paise").notNull(),
    chargePaise: paise("charge_paise").notNull(),
    taxableValuePaise: paise("taxable_value_paise").notNull(),
    lineTotalPaise: paise("line_total_paise").notNull(),
    sacCode: text("sac_code"),
    hsnCode: text("hsn_code"),
    historicalCatalogItemId: text("historical_catalog_item_id"),
  },
  (table) => [
    foreignKey({
      name: "financial_document_lines_document_fk",
      columns: [table.financialDocumentId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("financial_document_lines_document_line_uidx").on(
      table.financialDocumentId,
      table.lineNumber,
    ),
    check(
      "financial_document_lines_line_number_positive_check",
      sql`${table.lineNumber} > 0`,
    ),
    check(
      "financial_document_lines_description_nonempty_check",
      sql`length(trim(${table.description})) > 0`,
    ),
    check(
      "financial_document_lines_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "financial_document_lines_amounts_nonnegative_check",
      sql`${table.unitPaise} >= 0
        and ${table.discountPaise} >= 0
        and ${table.chargePaise} >= 0
        and ${table.taxableValuePaise} >= 0
        and ${table.lineTotalPaise} >= 0`,
    ),
  ],
);

export const financialDocumentLineTaxComponentsTable = appSchema.table(
  "financial_document_line_tax_components",
  {
    id: uuid("id").primaryKey(),
    financialDocumentLineId: uuid("financial_document_line_id").notNull(),
    taxType: text("tax_type").notNull(),
    rateBps: integer("rate_bps").notNull(),
    taxableAmountPaise: paise("taxable_amount_paise").notNull(),
    taxAmountPaise: paise("tax_amount_paise").notNull(),
  },
  (table) => [
    foreignKey({
      name: "fd_line_tax_components_line_fk",
      columns: [table.financialDocumentLineId],
      foreignColumns: [financialDocumentLinesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("fd_line_tax_components_line_type_uidx").on(
      table.financialDocumentLineId,
      table.taxType,
    ),
    check(
      "fd_line_tax_components_tax_type_check",
      sql`${table.taxType} in ('cgst', 'sgst', 'utgst', 'igst')`,
    ),
    check(
      "fd_line_tax_components_rate_bps_check",
      sql`${table.rateBps} >= 0 and ${table.rateBps} <= 10000`,
    ),
    check(
      "fd_line_tax_components_amounts_nonnegative_check",
      sql`${table.taxableAmountPaise} >= 0 and ${table.taxAmountPaise} >= 0`,
    ),
  ],
);
