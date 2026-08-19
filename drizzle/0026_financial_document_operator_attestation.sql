-- IMP-028 D-367 Slice 2 correction: durable operator-attestation authority.
-- Records that the operator explicitly attested the uploaded signed artifact.
-- Does not claim cryptographic signature verification.
-- Forward-only ADD COLUMN + CHECKs; 0023, 0024, and 0025 remain sealed.

ALTER TABLE "app"."signature_artifacts" ADD COLUMN "operator_attested_signed_artifact" boolean;--> statement-breakpoint
ALTER TABLE "app"."signature_artifacts" ADD CONSTRAINT "signature_artifacts_operator_attestation_true_when_present_check" CHECK ("app"."signature_artifacts"."operator_attested_signed_artifact" is null
        or "app"."signature_artifacts"."operator_attested_signed_artifact" = true);--> statement-breakpoint
ALTER TABLE "app"."signature_artifacts" ADD CONSTRAINT "signature_artifacts_operator_attestation_absent_unless_signed_check" CHECK ("app"."signature_artifacts"."status" = 'SIGNED'
        or "app"."signature_artifacts"."operator_attested_signed_artifact" is null);
