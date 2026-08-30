CREATE TABLE "app"."deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"prior_delivery_id" uuid,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"revision" bigint NOT NULL,
	"booking_correlation_id" uuid,
	"external_booking_reference" text,
	"provider" text,
	"handoff_reference" text,
	"proof_reference" text,
	"failure_code" text,
	"failure_reason" text,
	"cancellation_code" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"booking_outcome_unknown_at" timestamp with time zone,
	"booked_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "deliveries_status_check" CHECK ("app"."deliveries"."status" in (
        'REQUESTED',
        'BOOKING_OUTCOME_UNKNOWN',
        'BOOKED',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      )),
	CONSTRAINT "deliveries_revision_positive_check" CHECK ("app"."deliveries"."revision" > 0),
	CONSTRAINT "deliveries_request_fingerprint_nonempty_check" CHECK (char_length(trim("app"."deliveries"."request_fingerprint")) between 1 and 128),
	CONSTRAINT "deliveries_provider_nonempty_check" CHECK ("app"."deliveries"."provider" is null or length(trim("app"."deliveries"."provider")) > 0),
	CONSTRAINT "deliveries_updated_at_after_created_at_check" CHECK ("app"."deliveries"."updated_at" >= "app"."deliveries"."created_at"),
	CONSTRAINT "deliveries_lifecycle_provenance_check" CHECK ((
        (
          "app"."deliveries"."status" = 'REQUESTED'
          and "app"."deliveries"."booking_outcome_unknown_at" is null
          and "app"."deliveries"."booked_at" is null
          and "app"."deliveries"."picked_up_at" is null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."failed_at" is null
          and "app"."deliveries"."cancelled_at" is null
          and "app"."deliveries"."failure_code" is null
          and "app"."deliveries"."failure_reason" is null
          and "app"."deliveries"."cancellation_code" is null
          and "app"."deliveries"."cancellation_reason" is null
          and "app"."deliveries"."proof_reference" is null
        )
        or
        (
          "app"."deliveries"."status" = 'BOOKING_OUTCOME_UNKNOWN'
          and "app"."deliveries"."booking_outcome_unknown_at" is not null
          and "app"."deliveries"."booking_correlation_id" is not null
          and "app"."deliveries"."booked_at" is null
          and "app"."deliveries"."picked_up_at" is null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."failed_at" is null
          and "app"."deliveries"."cancelled_at" is null
        )
        or
        (
          "app"."deliveries"."status" = 'BOOKED'
          and "app"."deliveries"."booked_at" is not null
          and "app"."deliveries"."picked_up_at" is null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."failed_at" is null
          and "app"."deliveries"."cancelled_at" is null
          and "app"."deliveries"."proof_reference" is null
        )
        or
        (
          "app"."deliveries"."status" = 'PICKED_UP'
          and "app"."deliveries"."booked_at" is not null
          and "app"."deliveries"."picked_up_at" is not null
          and "app"."deliveries"."handoff_reference" is not null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."failed_at" is null
          and "app"."deliveries"."cancelled_at" is null
        )
        or
        (
          "app"."deliveries"."status" = 'DELIVERED'
          and "app"."deliveries"."booked_at" is not null
          and "app"."deliveries"."picked_up_at" is not null
          and "app"."deliveries"."delivered_at" is not null
          and "app"."deliveries"."proof_reference" is not null
          and "app"."deliveries"."failed_at" is null
          and "app"."deliveries"."cancelled_at" is null
        )
        or
        (
          "app"."deliveries"."status" = 'FAILED'
          and "app"."deliveries"."failed_at" is not null
          and "app"."deliveries"."failure_code" is not null
          and "app"."deliveries"."failure_reason" is not null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."cancelled_at" is null
        )
        or
        (
          "app"."deliveries"."status" = 'CANCELLED'
          and "app"."deliveries"."cancelled_at" is not null
          and "app"."deliveries"."cancellation_code" is not null
          and "app"."deliveries"."cancellation_reason" is not null
          and "app"."deliveries"."picked_up_at" is null
          and "app"."deliveries"."delivered_at" is null
          and "app"."deliveries"."failed_at" is null
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"assignment_key" text NOT NULL,
	"courier_reference" text,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "delivery_assignments_provider_nonempty_check" CHECK (length(trim("app"."delivery_assignments"."provider")) > 0),
	CONSTRAINT "delivery_assignments_key_nonempty_check" CHECK (length(trim("app"."delivery_assignments"."assignment_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_provider_costs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"currency" text NOT NULL,
	"provider" text,
	"note" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "delivery_provider_costs_kind_check" CHECK ("app"."delivery_provider_costs"."kind" in (
        'estimated',
        'booked',
        'final',
        'cancellation',
        'return',
        'adjustment'
      )),
	CONSTRAINT "delivery_provider_costs_amount_positive_check" CHECK ("app"."delivery_provider_costs"."amount_paise" > 0),
	CONSTRAINT "delivery_provider_costs_currency_check" CHECK ("app"."delivery_provider_costs"."currency" = 'INR'),
	CONSTRAINT "delivery_provider_costs_provider_nonempty_check" CHECK ("app"."delivery_provider_costs"."provider" is null or length(trim("app"."delivery_provider_costs"."provider")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_provider_observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"observation_source" text NOT NULL,
	"observation_key" text NOT NULL,
	"provider_event_id" text,
	"normalized_meaning" text NOT NULL,
	"disposition" text NOT NULL,
	"payload_digest" text,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "delivery_provider_observations_observation_key_nonempty_check" CHECK (length(trim("app"."delivery_provider_observations"."observation_key")) > 0),
	CONSTRAINT "delivery_provider_observations_source_check" CHECK ("app"."delivery_provider_observations"."observation_source" in ('sync', 'query', 'reconciliation', 'manual')),
	CONSTRAINT "delivery_provider_observations_meaning_check" CHECK ("app"."delivery_provider_observations"."normalized_meaning" in (
        'BOOKING_ACTIVE',
        'BOOKING_INACTIVE_FAILED',
        'BOOKING_INACTIVE_CANCELLED',
        'BOOKING_AMBIGUOUS',
        'ASSIGNMENT',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED',
        'UNKNOWN'
      )),
	CONSTRAINT "delivery_provider_observations_disposition_check" CHECK ("app"."delivery_provider_observations"."disposition" in (
        'APPLIED',
        'DUPLICATE',
        'UNAPPLIED_UNKNOWN',
        'UNAPPLIED_CONFLICT',
        'UNAPPLIED_UNSAFE',
        'UNAPPLIED_NO_TRANSITION'
      )),
	CONSTRAINT "delivery_provider_observations_provider_nonempty_check" CHECK (length(trim("app"."delivery_provider_observations"."provider")) > 0),
	CONSTRAINT "delivery_provider_observations_payload_digest_check" CHECK ("app"."delivery_provider_observations"."payload_digest" is null or "app"."delivery_provider_observations"."payload_digest" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_provider_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"reference_kind" text NOT NULL,
	"reference_value" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "delivery_provider_references_provider_nonempty_check" CHECK (length(trim("app"."delivery_provider_references"."provider")) > 0),
	CONSTRAINT "delivery_provider_references_kind_nonempty_check" CHECK (length(trim("app"."delivery_provider_references"."reference_kind")) > 0),
	CONSTRAINT "delivery_provider_references_value_nonempty_check" CHECK (length(trim("app"."delivery_provider_references"."reference_value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_returns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"return_destination" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"returning_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"return_failed_at" timestamp with time zone,
	CONSTRAINT "delivery_returns_status_check" CHECK ("app"."delivery_returns"."status" in (
        'RETURN_REQUESTED',
        'RETURNING',
        'RETURNED',
        'RETURN_FAILED'
      )),
	CONSTRAINT "delivery_returns_reason_length_check" CHECK (char_length("app"."delivery_returns"."reason") between 1 and 500),
	CONSTRAINT "delivery_returns_destination_nonempty_check" CHECK (length(trim("app"."delivery_returns"."return_destination")) > 0),
	CONSTRAINT "delivery_returns_lifecycle_provenance_check" CHECK ((
        (
          "app"."delivery_returns"."status" = 'RETURN_REQUESTED'
          and "app"."delivery_returns"."returning_at" is null
          and "app"."delivery_returns"."returned_at" is null
          and "app"."delivery_returns"."return_failed_at" is null
          and "app"."delivery_returns"."failure_reason" is null
        )
        or
        (
          "app"."delivery_returns"."status" = 'RETURNING'
          and "app"."delivery_returns"."returning_at" is not null
          and "app"."delivery_returns"."returned_at" is null
          and "app"."delivery_returns"."return_failed_at" is null
        )
        or
        (
          "app"."delivery_returns"."status" = 'RETURNED'
          and "app"."delivery_returns"."returning_at" is not null
          and "app"."delivery_returns"."returned_at" is not null
          and "app"."delivery_returns"."return_failed_at" is null
        )
        or
        (
          "app"."delivery_returns"."status" = 'RETURN_FAILED'
          and "app"."delivery_returns"."return_failed_at" is not null
          and "app"."delivery_returns"."failure_reason" is not null
          and "app"."delivery_returns"."returned_at" is null
        )
      ))
);
--> statement-breakpoint
ALTER TABLE "app"."deliveries" ADD CONSTRAINT "deliveries_order_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."deliveries" ADD CONSTRAINT "deliveries_prior_delivery_fk" FOREIGN KEY ("prior_delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_assignments" ADD CONSTRAINT "delivery_assignments_delivery_fk" FOREIGN KEY ("delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_provider_costs" ADD CONSTRAINT "delivery_provider_costs_delivery_fk" FOREIGN KEY ("delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_provider_observations" ADD CONSTRAINT "delivery_provider_observations_delivery_fk" FOREIGN KEY ("delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_provider_references" ADD CONSTRAINT "delivery_provider_references_delivery_fk" FOREIGN KEY ("delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_returns" ADD CONSTRAINT "delivery_returns_delivery_fk" FOREIGN KEY ("delivery_id") REFERENCES "app"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_order_request_fingerprint_uidx" ON "app"."deliveries" USING btree ("order_id","request_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_one_active_per_order_uidx" ON "app"."deliveries" USING btree ("order_id") WHERE "app"."deliveries"."status" in ('REQUESTED', 'BOOKING_OUTCOME_UNKNOWN', 'BOOKED', 'PICKED_UP');--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_booking_correlation_id_uidx" ON "app"."deliveries" USING btree ("booking_correlation_id") WHERE "app"."deliveries"."booking_correlation_id" is not null;--> statement-breakpoint
CREATE INDEX "deliveries_order_id_idx" ON "app"."deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_created_at_idx" ON "app"."deliveries" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_assignments_delivery_key_uidx" ON "app"."delivery_assignments" USING btree ("delivery_id","assignment_key");--> statement-breakpoint
CREATE INDEX "delivery_assignments_delivery_idx" ON "app"."delivery_assignments" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_provider_costs_delivery_idx" ON "app"."delivery_provider_costs" USING btree ("delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_provider_observations_key_uidx" ON "app"."delivery_provider_observations" USING btree ("provider","observation_source","observation_key");--> statement-breakpoint
CREATE INDEX "delivery_provider_observations_delivery_idx" ON "app"."delivery_provider_observations" USING btree ("delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_provider_references_provider_kind_value_uidx" ON "app"."delivery_provider_references" USING btree ("provider","reference_kind","reference_value");--> statement-breakpoint
CREATE INDEX "delivery_provider_references_delivery_idx" ON "app"."delivery_provider_references" USING btree ("delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_returns_one_active_per_delivery_uidx" ON "app"."delivery_returns" USING btree ("delivery_id") WHERE "app"."delivery_returns"."status" in ('RETURN_REQUESTED', 'RETURNING');--> statement-breakpoint
CREATE INDEX "delivery_returns_delivery_idx" ON "app"."delivery_returns" USING btree ("delivery_id");