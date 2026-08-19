/**
 * Drizzle schema for RefundStatutoryDecision persistence (IMP-028 / D-366).
 *
 * Exactly one durable statutory-reversal decision per Refund.
 * PENDING stores no disposition and no sealed RFV/CN/NO_STATUTORY facts.
 * Application finalization may seal BRANCH_FINALIZED; ISSUED / RFV/CN
 * FinancialDocument issuance is not implemented by D-366 Slice 2.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { financialDocumentsTable } from "./financial-document";
import { appSchema } from "./index";
import { refundsTable } from "./refund";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

export const refundStatutoryDecisionsTable = appSchema.table(
  "refund_statutory_decisions",
  {
    id: uuid("id").primaryKey(),
    refundId: uuid("refund_id").notNull(),
    status: text("status").notNull(),
    disposition: text("disposition"),
    logicalIdempotencyKey: text("logical_idempotency_key").notNull(),
    sealedPriorReceiptVoucherId: uuid("sealed_prior_receipt_voucher_id"),
    sealedPriorTaxInvoiceId: uuid("sealed_prior_tax_invoice_id"),
    sealedSection34QualificationCode: text(
      "sealed_section34_qualification_code",
    ),
    sealedSection34QualificationFacts: text(
      "sealed_section34_qualification_facts",
    ),
    sealedReversalScope: text("sealed_reversal_scope"),
    sealedReversalAmountPaise: paise("sealed_reversal_amount_paise"),
    sealedAllocationAuthority: text("sealed_allocation_authority"),
    sealedNoSupplyAuthorityKind: text("sealed_no_supply_authority_kind"),
    sealedNoStatutoryDocumentReasonCode: text(
      "sealed_no_statutory_document_reason_code",
    ),
    sealedNoStatutoryDocumentRationale: text(
      "sealed_no_statutory_document_rationale",
    ),
    sealedReferencedCommercialFactRefs: text(
      "sealed_referenced_commercial_fact_refs",
    ),
    branchFinalizedAt: timestamp("branch_finalized_at", {
      withTimezone: true,
    }),
    branchFinalizedByActorKind: text("branch_finalized_by_actor_kind"),
    branchFinalizedByActorId: text("branch_finalized_by_actor_id"),
    issuedFinancialDocumentId: uuid("issued_financial_document_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    pendingAt: timestamp("pending_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "refund_statutory_decisions_refund_fk",
      columns: [table.refundId],
      foreignColumns: [refundsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "refund_statutory_decisions_prior_receipt_voucher_fk",
      columns: [table.sealedPriorReceiptVoucherId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "refund_statutory_decisions_prior_tax_invoice_fk",
      columns: [table.sealedPriorTaxInvoiceId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "refund_statutory_decisions_issued_financial_document_fk",
      columns: [table.issuedFinancialDocumentId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("refund_statutory_decisions_refund_uidx").on(table.refundId),
    uniqueIndex("refund_statutory_decisions_logical_key_uidx").on(
      table.logicalIdempotencyKey,
    ),
    uniqueIndex("refund_statutory_decisions_issued_fd_uidx")
      .on(table.issuedFinancialDocumentId)
      .where(sql`${table.issuedFinancialDocumentId} is not null`),
    index("refund_statutory_decisions_status_idx").on(table.status),
    check(
      "refund_statutory_decisions_status_check",
      sql`${table.status} in ('PENDING', 'BRANCH_FINALIZED', 'ISSUED')`,
    ),
    check(
      "refund_statutory_decisions_disposition_check",
      sql`${table.disposition} is null
        or ${table.disposition} in (
          'NO_STATUTORY_DOCUMENT',
          'REFUND_VOUCHER',
          'CREDIT_NOTE'
        )`,
    ),
    check(
      "refund_statutory_decisions_logical_key_matches_refund_check",
      sql`${table.logicalIdempotencyKey}
        = ('refund:' || ${table.refundId}::text || ':STATUTORY_REVERSAL')`,
    ),
    check(
      "refund_statutory_decisions_reversal_scope_check",
      sql`${table.sealedReversalScope} is null
        or ${table.sealedReversalScope} in ('FULL', 'PARTIAL')`,
    ),
    check(
      "refund_statutory_decisions_no_supply_kind_check",
      sql`${table.sealedNoSupplyAuthorityKind} is null
        or ${table.sealedNoSupplyAuthorityKind} = 'ORDER_CANCELLED'`,
    ),
    check(
      "refund_statutory_decisions_section34_code_check",
      sql`${table.sealedSection34QualificationCode} is null
        or ${table.sealedSection34QualificationCode} in (
          'TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE',
          'GOODS_RETURNED_BY_RECIPIENT',
          'GOODS_OR_SERVICES_DEFICIENT'
        )`,
    ),
    check(
      "refund_statutory_decisions_nsd_reason_code_check",
      sql`${table.sealedNoStatutoryDocumentReasonCode} is null
        or ${table.sealedNoStatutoryDocumentReasonCode}
          = 'COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT'`,
    ),
    check(
      "refund_statutory_decisions_section34_only_for_cn_check",
      sql`(${table.disposition} = 'CREDIT_NOTE')
        or (
          ${table.sealedSection34QualificationCode} is null
          and ${table.sealedSection34QualificationFacts} is null
        )`,
    ),
    check(
      "refund_statutory_decisions_nsd_reason_only_for_nsd_check",
      sql`(${table.disposition} = 'NO_STATUTORY_DOCUMENT')
        or ${table.sealedNoStatutoryDocumentReasonCode} is null`,
    ),
    check(
      "refund_statutory_decisions_reversal_amount_positive_check",
      sql`${table.sealedReversalAmountPaise} is null
        or ${table.sealedReversalAmountPaise} > 0`,
    ),
    check(
      "refund_statutory_decisions_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "refund_statutory_decisions_pending_state_check",
      sql`(${table.status} <> 'PENDING')
        or (
          ${table.disposition} is null
          and ${table.sealedPriorReceiptVoucherId} is null
          and ${table.sealedPriorTaxInvoiceId} is null
          and ${table.sealedSection34QualificationCode} is null
          and ${table.sealedSection34QualificationFacts} is null
          and ${table.sealedReversalScope} is null
          and ${table.sealedReversalAmountPaise} is null
          and ${table.sealedAllocationAuthority} is null
          and ${table.sealedNoSupplyAuthorityKind} is null
          and ${table.sealedNoStatutoryDocumentReasonCode} is null
          and ${table.sealedNoStatutoryDocumentRationale} is null
          and ${table.sealedReferencedCommercialFactRefs} is null
          and ${table.branchFinalizedAt} is null
          and ${table.branchFinalizedByActorKind} is null
          and ${table.branchFinalizedByActorId} is null
          and ${table.issuedFinancialDocumentId} is null
          and ${table.issuedAt} is null
          and ${table.pendingAt} is not null
        )`,
    ),
    check(
      "refund_statutory_decisions_branch_finalized_common_check",
      sql`(${table.status} not in ('BRANCH_FINALIZED', 'ISSUED'))
        or (
          ${table.disposition} is not null
          and ${table.branchFinalizedAt} is not null
          and ${table.branchFinalizedByActorKind} is not null
          and length(trim(${table.branchFinalizedByActorKind})) > 0
          and ${table.branchFinalizedByActorId} is not null
          and length(trim(${table.branchFinalizedByActorId})) > 0
        )`,
    ),
    check(
      "refund_statutory_decisions_no_statutory_document_check",
      sql`(${table.disposition} is distinct from 'NO_STATUTORY_DOCUMENT')
        or (
          ${table.status} = 'BRANCH_FINALIZED'
          and ${table.issuedFinancialDocumentId} is null
          and ${table.issuedAt} is null
          and ${table.sealedPriorReceiptVoucherId} is null
          and ${table.sealedPriorTaxInvoiceId} is not null
          and ${table.sealedSection34QualificationCode} is null
          and ${table.sealedSection34QualificationFacts} is null
          and ${table.sealedReversalScope} is null
          and ${table.sealedReversalAmountPaise} is null
          and ${table.sealedAllocationAuthority} is null
          and ${table.sealedNoSupplyAuthorityKind} is null
          and ${table.sealedNoStatutoryDocumentReasonCode}
            = 'COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT'
          and ${table.sealedNoStatutoryDocumentRationale} is not null
          and length(trim(${table.sealedNoStatutoryDocumentRationale})) > 0
          and ${table.sealedReferencedCommercialFactRefs} is not null
          and length(trim(${table.sealedReferencedCommercialFactRefs})) > 0
        )`,
    ),
    check(
      "refund_statutory_decisions_refund_voucher_branch_check",
      sql`(${table.disposition} is distinct from 'REFUND_VOUCHER')
        or (
          ${table.status} in ('BRANCH_FINALIZED', 'ISSUED')
          and ${table.sealedPriorReceiptVoucherId} is not null
          and ${table.sealedPriorTaxInvoiceId} is null
          and ${table.sealedSection34QualificationCode} is null
          and ${table.sealedSection34QualificationFacts} is null
          and ${table.sealedNoStatutoryDocumentReasonCode} is null
          and ${table.sealedNoStatutoryDocumentRationale} is null
          and ${table.sealedNoSupplyAuthorityKind} is not null
          and ${table.sealedReversalScope} is not null
          and ${table.sealedReversalAmountPaise} is not null
          and (
            ${table.sealedReversalScope} <> 'PARTIAL'
            or (
              ${table.sealedAllocationAuthority} is not null
              and length(trim(${table.sealedAllocationAuthority})) > 0
            )
          )
        )`,
    ),
    check(
      "refund_statutory_decisions_credit_note_branch_check",
      sql`(${table.disposition} is distinct from 'CREDIT_NOTE')
        or (
          ${table.status} in ('BRANCH_FINALIZED', 'ISSUED')
          and ${table.sealedPriorTaxInvoiceId} is not null
          and ${table.sealedPriorReceiptVoucherId} is null
          and ${table.sealedNoStatutoryDocumentReasonCode} is null
          and ${table.sealedNoStatutoryDocumentRationale} is null
          and ${table.sealedNoSupplyAuthorityKind} is null
          and ${table.sealedSection34QualificationCode} in (
            'TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE',
            'GOODS_RETURNED_BY_RECIPIENT',
            'GOODS_OR_SERVICES_DEFICIENT'
          )
          and ${table.sealedSection34QualificationFacts} is not null
          and length(trim(${table.sealedSection34QualificationFacts})) > 0
          and ${table.sealedReversalScope} is not null
          and ${table.sealedReversalAmountPaise} is not null
          and (
            ${table.sealedReversalScope} <> 'PARTIAL'
            or (
              ${table.sealedAllocationAuthority} is not null
              and length(trim(${table.sealedAllocationAuthority})) > 0
            )
          )
        )`,
    ),
    check(
      "refund_statutory_decisions_issued_state_check",
      sql`(${table.status} <> 'ISSUED')
        or (
          ${table.disposition} in ('REFUND_VOUCHER', 'CREDIT_NOTE')
          and ${table.issuedFinancialDocumentId} is not null
          and ${table.issuedAt} is not null
        )`,
    ),
    check(
      "refund_statutory_decisions_issued_absent_unless_issued_check",
      sql`(${table.status} = 'ISSUED')
        or (
          ${table.issuedFinancialDocumentId} is null
          and ${table.issuedAt} is null
        )`,
    ),
  ],
);
