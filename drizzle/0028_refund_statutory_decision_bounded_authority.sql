ALTER TABLE "app"."refund_statutory_decisions" DROP CONSTRAINT "refund_statutory_decisions_pending_state_check";--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" DROP CONSTRAINT "refund_statutory_decisions_no_statutory_document_check";--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" DROP CONSTRAINT "refund_statutory_decisions_refund_voucher_branch_check";--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" DROP CONSTRAINT "refund_statutory_decisions_credit_note_branch_check";--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD COLUMN "sealed_no_statutory_document_reason_code" text;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_section34_code_check" CHECK ("app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
        or "app"."refund_statutory_decisions"."sealed_section34_qualification_code" in (
          'TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE',
          'GOODS_RETURNED_BY_RECIPIENT',
          'GOODS_OR_SERVICES_DEFICIENT'
        ));--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_nsd_reason_code_check" CHECK ("app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code" is null
        or "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code"
          = 'COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT');--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_section34_only_for_cn_check" CHECK (("app"."refund_statutory_decisions"."disposition" = 'CREDIT_NOTE')
        or (
          "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
        ));--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_nsd_reason_only_for_nsd_check" CHECK (("app"."refund_statutory_decisions"."disposition" = 'NO_STATUTORY_DOCUMENT')
        or "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code" is null);--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_pending_state_check" CHECK (("app"."refund_statutory_decisions"."status" <> 'PENDING')
        or (
          "app"."refund_statutory_decisions"."disposition" is null
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is null
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is null
          and "app"."refund_statutory_decisions"."sealed_allocation_authority" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is null
          and "app"."refund_statutory_decisions"."sealed_referenced_commercial_fact_refs" is null
          and "app"."refund_statutory_decisions"."branch_finalized_at" is null
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_kind" is null
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_id" is null
          and "app"."refund_statutory_decisions"."issued_financial_document_id" is null
          and "app"."refund_statutory_decisions"."issued_at" is null
          and "app"."refund_statutory_decisions"."pending_at" is not null
        ));--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_no_statutory_document_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'NO_STATUTORY_DOCUMENT')
        or (
          "app"."refund_statutory_decisions"."status" = 'BRANCH_FINALIZED'
          and "app"."refund_statutory_decisions"."issued_financial_document_id" is null
          and "app"."refund_statutory_decisions"."issued_at" is null
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is null
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is not null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is null
          and "app"."refund_statutory_decisions"."sealed_allocation_authority" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code"
            = 'COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT'
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is not null
          and length(trim("app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale")) > 0
          and "app"."refund_statutory_decisions"."sealed_referenced_commercial_fact_refs" is not null
          and length(trim("app"."refund_statutory_decisions"."sealed_referenced_commercial_fact_refs")) > 0
        ));--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_refund_voucher_branch_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'REFUND_VOUCHER')
        or (
          "app"."refund_statutory_decisions"."status" in ('BRANCH_FINALIZED', 'ISSUED')
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is not null
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is not null
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is not null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is not null
          and (
            "app"."refund_statutory_decisions"."sealed_reversal_scope" <> 'PARTIAL'
            or (
              "app"."refund_statutory_decisions"."sealed_allocation_authority" is not null
              and length(trim("app"."refund_statutory_decisions"."sealed_allocation_authority")) > 0
            )
          )
        ));--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_credit_note_branch_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'CREDIT_NOTE')
        or (
          "app"."refund_statutory_decisions"."status" in ('BRANCH_FINALIZED', 'ISSUED')
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is not null
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_reason_code" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" in (
            'TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE',
            'GOODS_RETURNED_BY_RECIPIENT',
            'GOODS_OR_SERVICES_DEFICIENT'
          )
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is not null
          and length(trim("app"."refund_statutory_decisions"."sealed_section34_qualification_facts")) > 0
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is not null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is not null
          and (
            "app"."refund_statutory_decisions"."sealed_reversal_scope" <> 'PARTIAL'
            or (
              "app"."refund_statutory_decisions"."sealed_allocation_authority" is not null
              and length(trim("app"."refund_statutory_decisions"."sealed_allocation_authority")) > 0
            )
          )
        ));--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_sealed_refund_statutory_decision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Terminal sealed authority: ISSUED and NO_STATUTORY_DOCUMENT BRANCH_FINALIZED.
  IF OLD.status = 'ISSUED'
     OR (OLD.status = 'BRANCH_FINALIZED' AND OLD.disposition = 'NO_STATUTORY_DOCUMENT') THEN
    IF NEW IS DISTINCT FROM OLD THEN
      RAISE EXCEPTION 'Sealed RefundStatutoryDecision authority is immutable (D-366 / ARCH-G17)';
    END IF;
  END IF;

  -- Once RFV/CN branch is finalized, sealed branch facts are write-once.
  -- Later ISSUED association may only set status/issued_* /updated_at.
  IF OLD.status = 'BRANCH_FINALIZED'
     AND OLD.disposition IN ('REFUND_VOUCHER', 'CREDIT_NOTE') THEN
    IF NEW.disposition IS DISTINCT FROM OLD.disposition
       OR NEW.sealed_prior_receipt_voucher_id IS DISTINCT FROM OLD.sealed_prior_receipt_voucher_id
       OR NEW.sealed_prior_tax_invoice_id IS DISTINCT FROM OLD.sealed_prior_tax_invoice_id
       OR NEW.sealed_section34_qualification_code IS DISTINCT FROM OLD.sealed_section34_qualification_code
       OR NEW.sealed_section34_qualification_facts IS DISTINCT FROM OLD.sealed_section34_qualification_facts
       OR NEW.sealed_reversal_scope IS DISTINCT FROM OLD.sealed_reversal_scope
       OR NEW.sealed_reversal_amount_paise IS DISTINCT FROM OLD.sealed_reversal_amount_paise
       OR NEW.sealed_allocation_authority IS DISTINCT FROM OLD.sealed_allocation_authority
       OR NEW.sealed_no_supply_authority_kind IS DISTINCT FROM OLD.sealed_no_supply_authority_kind
       OR NEW.sealed_no_statutory_document_reason_code IS DISTINCT FROM OLD.sealed_no_statutory_document_reason_code
       OR NEW.sealed_no_statutory_document_rationale IS DISTINCT FROM OLD.sealed_no_statutory_document_rationale
       OR NEW.sealed_referenced_commercial_fact_refs IS DISTINCT FROM OLD.sealed_referenced_commercial_fact_refs
       OR NEW.branch_finalized_at IS DISTINCT FROM OLD.branch_finalized_at
       OR NEW.branch_finalized_by_actor_kind IS DISTINCT FROM OLD.branch_finalized_by_actor_kind
       OR NEW.branch_finalized_by_actor_id IS DISTINCT FROM OLD.branch_finalized_by_actor_id THEN
      RAISE EXCEPTION 'Finalized RefundStatutoryDecision branch facts are immutable (D-366 / ARCH-G17)';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'ISSUED' THEN
      RAISE EXCEPTION 'RefundStatutoryDecision may only advance BRANCH_FINALIZED to ISSUED (D-366 / ARCH-G17)';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;
