ALTER TABLE "app"."financial_document_issuer_profiles" ADD COLUMN "reverse_charge_applicable" boolean;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD COLUMN "reverse_charge_applicable" boolean;--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_refund_voucher_prior_check" CHECK (("app"."financial_documents"."document_type" <> 'REFUND_VOUCHER')
        or (
          "app"."financial_documents"."prior_financial_document_id" is not null
          and "app"."financial_documents"."prior_document_type" = 'RECEIPT_VOUCHER'
        ));