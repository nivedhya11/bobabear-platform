CREATE TABLE "app"."refund_statutory_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_id" uuid NOT NULL,
	"status" text NOT NULL,
	"disposition" text,
	"logical_idempotency_key" text NOT NULL,
	"sealed_prior_receipt_voucher_id" uuid,
	"sealed_prior_tax_invoice_id" uuid,
	"sealed_section34_qualification_code" text,
	"sealed_section34_qualification_facts" text,
	"sealed_reversal_scope" text,
	"sealed_reversal_amount_paise" bigint,
	"sealed_allocation_authority" text,
	"sealed_no_supply_authority_kind" text,
	"sealed_no_statutory_document_rationale" text,
	"sealed_referenced_commercial_fact_refs" text,
	"branch_finalized_at" timestamp with time zone,
	"branch_finalized_by_actor_kind" text,
	"branch_finalized_by_actor_id" text,
	"issued_financial_document_id" uuid,
	"issued_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"pending_at" timestamp with time zone NOT NULL,
	CONSTRAINT "refund_statutory_decisions_status_check" CHECK ("app"."refund_statutory_decisions"."status" in ('PENDING', 'BRANCH_FINALIZED', 'ISSUED')),
	CONSTRAINT "refund_statutory_decisions_disposition_check" CHECK ("app"."refund_statutory_decisions"."disposition" is null
        or "app"."refund_statutory_decisions"."disposition" in (
          'NO_STATUTORY_DOCUMENT',
          'REFUND_VOUCHER',
          'CREDIT_NOTE'
        )),
	CONSTRAINT "refund_statutory_decisions_logical_key_matches_refund_check" CHECK ("app"."refund_statutory_decisions"."logical_idempotency_key"
        = ('refund:' || "app"."refund_statutory_decisions"."refund_id"::text || ':STATUTORY_REVERSAL')),
	CONSTRAINT "refund_statutory_decisions_reversal_scope_check" CHECK ("app"."refund_statutory_decisions"."sealed_reversal_scope" is null
        or "app"."refund_statutory_decisions"."sealed_reversal_scope" in ('FULL', 'PARTIAL')),
	CONSTRAINT "refund_statutory_decisions_no_supply_kind_check" CHECK ("app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
        or "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" = 'ORDER_CANCELLED'),
	CONSTRAINT "refund_statutory_decisions_reversal_amount_positive_check" CHECK ("app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is null
        or "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" > 0),
	CONSTRAINT "refund_statutory_decisions_updated_at_after_created_at_check" CHECK ("app"."refund_statutory_decisions"."updated_at" >= "app"."refund_statutory_decisions"."created_at"),
	CONSTRAINT "refund_statutory_decisions_pending_state_check" CHECK (("app"."refund_statutory_decisions"."status" <> 'PENDING')
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
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is null
          and "app"."refund_statutory_decisions"."sealed_referenced_commercial_fact_refs" is null
          and "app"."refund_statutory_decisions"."branch_finalized_at" is null
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_kind" is null
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_id" is null
          and "app"."refund_statutory_decisions"."issued_financial_document_id" is null
          and "app"."refund_statutory_decisions"."issued_at" is null
          and "app"."refund_statutory_decisions"."pending_at" is not null
        )),
	CONSTRAINT "refund_statutory_decisions_branch_finalized_common_check" CHECK (("app"."refund_statutory_decisions"."status" not in ('BRANCH_FINALIZED', 'ISSUED'))
        or (
          "app"."refund_statutory_decisions"."disposition" is not null
          and "app"."refund_statutory_decisions"."branch_finalized_at" is not null
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_kind" is not null
          and length(trim("app"."refund_statutory_decisions"."branch_finalized_by_actor_kind")) > 0
          and "app"."refund_statutory_decisions"."branch_finalized_by_actor_id" is not null
          and length(trim("app"."refund_statutory_decisions"."branch_finalized_by_actor_id")) > 0
        )),
	CONSTRAINT "refund_statutory_decisions_no_statutory_document_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'NO_STATUTORY_DOCUMENT')
        or (
          "app"."refund_statutory_decisions"."status" = 'BRANCH_FINALIZED'
          and "app"."refund_statutory_decisions"."issued_financial_document_id" is null
          and "app"."refund_statutory_decisions"."issued_at" is null
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is null
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is null
          and "app"."refund_statutory_decisions"."sealed_allocation_authority" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is not null
          and length(trim("app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale")) > 0
        )),
	CONSTRAINT "refund_statutory_decisions_refund_voucher_branch_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'REFUND_VOUCHER')
        or (
          "app"."refund_statutory_decisions"."status" in ('BRANCH_FINALIZED', 'ISSUED')
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is not null
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_facts" is null
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
        )),
	CONSTRAINT "refund_statutory_decisions_credit_note_branch_check" CHECK (("app"."refund_statutory_decisions"."disposition" is distinct from 'CREDIT_NOTE')
        or (
          "app"."refund_statutory_decisions"."status" in ('BRANCH_FINALIZED', 'ISSUED')
          and "app"."refund_statutory_decisions"."sealed_prior_tax_invoice_id" is not null
          and "app"."refund_statutory_decisions"."sealed_prior_receipt_voucher_id" is null
          and "app"."refund_statutory_decisions"."sealed_no_statutory_document_rationale" is null
          and "app"."refund_statutory_decisions"."sealed_no_supply_authority_kind" is null
          and "app"."refund_statutory_decisions"."sealed_section34_qualification_code" is not null
          and length(trim("app"."refund_statutory_decisions"."sealed_section34_qualification_code")) > 0
          and "app"."refund_statutory_decisions"."sealed_reversal_scope" is not null
          and "app"."refund_statutory_decisions"."sealed_reversal_amount_paise" is not null
          and (
            "app"."refund_statutory_decisions"."sealed_reversal_scope" <> 'PARTIAL'
            or (
              "app"."refund_statutory_decisions"."sealed_allocation_authority" is not null
              and length(trim("app"."refund_statutory_decisions"."sealed_allocation_authority")) > 0
            )
          )
        )),
	CONSTRAINT "refund_statutory_decisions_issued_state_check" CHECK (("app"."refund_statutory_decisions"."status" <> 'ISSUED')
        or (
          "app"."refund_statutory_decisions"."disposition" in ('REFUND_VOUCHER', 'CREDIT_NOTE')
          and "app"."refund_statutory_decisions"."issued_financial_document_id" is not null
          and "app"."refund_statutory_decisions"."issued_at" is not null
        )),
	CONSTRAINT "refund_statutory_decisions_issued_absent_unless_issued_check" CHECK (("app"."refund_statutory_decisions"."status" = 'ISSUED')
        or (
          "app"."refund_statutory_decisions"."issued_financial_document_id" is null
          and "app"."refund_statutory_decisions"."issued_at" is null
        ))
);
--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_refund_fk" FOREIGN KEY ("refund_id") REFERENCES "app"."refunds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_prior_receipt_voucher_fk" FOREIGN KEY ("sealed_prior_receipt_voucher_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_prior_tax_invoice_fk" FOREIGN KEY ("sealed_prior_tax_invoice_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_decisions" ADD CONSTRAINT "refund_statutory_decisions_issued_financial_document_fk" FOREIGN KEY ("issued_financial_document_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refund_statutory_decisions_refund_uidx" ON "app"."refund_statutory_decisions" USING btree ("refund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_statutory_decisions_logical_key_uidx" ON "app"."refund_statutory_decisions" USING btree ("logical_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_statutory_decisions_issued_fd_uidx" ON "app"."refund_statutory_decisions" USING btree ("issued_financial_document_id") WHERE "app"."refund_statutory_decisions"."issued_financial_document_id" is not null;--> statement-breakpoint
CREATE INDEX "refund_statutory_decisions_status_idx" ON "app"."refund_statutory_decisions" USING btree ("status");--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_refund_statutory_decision_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.refund_id IS DISTINCT FROM OLD.refund_id
     OR NEW.logical_idempotency_key IS DISTINCT FROM OLD.logical_idempotency_key
     OR NEW.pending_at IS DISTINCT FROM OLD.pending_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'RefundStatutoryDecision identity fields are immutable (D-366 / ARCH-G17)';
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER refund_statutory_decisions_forbid_identity_mutation
BEFORE UPDATE ON app.refund_statutory_decisions
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_decision_identity_mutation();
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TRIGGER refund_statutory_decisions_forbid_sealed_mutation
BEFORE UPDATE ON app.refund_statutory_decisions
FOR EACH ROW
EXECUTE FUNCTION app.forbid_sealed_refund_statutory_decision_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_refund_statutory_decision_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'RefundStatutoryDecision statutory history cannot be deleted (D-366 / ARCH-G17)';
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER refund_statutory_decisions_forbid_delete
BEFORE DELETE ON app.refund_statutory_decisions
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_decision_delete();
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON app.refund_statutory_decisions FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_statutory_decisions FROM boba_bear_app;
  END IF;
END
$priv$;
