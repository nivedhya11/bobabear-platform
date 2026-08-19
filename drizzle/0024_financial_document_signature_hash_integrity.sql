-- IMP-028 D-367 Slice 1 correction: canonical SHA-256 digest representation integrity.
-- Forward-only CHECK on signature_artifacts.artifact_content_hash; 0023 remains sealed.

ALTER TABLE "app"."signature_artifacts" ADD CONSTRAINT "signature_artifacts_artifact_content_hash_format_check" CHECK ("app"."signature_artifacts"."artifact_content_hash" is null or "app"."signature_artifacts"."artifact_content_hash" ~ '^[0-9a-f]{64}$');
