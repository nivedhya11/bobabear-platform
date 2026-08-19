/**
 * Drizzle schema for RefundStatutoryIssuanceAllocation (IMP-028 / D-366 Slice 3A).
 *
 * Separate immutable PARTIAL statutory arithmetic authority.
 * RefundStatutoryDecision owns WHICH branch and WHY; this aggregate owns
 * EXACT PARTIAL line/tax-component arithmetic. FinancialDocument issuance
 * remains a later slice.
 *
 * Amounts are integer paise — never floating point.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  financialDocumentLineTaxComponentsTable,
  financialDocumentLinesTable,
  financialDocumentsTable,
} from "./financial-document";
import { appSchema } from "./index";
import { refundStatutoryDecisionsTable } from "./refund-statutory-decision";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

export const refundStatutoryIssuanceAllocationsTable = appSchema.table(
  "refund_statutory_issuance_allocations",
  {
    id: uuid("id").primaryKey(),
    refundStatutoryDecisionId: uuid("refund_statutory_decision_id").notNull(),
    logicalIdempotencyKey: text("logical_idempotency_key").notNull(),
    sourceFinancialDocumentId: uuid("source_financial_document_id").notNull(),
    sourceDocumentType: text("source_document_type").notNull(),
    sealedReversalAmountPaise: paise("sealed_reversal_amount_paise").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "rsia_decision_fk",
      columns: [table.refundStatutoryDecisionId],
      foreignColumns: [refundStatutoryDecisionsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "rsia_source_financial_document_fk",
      columns: [table.sourceFinancialDocumentId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("rsia_decision_uidx").on(table.refundStatutoryDecisionId),
    uniqueIndex("rsia_logical_key_uidx").on(table.logicalIdempotencyKey),
    index("rsia_source_financial_document_idx").on(table.sourceFinancialDocumentId),
    check(
      "rsia_logical_key_matches_decision_check",
      sql`${table.logicalIdempotencyKey}
        = ('refund-statutory-decision:' || ${table.refundStatutoryDecisionId}::text || ':ISSUANCE_ALLOCATION')`,
    ),
    check(
      "rsia_source_document_type_check",
      sql`${table.sourceDocumentType} in ('RECEIPT_VOUCHER', 'TAX_INVOICE')`,
    ),
    check(
      "rsia_sealed_reversal_amount_positive_check",
      sql`${table.sealedReversalAmountPaise} > 0`,
    ),
  ],
);

export const refundStatutoryIssuanceAllocationLinesTable = appSchema.table(
  "refund_statutory_issuance_allocation_lines",
  {
    id: uuid("id").primaryKey(),
    allocationId: uuid("allocation_id").notNull(),
    sourceFinancialDocumentLineId: uuid(
      "source_financial_document_line_id",
    ).notNull(),
    allocatedTaxableOrBaseAmountPaise: paise(
      "allocated_taxable_or_base_amount_paise",
    ).notNull(),
  },
  (table) => [
    foreignKey({
      name: "rsia_lines_allocation_fk",
      columns: [table.allocationId],
      foreignColumns: [refundStatutoryIssuanceAllocationsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "rsia_lines_source_line_fk",
      columns: [table.sourceFinancialDocumentLineId],
      foreignColumns: [financialDocumentLinesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("rsia_lines_allocation_source_line_uidx").on(
      table.allocationId,
      table.sourceFinancialDocumentLineId,
    ),
    index("rsia_lines_source_line_idx").on(table.sourceFinancialDocumentLineId),
    check(
      "rsia_lines_allocated_base_positive_check",
      sql`${table.allocatedTaxableOrBaseAmountPaise} > 0`,
    ),
  ],
);

export const refundStatutoryIssuanceAllocationTaxComponentsTable = appSchema.table(
  "refund_statutory_issuance_allocation_tax_components",
  {
    id: uuid("id").primaryKey(),
    allocationId: uuid("allocation_id").notNull(),
    sourceFinancialDocumentTaxComponentId: uuid(
      "source_financial_document_tax_component_id",
    ).notNull(),
    sourceFinancialDocumentLineId: uuid(
      "source_financial_document_line_id",
    ).notNull(),
    taxType: text("tax_type").notNull(),
    taxRateBps: integer("tax_rate_bps").notNull(),
    allocatedTaxAmountPaise: paise("allocated_tax_amount_paise").notNull(),
  },
  (table) => [
    foreignKey({
      name: "rsia_tax_allocation_fk",
      columns: [table.allocationId],
      foreignColumns: [refundStatutoryIssuanceAllocationsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "rsia_tax_source_component_fk",
      columns: [table.sourceFinancialDocumentTaxComponentId],
      foreignColumns: [financialDocumentLineTaxComponentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "rsia_tax_source_line_fk",
      columns: [table.sourceFinancialDocumentLineId],
      foreignColumns: [financialDocumentLinesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("rsia_tax_allocation_source_component_uidx").on(
      table.allocationId,
      table.sourceFinancialDocumentTaxComponentId,
    ),
    index("rsia_tax_source_component_idx").on(
      table.sourceFinancialDocumentTaxComponentId,
    ),
    check(
      "rsia_tax_type_check",
      sql`${table.taxType} in ('cgst', 'sgst', 'utgst', 'igst')`,
    ),
    check(
      "rsia_tax_rate_bps_check",
      sql`${table.taxRateBps} >= 0 and ${table.taxRateBps} <= 10000`,
    ),
    check(
      "rsia_tax_allocated_amount_positive_check",
      sql`${table.allocatedTaxAmountPaise} > 0`,
    ),
  ],
);
