CREATE TABLE "app"."financial_document_signed_artifact_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"object_reference" text NOT NULL,
	"content_hash_algorithm" text NOT NULL,
	"content_hash" text NOT NULL,
	"content_bytes" bytea NOT NULL,
	"content_length" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "financial_document_signed_artifact_objects_hash_algorithm_check" CHECK ("app"."financial_document_signed_artifact_objects"."content_hash_algorithm" = 'SHA-256'),
	CONSTRAINT "financial_document_signed_artifact_objects_content_hash_format_check" CHECK ("app"."financial_document_signed_artifact_objects"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "financial_document_signed_artifact_objects_content_length_positive_check" CHECK ("app"."financial_document_signed_artifact_objects"."content_length" > 0),
	CONSTRAINT "financial_document_signed_artifact_objects_object_reference_format_check" CHECK ("app"."financial_document_signed_artifact_objects"."object_reference" ~ '^artifact:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "financial_document_signed_artifact_objects_object_ref_uidx" ON "app"."financial_document_signed_artifact_objects" USING btree ("object_reference");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_signed_artifact_object_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.object_reference IS DISTINCT FROM OLD.object_reference
      OR NEW.content_hash_algorithm IS DISTINCT FROM OLD.content_hash_algorithm
      OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
      OR NEW.content_bytes IS DISTINCT FROM OLD.content_bytes
      OR NEW.content_length IS DISTINCT FROM OLD.content_length
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Signed artifact storage object is immutable (D-367 / ARCH-G18)';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER financial_document_signed_artifact_objects_forbid_mutation
BEFORE UPDATE ON app.financial_document_signed_artifact_objects
FOR EACH ROW
EXECUTE FUNCTION app.forbid_signed_artifact_object_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.forbid_referenced_signed_artifact_object_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.signature_artifacts sa
    WHERE sa.status = 'SIGNED'
      AND sa.immutable_object_reference = OLD.object_reference
  ) THEN
    RAISE EXCEPTION 'Signed artifact storage object referenced by SIGNED SignatureArtifact cannot be deleted (D-367 / ARCH-G18)';
  END IF;
  RETURN OLD;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER financial_document_signed_artifact_objects_forbid_referenced_delete
BEFORE DELETE ON app.financial_document_signed_artifact_objects
FOR EACH ROW
EXECUTE FUNCTION app.forbid_referenced_signed_artifact_object_delete();