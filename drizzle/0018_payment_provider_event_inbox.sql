CREATE TABLE "app"."payment_provider_event_inbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_execution_identity" text,
	"processing_state" text NOT NULL,
	"processing_attempt_count" bigint NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claim_lease_expires_at" timestamp with time zone,
	"claim_token" uuid,
	"processed_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"evidence_json" text NOT NULL,
	CONSTRAINT "payment_provider_event_inbox_provider_nonempty_check" CHECK (length(trim("app"."payment_provider_event_inbox"."provider")) > 0),
	CONSTRAINT "payment_provider_event_inbox_event_id_nonempty_check" CHECK (length(trim("app"."payment_provider_event_inbox"."provider_event_id")) > 0),
	CONSTRAINT "payment_provider_event_inbox_state_check" CHECK ("app"."payment_provider_event_inbox"."processing_state" in ('pending', 'processing', 'processed', 'poison')),
	CONSTRAINT "payment_provider_event_inbox_attempt_count_check" CHECK ("app"."payment_provider_event_inbox"."processing_attempt_count" >= 0),
	CONSTRAINT "payment_provider_event_inbox_evidence_nonempty_check" CHECK (length(trim("app"."payment_provider_event_inbox"."evidence_json")) > 0),
	CONSTRAINT "payment_provider_event_inbox_pending_state_check" CHECK ("app"."payment_provider_event_inbox"."processing_state" <> 'pending' or (
        "app"."payment_provider_event_inbox"."claim_token" is null
        and "app"."payment_provider_event_inbox"."claim_lease_expires_at" is null
        and "app"."payment_provider_event_inbox"."processed_at" is null
      )),
	CONSTRAINT "payment_provider_event_inbox_processing_state_check" CHECK ("app"."payment_provider_event_inbox"."processing_state" <> 'processing' or (
        "app"."payment_provider_event_inbox"."claim_token" is not null
        and "app"."payment_provider_event_inbox"."claim_lease_expires_at" is not null
        and "app"."payment_provider_event_inbox"."processed_at" is null
      )),
	CONSTRAINT "payment_provider_event_inbox_processed_state_check" CHECK ("app"."payment_provider_event_inbox"."processing_state" <> 'processed' or (
        "app"."payment_provider_event_inbox"."claim_token" is null
        and "app"."payment_provider_event_inbox"."claim_lease_expires_at" is null
        and "app"."payment_provider_event_inbox"."processed_at" is not null
      )),
	CONSTRAINT "payment_provider_event_inbox_poison_state_check" CHECK ("app"."payment_provider_event_inbox"."processing_state" <> 'poison' or (
        "app"."payment_provider_event_inbox"."claim_token" is null
        and "app"."payment_provider_event_inbox"."claim_lease_expires_at" is null
        and "app"."payment_provider_event_inbox"."processed_at" is null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_event_inbox_provider_event_uidx" ON "app"."payment_provider_event_inbox" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_provider_event_inbox_claim_idx" ON "app"."payment_provider_event_inbox" USING btree ("processing_state","available_at","received_at","id");--> statement-breakpoint
CREATE INDEX "payment_provider_event_inbox_expired_lease_idx" ON "app"."payment_provider_event_inbox" USING btree ("claim_lease_expires_at") WHERE "app"."payment_provider_event_inbox"."processing_state" = 'processing';