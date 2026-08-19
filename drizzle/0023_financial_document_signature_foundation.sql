CREATE TABLE "app"."authorised_signer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"signer_display_name" text NOT NULL,
	"authorisation_reference" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"signing_method" text NOT NULL,
	"external_signer_identity" text,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "authorised_signer_profiles_effective_range_check" CHECK ("app"."authorised_signer_profiles"."effective_to" is null or "app"."authorised_signer_profiles"."effective_to" > "app"."authorised_signer_profiles"."effective_from"),
	CONSTRAINT "authorised_signer_profiles_signing_method_check" CHECK ("app"."authorised_signer_profiles"."signing_method" in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')),
	CONSTRAINT "authorised_signer_profiles_lifecycle_status_check" CHECK ("app"."authorised_signer_profiles"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "authorised_signer_profiles_signer_display_name_nonempty_check" CHECK (length(trim("app"."authorised_signer_profiles"."signer_display_name")) > 0),
	CONSTRAINT "authorised_signer_profiles_authorisation_reference_nonempty_check" CHECK (length(trim("app"."authorised_signer_profiles"."authorisation_reference")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."signature_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"financial_document_id" uuid NOT NULL,
	"signature_requirement" text NOT NULL,
	"status" text NOT NULL,
	"artifact_content_hash_algorithm" text,
	"artifact_content_hash" text,
	"immutable_object_reference" text,
	"signed_at" timestamp with time zone,
	"signature_method" text,
	"authorised_signer_profile_id" uuid,
	"sealed_signer_display_name" text,
	"sealed_authorisation_reference" text,
	"sealed_signing_method" text,
	"sealed_external_signer_identity" text,
	"signature_profile" text,
	"certificate_subject" text,
	"certificate_fingerprint" text,
	"certificate_serial" text,
	"certificate_issuer" text,
	"provider_transaction_reference" text,
	"verification_evidence_reference" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "signature_artifacts_signature_requirement_check" CHECK ("app"."signature_artifacts"."signature_requirement" in ('REQUIRED', 'NOT_REQUIRED')),
	CONSTRAINT "signature_artifacts_status_check" CHECK ("app"."signature_artifacts"."status" in ('PENDING', 'SIGNED', 'FAILED_RETRYABLE', 'REJECTED')),
	CONSTRAINT "signature_artifacts_hash_algorithm_check" CHECK ("app"."signature_artifacts"."artifact_content_hash_algorithm" is null
        or "app"."signature_artifacts"."artifact_content_hash_algorithm" = 'SHA-256'),
	CONSTRAINT "signature_artifacts_signed_success_completeness_check" CHECK (("app"."signature_artifacts"."status" <> 'SIGNED')
        or (
          "app"."signature_artifacts"."artifact_content_hash_algorithm" is not null
          and "app"."signature_artifacts"."artifact_content_hash" is not null
          and length(trim("app"."signature_artifacts"."artifact_content_hash")) > 0
          and "app"."signature_artifacts"."immutable_object_reference" is not null
          and length(trim("app"."signature_artifacts"."immutable_object_reference")) > 0
          and "app"."signature_artifacts"."signed_at" is not null
          and "app"."signature_artifacts"."signature_method" is not null
          and "app"."signature_artifacts"."authorised_signer_profile_id" is not null
          and "app"."signature_artifacts"."sealed_signer_display_name" is not null
          and length(trim("app"."signature_artifacts"."sealed_signer_display_name")) > 0
          and "app"."signature_artifacts"."sealed_authorisation_reference" is not null
          and length(trim("app"."signature_artifacts"."sealed_authorisation_reference")) > 0
          and "app"."signature_artifacts"."sealed_signing_method" is not null
          and "app"."signature_artifacts"."signature_profile" is not null
          and length(trim("app"."signature_artifacts"."signature_profile")) > 0
        )),
	CONSTRAINT "signature_artifacts_non_signed_success_fields_absent_check" CHECK (("app"."signature_artifacts"."status" = 'SIGNED')
        or (
          "app"."signature_artifacts"."artifact_content_hash_algorithm" is null
          and "app"."signature_artifacts"."artifact_content_hash" is null
          and "app"."signature_artifacts"."immutable_object_reference" is null
          and "app"."signature_artifacts"."signed_at" is null
          and "app"."signature_artifacts"."signature_method" is null
          and "app"."signature_artifacts"."authorised_signer_profile_id" is null
          and "app"."signature_artifacts"."sealed_signer_display_name" is null
          and "app"."signature_artifacts"."sealed_authorisation_reference" is null
          and "app"."signature_artifacts"."sealed_signing_method" is null
          and "app"."signature_artifacts"."sealed_external_signer_identity" is null
          and "app"."signature_artifacts"."signature_profile" is null
          and "app"."signature_artifacts"."certificate_subject" is null
          and "app"."signature_artifacts"."certificate_fingerprint" is null
          and "app"."signature_artifacts"."certificate_serial" is null
          and "app"."signature_artifacts"."certificate_issuer" is null
          and "app"."signature_artifacts"."provider_transaction_reference" is null
          and "app"."signature_artifacts"."verification_evidence_reference" is null
        )),
	CONSTRAINT "signature_artifacts_signature_method_check" CHECK ("app"."signature_artifacts"."signature_method" is null
        or "app"."signature_artifacts"."signature_method" in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')),
	CONSTRAINT "signature_artifacts_sealed_signing_method_check" CHECK ("app"."signature_artifacts"."sealed_signing_method" is null
        or "app"."signature_artifacts"."sealed_signing_method" in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')),
	CONSTRAINT "signature_artifacts_updated_at_after_created_at_check" CHECK ("app"."signature_artifacts"."updated_at" >= "app"."signature_artifacts"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."authorised_signer_profiles" ADD CONSTRAINT "authorised_signer_profiles_legal_entity_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "app"."legal_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."signature_artifacts" ADD CONSTRAINT "signature_artifacts_financial_document_fk" FOREIGN KEY ("financial_document_id") REFERENCES "app"."financial_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."signature_artifacts" ADD CONSTRAINT "signature_artifacts_authorised_signer_profile_fk" FOREIGN KEY ("authorised_signer_profile_id") REFERENCES "app"."authorised_signer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authorised_signer_profiles_legal_entity_effective_idx" ON "app"."authorised_signer_profiles" USING btree ("legal_entity_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_artifacts_financial_document_uidx" ON "app"."signature_artifacts" USING btree ("financial_document_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_referenced_authorised_signer_profile_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.signature_artifacts sa
    WHERE sa.authorised_signer_profile_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'AuthorisedSignerProfile referenced by SignatureArtifact is immutable (D-367 / ARCH-G18)';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER authorised_signer_profiles_forbid_referenced_update
BEFORE UPDATE ON app.authorised_signer_profiles
FOR EACH ROW
EXECUTE FUNCTION app.forbid_referenced_authorised_signer_profile_mutation();
--> statement-breakpoint
CREATE TRIGGER authorised_signer_profiles_forbid_referenced_delete
BEFORE DELETE ON app.authorised_signer_profiles
FOR EACH ROW
EXECUTE FUNCTION app.forbid_referenced_authorised_signer_profile_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_signed_signature_artifact_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF OLD.status = 'SIGNED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Signed SignatureArtifact authority is immutable (D-367 / ARCH-G18)';
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER signature_artifacts_forbid_signed_mutation
BEFORE UPDATE ON app.signature_artifacts
FOR EACH ROW
EXECUTE FUNCTION app.forbid_signed_signature_artifact_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_signature_artifact_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'SignatureArtifact statutory history cannot be deleted (D-367 / ARCH-G18)';
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER signature_artifacts_forbid_delete
BEFORE DELETE ON app.signature_artifacts
FOR EACH ROW
EXECUTE FUNCTION app.forbid_signature_artifact_delete();