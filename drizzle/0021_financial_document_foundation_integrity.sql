-- IMP-028 Slice 1 correction: Financial Document persistence foundation integrity.
-- Composite relational enforcement for Section 34 prior type, numbering-series scope,
-- and issuer-profile identity/version. Append-closed issued aggregate via deferred
-- child→parent FK + insert guards. Referenced issuer-profile historical freeze.

-- Unique composite identities required before composite FKs.
ALTER TABLE "app"."financial_document_issuer_profiles" ADD CONSTRAINT "fd_issuer_profiles_id_entity_version_key" UNIQUE("id","legal_entity_id","profile_version");
--> statement-breakpoint
ALTER TABLE "app"."financial_document_numbering_series" ADD CONSTRAINT "fd_numbering_series_id_scope_key" UNIQUE("id","legal_entity_id","document_type","financial_year");
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_id_document_type_key" UNIQUE("id","document_type");
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" DROP CONSTRAINT "financial_documents_numbering_series_fk";
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" DROP CONSTRAINT "financial_documents_issuer_profile_fk";
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" DROP CONSTRAINT "financial_documents_prior_document_fk";
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_numbering_series_scope_fk" FOREIGN KEY ("numbering_series_id","legal_entity_id","document_type","financial_year") REFERENCES "app"."financial_document_numbering_series"("id","legal_entity_id","document_type","financial_year") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_issuer_profile_identity_fk" FOREIGN KEY ("issuer_profile_id","legal_entity_id","issuer_profile_version") REFERENCES "app"."financial_document_issuer_profiles"("id","legal_entity_id","profile_version") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app"."financial_documents" ADD CONSTRAINT "financial_documents_prior_document_identity_fk" FOREIGN KEY ("prior_financial_document_id","prior_document_type") REFERENCES "app"."financial_documents"("id","document_type") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Children may be constructed before the issued parent row within one transaction.
-- After commit, parent existence makes further child inserts illegal (ARCH-G16).
ALTER TABLE "app"."financial_document_lines" ALTER CONSTRAINT "financial_document_lines_document_fk" DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_financial_document_child_append()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  parent_document_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'financial_document_lines' THEN
    parent_document_id := NEW.financial_document_id;
  ELSIF TG_TABLE_NAME = 'financial_document_line_tax_components' THEN
    SELECT l.financial_document_id INTO parent_document_id
    FROM app.financial_document_lines l
    WHERE l.id = NEW.financial_document_line_id;
    IF parent_document_id IS NULL THEN
      RETURN NEW;
    END IF;
  ELSE
    RAISE EXCEPTION 'forbid_financial_document_child_append attached to unexpected table %', TG_TABLE_NAME;
  END IF;

  IF EXISTS (
    SELECT 1 FROM app.financial_documents d WHERE d.id = parent_document_id
  ) THEN
    RAISE EXCEPTION 'Issued Financial Document aggregate is append-closed (ARCH-G16)';
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER financial_document_lines_forbid_append
BEFORE INSERT ON app.financial_document_lines
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_child_append();
--> statement-breakpoint
CREATE TRIGGER financial_document_line_tax_components_forbid_append
BEFORE INSERT ON app.financial_document_line_tax_components
FOR EACH ROW
EXECUTE FUNCTION app.forbid_financial_document_child_append();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_referenced_issuer_profile_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM app.financial_documents d WHERE d.issuer_profile_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Issuer profile referenced by issued Financial Document is immutable (ARCH-G16)';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER fd_issuer_profiles_forbid_referenced_update
BEFORE UPDATE ON app.financial_document_issuer_profiles
FOR EACH ROW
EXECUTE FUNCTION app.forbid_referenced_issuer_profile_mutation();
--> statement-breakpoint
CREATE TRIGGER fd_issuer_profiles_forbid_referenced_delete
BEFORE DELETE ON app.financial_document_issuer_profiles
FOR EACH ROW
EXECUTE FUNCTION app.forbid_referenced_issuer_profile_mutation();
