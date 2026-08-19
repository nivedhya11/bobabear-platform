CREATE TABLE "app"."refund_statutory_issuance_allocation_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"allocation_id" uuid NOT NULL,
	"source_financial_document_line_id" uuid NOT NULL,
	"allocated_taxable_or_base_amount_paise" bigint NOT NULL,
	CONSTRAINT "rsia_lines_allocated_base_positive_check" CHECK ("app"."refund_statutory_issuance_allocation_lines"."allocated_taxable_or_base_amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."refund_statutory_issuance_allocation_tax_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"allocation_id" uuid NOT NULL,
	"source_financial_document_tax_component_id" uuid NOT NULL,
	"source_financial_document_line_id" uuid NOT NULL,
	"tax_type" text NOT NULL,
	"tax_rate_bps" integer NOT NULL,
	"allocated_tax_amount_paise" bigint NOT NULL,
	CONSTRAINT "rsia_tax_type_check" CHECK ("app"."refund_statutory_issuance_allocation_tax_components"."tax_type" in ('cgst', 'sgst', 'utgst', 'igst')),
	CONSTRAINT "rsia_tax_rate_bps_check" CHECK ("app"."refund_statutory_issuance_allocation_tax_components"."tax_rate_bps" >= 0 and "app"."refund_statutory_issuance_allocation_tax_components"."tax_rate_bps" <= 10000),
	CONSTRAINT "rsia_tax_allocated_amount_positive_check" CHECK ("app"."refund_statutory_issuance_allocation_tax_components"."allocated_tax_amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."refund_statutory_issuance_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_statutory_decision_id" uuid NOT NULL,
	"logical_idempotency_key" text NOT NULL,
	"source_financial_document_id" uuid NOT NULL,
	"source_document_type" text NOT NULL,
	"sealed_reversal_amount_paise" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rsia_logical_key_matches_decision_check" CHECK ("app"."refund_statutory_issuance_allocations"."logical_idempotency_key"
        = ('refund-statutory-decision:' || "app"."refund_statutory_issuance_allocations"."refund_statutory_decision_id"::text || ':ISSUANCE_ALLOCATION')),
	CONSTRAINT "rsia_source_document_type_check" CHECK ("app"."refund_statutory_issuance_allocations"."source_document_type" in ('RECEIPT_VOUCHER', 'TAX_INVOICE')),
	CONSTRAINT "rsia_sealed_reversal_amount_positive_check" CHECK ("app"."refund_statutory_issuance_allocations"."sealed_reversal_amount_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_lines" ADD CONSTRAINT "rsia_lines_allocation_fk" FOREIGN KEY ("allocation_id") REFERENCES "app"."refund_statutory_issuance_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_lines" ADD CONSTRAINT "rsia_lines_source_line_fk" FOREIGN KEY ("source_financial_document_line_id") REFERENCES "app"."financial_document_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_tax_components" ADD CONSTRAINT "rsia_tax_allocation_fk" FOREIGN KEY ("allocation_id") REFERENCES "app"."refund_statutory_issuance_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_tax_components" ADD CONSTRAINT "rsia_tax_source_component_fk" FOREIGN KEY ("source_financial_document_tax_component_id") REFERENCES "app"."financial_document_line_tax_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_tax_components" ADD CONSTRAINT "rsia_tax_source_line_fk" FOREIGN KEY ("source_financial_document_line_id") REFERENCES "app"."financial_document_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocations" ADD CONSTRAINT "rsia_decision_fk" FOREIGN KEY ("refund_statutory_decision_id") REFERENCES "app"."refund_statutory_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocations" ADD CONSTRAINT "rsia_source_financial_document_fk" FOREIGN KEY ("source_financial_document_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rsia_lines_allocation_source_line_uidx" ON "app"."refund_statutory_issuance_allocation_lines" USING btree ("allocation_id","source_financial_document_line_id");--> statement-breakpoint
CREATE INDEX "rsia_lines_source_line_idx" ON "app"."refund_statutory_issuance_allocation_lines" USING btree ("source_financial_document_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsia_tax_allocation_source_component_uidx" ON "app"."refund_statutory_issuance_allocation_tax_components" USING btree ("allocation_id","source_financial_document_tax_component_id");--> statement-breakpoint
CREATE INDEX "rsia_tax_source_component_idx" ON "app"."refund_statutory_issuance_allocation_tax_components" USING btree ("source_financial_document_tax_component_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsia_decision_uidx" ON "app"."refund_statutory_issuance_allocations" USING btree ("refund_statutory_decision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsia_logical_key_uidx" ON "app"."refund_statutory_issuance_allocations" USING btree ("logical_idempotency_key");--> statement-breakpoint
CREATE INDEX "rsia_source_financial_document_idx" ON "app"."refund_statutory_issuance_allocations" USING btree ("source_financial_document_id");--> statement-breakpoint
-- Children may be constructed before the sealed parent row within one transaction.
-- After commit, parent existence makes further child inserts illegal.
ALTER TABLE "app"."refund_statutory_issuance_allocation_lines" ALTER CONSTRAINT "rsia_lines_allocation_fk" DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "app"."refund_statutory_issuance_allocation_tax_components" ALTER CONSTRAINT "rsia_tax_allocation_fk" DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_refund_statutory_issuance_allocation_child_append()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  parent_allocation_id uuid;
BEGIN
  parent_allocation_id := NEW.allocation_id;
  IF EXISTS (
    SELECT 1
    FROM app.refund_statutory_issuance_allocations a
    WHERE a.id = parent_allocation_id
  ) THEN
    RAISE EXCEPTION 'Sealed RefundStatutoryIssuanceAllocation aggregate is append-closed (D-366)';
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER rsia_lines_forbid_append
BEFORE INSERT ON app.refund_statutory_issuance_allocation_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_child_append();
--> statement-breakpoint
CREATE TRIGGER rsia_tax_forbid_append
BEFORE INSERT ON app.refund_statutory_issuance_allocation_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_child_append();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'Sealed RefundStatutoryIssuanceAllocation authority is immutable (D-366)';
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER rsia_forbid_update
BEFORE UPDATE ON app.refund_statutory_issuance_allocations
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
CREATE TRIGGER rsia_forbid_delete
BEFORE DELETE ON app.refund_statutory_issuance_allocations
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
CREATE TRIGGER rsia_lines_forbid_update
BEFORE UPDATE ON app.refund_statutory_issuance_allocation_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
CREATE TRIGGER rsia_lines_forbid_delete
BEFORE DELETE ON app.refund_statutory_issuance_allocation_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
CREATE TRIGGER rsia_tax_forbid_update
BEFORE UPDATE ON app.refund_statutory_issuance_allocation_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
CREATE TRIGGER rsia_tax_forbid_delete
BEFORE DELETE ON app.refund_statutory_issuance_allocation_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_refund_statutory_issuance_allocation_mutation();
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON app.refund_statutory_issuance_allocations FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_statutory_issuance_allocations FROM boba_bear_app;
    REVOKE UPDATE ON app.refund_statutory_issuance_allocations FROM boba_bear_app;
    REVOKE DELETE ON app.refund_statutory_issuance_allocation_lines FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_statutory_issuance_allocation_lines FROM boba_bear_app;
    REVOKE UPDATE ON app.refund_statutory_issuance_allocation_lines FROM boba_bear_app;
    REVOKE DELETE ON app.refund_statutory_issuance_allocation_tax_components FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_statutory_issuance_allocation_tax_components FROM boba_bear_app;
    REVOKE UPDATE ON app.refund_statutory_issuance_allocation_tax_components FROM boba_bear_app;
  END IF;
END
$priv$;