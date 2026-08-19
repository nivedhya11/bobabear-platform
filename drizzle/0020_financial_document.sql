CREATE TABLE "app"."financial_document_issuer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"legal_entity_tax_profile_id" uuid,
	"profile_version" integer NOT NULL,
	"gst_legal_name" text,
	"gstin" text,
	"registered_address_line1" text,
	"registered_address_line2" text,
	"registered_address_city" text,
	"registered_address_postal_code" text,
	"state_code" text,
	"registration_scheme" text,
	"registration_status" text,
	"default_sac_code" text,
	"default_hsn_code" text,
	"default_tax_rate_bps" integer,
	"itc_allowed" boolean,
	"place_of_supply_policy" text,
	"enable_tax_invoice" boolean DEFAULT false NOT NULL,
	"enable_bill_of_supply" boolean DEFAULT false NOT NULL,
	"enable_receipt_voucher" boolean DEFAULT false NOT NULL,
	"enable_refund_voucher" boolean DEFAULT false NOT NULL,
	"enable_credit_note" boolean DEFAULT false NOT NULL,
	"dynamic_qr_applicable" boolean,
	"issuance_policy" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "fd_issuer_profiles_version_positive_check" CHECK ("app"."financial_document_issuer_profiles"."profile_version" > 0),
	CONSTRAINT "fd_issuer_profiles_lifecycle_status_check" CHECK ("app"."financial_document_issuer_profiles"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "fd_issuer_profiles_active_state_check" CHECK ("app"."financial_document_issuer_profiles"."lifecycle_status" <> 'active' or "app"."financial_document_issuer_profiles"."retired_at" is null),
	CONSTRAINT "fd_issuer_profiles_retired_state_check" CHECK ("app"."financial_document_issuer_profiles"."lifecycle_status" <> 'retired' or "app"."financial_document_issuer_profiles"."retired_at" is not null),
	CONSTRAINT "fd_issuer_profiles_valid_range_check" CHECK ("app"."financial_document_issuer_profiles"."valid_to" is null or "app"."financial_document_issuer_profiles"."valid_to" > "app"."financial_document_issuer_profiles"."valid_from"),
	CONSTRAINT "fd_issuer_profiles_registration_scheme_check" CHECK ("app"."financial_document_issuer_profiles"."registration_scheme" is null or "app"."financial_document_issuer_profiles"."registration_scheme" in ('regular', 'composition')),
	CONSTRAINT "fd_issuer_profiles_registration_status_check" CHECK ("app"."financial_document_issuer_profiles"."registration_status" is null or "app"."financial_document_issuer_profiles"."registration_status" in ('registered', 'unregistered')),
	CONSTRAINT "fd_issuer_profiles_gstin_format_check" CHECK ("app"."financial_document_issuer_profiles"."gstin" is null or "app"."financial_document_issuer_profiles"."gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'),
	CONSTRAINT "fd_issuer_profiles_state_code_check" CHECK ("app"."financial_document_issuer_profiles"."state_code" is null or "app"."financial_document_issuer_profiles"."state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "fd_issuer_profiles_gstin_state_prefix_check" CHECK ("app"."financial_document_issuer_profiles"."gstin" is null or "app"."financial_document_issuer_profiles"."state_code" is null or substring("app"."financial_document_issuer_profiles"."gstin" from 1 for 2) = "app"."financial_document_issuer_profiles"."state_code"),
	CONSTRAINT "fd_issuer_profiles_rate_bps_check" CHECK ("app"."financial_document_issuer_profiles"."default_tax_rate_bps" is null or ("app"."financial_document_issuer_profiles"."default_tax_rate_bps" >= 0 and "app"."financial_document_issuer_profiles"."default_tax_rate_bps" <= 10000)),
	CONSTRAINT "fd_issuer_profiles_issuance_policy_check" CHECK ("app"."financial_document_issuer_profiles"."issuance_policy" is null or "app"."financial_document_issuer_profiles"."issuance_policy" in ('uninvoiced_advance', 'invoice_at_payment')),
	CONSTRAINT "fd_issuer_profiles_updated_at_after_created_at_check" CHECK ("app"."financial_document_issuer_profiles"."updated_at" >= "app"."financial_document_issuer_profiles"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."financial_document_line_tax_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"financial_document_line_id" uuid NOT NULL,
	"tax_type" text NOT NULL,
	"rate_bps" integer NOT NULL,
	"taxable_amount_paise" bigint NOT NULL,
	"tax_amount_paise" bigint NOT NULL,
	CONSTRAINT "fd_line_tax_components_tax_type_check" CHECK ("app"."financial_document_line_tax_components"."tax_type" in ('cgst', 'sgst', 'utgst', 'igst')),
	CONSTRAINT "fd_line_tax_components_rate_bps_check" CHECK ("app"."financial_document_line_tax_components"."rate_bps" >= 0 and "app"."financial_document_line_tax_components"."rate_bps" <= 10000),
	CONSTRAINT "fd_line_tax_components_amounts_nonnegative_check" CHECK ("app"."financial_document_line_tax_components"."taxable_amount_paise" >= 0 and "app"."financial_document_line_tax_components"."tax_amount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."financial_document_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"financial_document_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_paise" bigint NOT NULL,
	"discount_paise" bigint NOT NULL,
	"charge_paise" bigint NOT NULL,
	"taxable_value_paise" bigint NOT NULL,
	"line_total_paise" bigint NOT NULL,
	"sac_code" text,
	"hsn_code" text,
	"historical_catalog_item_id" text,
	CONSTRAINT "financial_document_lines_line_number_positive_check" CHECK ("app"."financial_document_lines"."line_number" > 0),
	CONSTRAINT "financial_document_lines_description_nonempty_check" CHECK (length(trim("app"."financial_document_lines"."description")) > 0),
	CONSTRAINT "financial_document_lines_quantity_positive_check" CHECK ("app"."financial_document_lines"."quantity" > 0),
	CONSTRAINT "financial_document_lines_amounts_nonnegative_check" CHECK ("app"."financial_document_lines"."unit_paise" >= 0
        and "app"."financial_document_lines"."discount_paise" >= 0
        and "app"."financial_document_lines"."charge_paise" >= 0
        and "app"."financial_document_lines"."taxable_value_paise" >= 0
        and "app"."financial_document_lines"."line_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."financial_document_numbering_series" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"financial_year" text NOT NULL,
	"series_code" text NOT NULL,
	"prefix" text NOT NULL,
	"next_sequence" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "fd_numbering_series_document_type_check" CHECK ("app"."financial_document_numbering_series"."document_type" in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')),
	CONSTRAINT "fd_numbering_series_financial_year_check" CHECK ("app"."financial_document_numbering_series"."financial_year" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "fd_numbering_series_series_code_nonempty_check" CHECK (length(trim("app"."financial_document_numbering_series"."series_code")) > 0),
	CONSTRAINT "fd_numbering_series_prefix_nonempty_check" CHECK (length(trim("app"."financial_document_numbering_series"."prefix")) > 0),
	CONSTRAINT "fd_numbering_series_prefix_not_ord_check" CHECK ("app"."financial_document_numbering_series"."prefix" !~ '^ORD-'),
	CONSTRAINT "fd_numbering_series_next_sequence_positive_check" CHECK ("app"."financial_document_numbering_series"."next_sequence" >= 1),
	CONSTRAINT "fd_numbering_series_updated_at_after_created_at_check" CHECK ("app"."financial_document_numbering_series"."updated_at" >= "app"."financial_document_numbering_series"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."financial_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_type" text NOT NULL,
	"status" text NOT NULL,
	"statutory_document_number" text NOT NULL,
	"issue_at" timestamp with time zone NOT NULL,
	"financial_year" text NOT NULL,
	"currency" text NOT NULL,
	"logical_issuance_key" text NOT NULL,
	"numbering_series_id" uuid NOT NULL,
	"sequence_number" bigint NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"issuer_profile_id" uuid NOT NULL,
	"issuer_profile_version" integer NOT NULL,
	"supplier_gst_legal_name" text,
	"supplier_gstin" text,
	"supplier_registered_address" text,
	"supplier_state_code" text,
	"supplier_registration_scheme" text,
	"recipient_display_name" text,
	"recipient_phone_e164" text,
	"recipient_address" text,
	"taxable_total_paise" bigint NOT NULL,
	"tax_total_paise" bigint NOT NULL,
	"discount_total_paise" bigint NOT NULL,
	"charge_total_paise" bigint NOT NULL,
	"grand_total_paise" bigint NOT NULL,
	"place_of_supply_state_code" text,
	"checkout_id" uuid,
	"checkout_snapshot_id" uuid,
	"payment_id" uuid,
	"refund_id" uuid,
	"order_id" uuid,
	"prior_financial_document_id" uuid,
	"prior_document_type" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "financial_documents_document_type_check" CHECK ("app"."financial_documents"."document_type" in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')),
	CONSTRAINT "financial_documents_status_check" CHECK ("app"."financial_documents"."status" = 'ISSUED'),
	CONSTRAINT "financial_documents_currency_check" CHECK ("app"."financial_documents"."currency" = 'INR'),
	CONSTRAINT "financial_documents_financial_year_check" CHECK ("app"."financial_documents"."financial_year" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "financial_documents_statutory_number_nonempty_check" CHECK (length(trim("app"."financial_documents"."statutory_document_number")) > 0),
	CONSTRAINT "financial_documents_statutory_number_not_ord_check" CHECK ("app"."financial_documents"."statutory_document_number" !~ '^ORD-'),
	CONSTRAINT "financial_documents_logical_issuance_key_nonempty_check" CHECK (length(trim("app"."financial_documents"."logical_issuance_key")) > 0),
	CONSTRAINT "financial_documents_sequence_positive_check" CHECK ("app"."financial_documents"."sequence_number" >= 1),
	CONSTRAINT "financial_documents_issuer_profile_version_positive_check" CHECK ("app"."financial_documents"."issuer_profile_version" > 0),
	CONSTRAINT "financial_documents_amounts_nonnegative_check" CHECK ("app"."financial_documents"."taxable_total_paise" >= 0
        and "app"."financial_documents"."tax_total_paise" >= 0
        and "app"."financial_documents"."discount_total_paise" >= 0
        and "app"."financial_documents"."charge_total_paise" >= 0
        and "app"."financial_documents"."grand_total_paise" >= 0),
	CONSTRAINT "financial_documents_supplier_scheme_check" CHECK ("app"."financial_documents"."supplier_registration_scheme" is null
        or "app"."financial_documents"."supplier_registration_scheme" in ('regular', 'composition')),
	CONSTRAINT "financial_documents_supplier_state_code_check" CHECK ("app"."financial_documents"."supplier_state_code" is null or "app"."financial_documents"."supplier_state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "financial_documents_place_of_supply_state_code_check" CHECK ("app"."financial_documents"."place_of_supply_state_code" is null or "app"."financial_documents"."place_of_supply_state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "financial_documents_snapshot_pair_check" CHECK (("app"."financial_documents"."checkout_snapshot_id" is null and "app"."financial_documents"."checkout_id" is null)
        or ("app"."financial_documents"."checkout_snapshot_id" is not null and "app"."financial_documents"."checkout_id" is not null)),
	CONSTRAINT "financial_documents_prior_type_check" CHECK ("app"."financial_documents"."prior_document_type" is null
        or "app"."financial_documents"."prior_document_type" in ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'RECEIPT_VOUCHER', 'REFUND_VOUCHER', 'CREDIT_NOTE')),
	CONSTRAINT "financial_documents_credit_note_prior_check" CHECK (("app"."financial_documents"."document_type" <> 'CREDIT_NOTE')
        or (
          "app"."financial_documents"."prior_financial_document_id" is not null
          and "app"."financial_documents"."prior_document_type" = 'TAX_INVOICE'
        )),
	CONSTRAINT "financial_documents_prior_pair_check" CHECK (("app"."financial_documents"."prior_financial_document_id" is null and "app"."financial_documents"."prior_document_type" is null)
        or ("app"."financial_documents"."prior_financial_document_id" is not null and "app"."financial_documents"."prior_document_type" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_document_issuer_profiles" ADD CONSTRAINT "fd_issuer_profiles_legal_entity_ancestry_fk" FOREIGN KEY ("legal_entity_id","brand_id","organization_id") REFERENCES "app"."legal_entities"("id","brand_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_document_issuer_profiles" ADD CONSTRAINT "fd_issuer_profiles_legal_entity_tax_profile_fk" FOREIGN KEY ("legal_entity_tax_profile_id") REFERENCES "app"."legal_entity_tax_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_document_line_tax_components" ADD CONSTRAINT "fd_line_tax_components_line_fk" FOREIGN KEY ("financial_document_line_id") REFERENCES "app"."financial_document_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_document_lines" ADD CONSTRAINT "financial_document_lines_document_fk" FOREIGN KEY ("financial_document_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_document_numbering_series" ADD CONSTRAINT "fd_numbering_series_legal_entity_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "app"."legal_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_numbering_series_fk" FOREIGN KEY ("numbering_series_id") REFERENCES "app"."financial_document_numbering_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_legal_entity_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "app"."legal_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_issuer_profile_fk" FOREIGN KEY ("issuer_profile_id") REFERENCES "app"."financial_document_issuer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_checkout_snapshot_ownership_fk" FOREIGN KEY ("checkout_snapshot_id","checkout_id") REFERENCES "app"."checkout_snapshots"("id","checkout_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_payment_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_refund_fk" FOREIGN KEY ("refund_id") REFERENCES "app"."refunds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_order_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_prior_document_fk" FOREIGN KEY ("prior_financial_document_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fd_issuer_profiles_entity_version_uidx" ON "app"."financial_document_issuer_profiles" USING btree ("legal_entity_id","profile_version");--> statement-breakpoint
CREATE INDEX "fd_issuer_profiles_legal_entity_status_idx" ON "app"."financial_document_issuer_profiles" USING btree ("legal_entity_id","lifecycle_status");--> statement-breakpoint
CREATE UNIQUE INDEX "fd_line_tax_components_line_type_uidx" ON "app"."financial_document_line_tax_components" USING btree ("financial_document_line_id","tax_type");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_document_lines_document_line_uidx" ON "app"."financial_document_lines" USING btree ("financial_document_id","line_number");--> statement-breakpoint
CREATE UNIQUE INDEX "fd_numbering_series_scope_uidx" ON "app"."financial_document_numbering_series" USING btree ("legal_entity_id","document_type","financial_year","series_code");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_documents_logical_issuance_key_uidx" ON "app"."financial_documents" USING btree ("logical_issuance_key");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_documents_series_sequence_uidx" ON "app"."financial_documents" USING btree ("numbering_series_id","sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_documents_series_number_uidx" ON "app"."financial_documents" USING btree ("numbering_series_id","statutory_document_number");--> statement-breakpoint
CREATE INDEX "financial_documents_checkout_snapshot_idx" ON "app"."financial_documents" USING btree ("checkout_snapshot_id");--> statement-breakpoint
CREATE INDEX "financial_documents_payment_idx" ON "app"."financial_documents" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "financial_documents_order_idx" ON "app"."financial_documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "financial_documents_prior_document_idx" ON "app"."financial_documents" USING btree ("prior_financial_document_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_financial_document_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'Issued Financial Documents are immutable (ARCH-G16)';
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER financial_documents_immutable_update
BEFORE UPDATE ON app.financial_documents
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
CREATE TRIGGER financial_documents_immutable_delete
BEFORE DELETE ON app.financial_documents
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
CREATE TRIGGER financial_document_lines_immutable_update
BEFORE UPDATE ON app.financial_document_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
CREATE TRIGGER financial_document_lines_immutable_delete
BEFORE DELETE ON app.financial_document_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
CREATE TRIGGER financial_document_line_tax_components_immutable_update
BEFORE UPDATE ON app.financial_document_line_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
CREATE TRIGGER financial_document_line_tax_components_immutable_delete
BEFORE DELETE ON app.financial_document_line_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_mutation();
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON app.financial_documents FROM boba_bear_app;
    REVOKE TRUNCATE ON app.financial_documents FROM boba_bear_app;
    REVOKE UPDATE ON app.financial_documents FROM boba_bear_app;
    REVOKE DELETE ON app.financial_document_lines FROM boba_bear_app;
    REVOKE TRUNCATE ON app.financial_document_lines FROM boba_bear_app;
    REVOKE UPDATE ON app.financial_document_lines FROM boba_bear_app;
    REVOKE DELETE ON app.financial_document_line_tax_components FROM boba_bear_app;
    REVOKE TRUNCATE ON app.financial_document_line_tax_components FROM boba_bear_app;
    REVOKE UPDATE ON app.financial_document_line_tax_components FROM boba_bear_app;
  END IF;
END
$priv$;
