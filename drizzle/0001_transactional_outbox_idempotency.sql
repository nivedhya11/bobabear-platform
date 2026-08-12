-- IMP-007: transactional_outbox_idempotency
--
-- Adds two technical persistence tables only: `app.outbox_events` (a
-- transactional outbox for at-least-once future event delivery) and
-- `app.idempotency_records` (deduplication of future command/request
-- execution by hashed key). No business-domain table, domain event,
-- publisher, or worker is introduced here — see AGENTS.md.
CREATE TABLE "app"."idempotency_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"key_hash" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"owner_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"result" jsonb,
	"result_code" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_records_status_check" CHECK ("app"."idempotency_records"."status" in ('in_progress', 'completed', 'failed')),
	CONSTRAINT "idempotency_records_key_hash_format_check" CHECK ("app"."idempotency_records"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "idempotency_records_request_hash_format_check" CHECK ("app"."idempotency_records"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "idempotency_records_updated_at_after_created_at_check" CHECK ("app"."idempotency_records"."updated_at" >= "app"."idempotency_records"."created_at"),
	CONSTRAINT "idempotency_records_expires_after_created_at_check" CHECK ("app"."idempotency_records"."expires_at" > "app"."idempotency_records"."created_at"),
	CONSTRAINT "idempotency_records_in_progress_state_check" CHECK ("app"."idempotency_records"."status" <> 'in_progress' or ("app"."idempotency_records"."owner_token" is not null and "app"."idempotency_records"."lease_expires_at" is not null and "app"."idempotency_records"."completed_at" is null)),
	CONSTRAINT "idempotency_records_completed_state_check" CHECK ("app"."idempotency_records"."status" <> 'completed' or ("app"."idempotency_records"."owner_token" is null and "app"."idempotency_records"."lease_expires_at" is null and "app"."idempotency_records"."completed_at" is not null)),
	CONSTRAINT "idempotency_records_failed_state_check" CHECK ("app"."idempotency_records"."status" <> 'failed' or ("app"."idempotency_records"."owner_token" is null and "app"."idempotency_records"."lease_expires_at" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"event_version" integer NOT NULL,
	"aggregate_type" text,
	"aggregate_id" text,
	"payload" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outbox_events_status_check" CHECK ("app"."outbox_events"."status" in ('pending', 'processing', 'published', 'dead_letter')),
	CONSTRAINT "outbox_events_event_version_positive_check" CHECK ("app"."outbox_events"."event_version" > 0),
	CONSTRAINT "outbox_events_attempt_count_non_negative_check" CHECK ("app"."outbox_events"."attempt_count" >= 0),
	CONSTRAINT "outbox_events_updated_at_after_created_at_check" CHECK ("app"."outbox_events"."updated_at" >= "app"."outbox_events"."created_at"),
	CONSTRAINT "outbox_events_pending_state_check" CHECK ("app"."outbox_events"."status" <> 'pending' or ("app"."outbox_events"."lease_token" is null and "app"."outbox_events"."lease_expires_at" is null and "app"."outbox_events"."published_at" is null)),
	CONSTRAINT "outbox_events_processing_state_check" CHECK ("app"."outbox_events"."status" <> 'processing' or ("app"."outbox_events"."lease_token" is not null and "app"."outbox_events"."lease_expires_at" is not null and "app"."outbox_events"."published_at" is null)),
	CONSTRAINT "outbox_events_published_state_check" CHECK ("app"."outbox_events"."status" <> 'published' or ("app"."outbox_events"."lease_token" is null and "app"."outbox_events"."lease_expires_at" is null and "app"."outbox_events"."published_at" is not null)),
	CONSTRAINT "outbox_events_dead_letter_state_check" CHECK ("app"."outbox_events"."status" <> 'dead_letter' or ("app"."outbox_events"."lease_token" is null and "app"."outbox_events"."lease_expires_at" is null and "app"."outbox_events"."published_at" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_namespace_key_hash_key" ON "app"."idempotency_records" USING btree ("namespace","key_hash");--> statement-breakpoint
CREATE INDEX "idempotency_records_lease_idx" ON "app"."idempotency_records" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "idempotency_records_expires_at_idx" ON "app"."idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "outbox_events_claim_idx" ON "app"."outbox_events" USING btree ("status","available_at","occurred_at","id");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "app"."outbox_events" USING btree ("aggregate_type","aggregate_id","occurred_at");--> statement-breakpoint
CREATE INDEX "outbox_events_expired_lease_idx" ON "app"."outbox_events" USING btree ("lease_expires_at") WHERE "app"."outbox_events"."status" = 'processing';--> statement-breakpoint
COMMENT ON TABLE "app"."idempotency_records" IS 'BOBA Bear idempotency records: hashed-key deduplication for future command/request execution (IMP-007). Never stores a raw idempotency key or raw request material.';--> statement-breakpoint
COMMENT ON TABLE "app"."outbox_events" IS 'BOBA Bear transactional outbox: at-least-once future event delivery, enqueued atomically with domain changes (IMP-007). No publisher or worker consumes this table yet.';
-- Runtime application-role privileges on these two tables are intentionally
-- not (re-)granted by name here: docker/postgres/init/001-bootstrap.sh
-- already sets `ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN
-- SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
-- boba_bear_app`, which applies automatically to every future table the
-- migrator creates in "app" — including these two. A migration-local
-- `GRANT ... TO boba_bear_app` would hardcode a role name that does not
-- exist in every environment this migration must replay against (e.g. the
-- bare Testcontainers-provisioned databases in tests/database/**), and
-- would fail there. See tests/database/outbox-idempotency-migration.integration.test.ts
-- for the assertion that the application role actually has exactly
-- SELECT/INSERT/UPDATE/DELETE (and no DDL) on both tables via that default.