CREATE TABLE "app"."payment_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"attempt_ordinal" bigint NOT NULL,
	"provider" text NOT NULL,
	"method_intent" text NOT NULL,
	"provider_execution_identity" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"pending_at" timestamp with time zone,
	"indeterminate_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "payment_attempts_ordinal_positive_check" CHECK ("app"."payment_attempts"."attempt_ordinal" > 0),
	CONSTRAINT "payment_attempts_provider_nonempty_check" CHECK (length(trim("app"."payment_attempts"."provider")) > 0),
	CONSTRAINT "payment_attempts_method_intent_nonempty_check" CHECK (length(trim("app"."payment_attempts"."method_intent")) > 0),
	CONSTRAINT "payment_attempts_provider_execution_identity_nonempty_check" CHECK (length(trim("app"."payment_attempts"."provider_execution_identity")) > 0),
	CONSTRAINT "payment_attempts_status_check" CHECK ("app"."payment_attempts"."status" in ('CREATED', 'PENDING', 'INDETERMINATE', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
	CONSTRAINT "payment_attempts_succeeded_state_check" CHECK (("app"."payment_attempts"."status" = 'SUCCEEDED' and "app"."payment_attempts"."succeeded_at" is not null)
        or ("app"."payment_attempts"."status" <> 'SUCCEEDED' and "app"."payment_attempts"."succeeded_at" is null)),
	CONSTRAINT "payment_attempts_failed_state_check" CHECK (("app"."payment_attempts"."status" = 'FAILED' and "app"."payment_attempts"."failed_at" is not null)
        or ("app"."payment_attempts"."status" <> 'FAILED' and "app"."payment_attempts"."failed_at" is null)),
	CONSTRAINT "payment_attempts_cancelled_state_check" CHECK (("app"."payment_attempts"."status" = 'CANCELLED' and "app"."payment_attempts"."cancelled_at" is not null)
        or ("app"."payment_attempts"."status" <> 'CANCELLED' and "app"."payment_attempts"."cancelled_at" is null)),
	CONSTRAINT "payment_attempts_pending_state_check" CHECK (("app"."payment_attempts"."status" = 'PENDING' and "app"."payment_attempts"."pending_at" is not null)
        or ("app"."payment_attempts"."status" <> 'PENDING')),
	CONSTRAINT "payment_attempts_indeterminate_state_check" CHECK (("app"."payment_attempts"."status" = 'INDETERMINATE' and "app"."payment_attempts"."indeterminate_at" is not null)
        or ("app"."payment_attempts"."status" <> 'INDETERMINATE')),
	CONSTRAINT "payment_attempts_updated_at_after_created_at_check" CHECK ("app"."payment_attempts"."updated_at" >= "app"."payment_attempts"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."payment_initiation_idempotency" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"operation_kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"payment_id" uuid,
	"payment_attempt_id" uuid,
	"checkout_id" uuid,
	"zero_payable_checkout_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "payment_initiation_idempotency_operation_kind_check" CHECK ("app"."payment_initiation_idempotency"."operation_kind" in ('start_payment', 'retry_payment', 'complete_zero_payable')),
	CONSTRAINT "payment_initiation_idempotency_key_nonempty_check" CHECK (length(trim("app"."payment_initiation_idempotency"."idempotency_key")) > 0),
	CONSTRAINT "payment_initiation_idempotency_fingerprint_sha256_check" CHECK ("app"."payment_initiation_idempotency"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_initiation_idempotency_result_shape_check" CHECK ((
        "app"."payment_initiation_idempotency"."zero_payable_checkout_id" is not null
        and "app"."payment_initiation_idempotency"."payment_id" is null
        and "app"."payment_initiation_idempotency"."payment_attempt_id" is null
      ) or (
        "app"."payment_initiation_idempotency"."zero_payable_checkout_id" is null
        and (
          ("app"."payment_initiation_idempotency"."payment_id" is null and "app"."payment_initiation_idempotency"."payment_attempt_id" is null)
          or ("app"."payment_initiation_idempotency"."payment_id" is not null and "app"."payment_initiation_idempotency"."payment_attempt_id" is not null)
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "app"."payment_provider_observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"observation_source" text NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text,
	"normalized_outcome" text NOT NULL,
	"observed_amount_paise" bigint,
	"observed_currency" text,
	"provider_status_code" text,
	"provider_timestamp" timestamp with time zone,
	"payload_digest" text,
	"reconciliation_anomaly" text,
	"observed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_provider_observations_source_check" CHECK ("app"."payment_provider_observations"."observation_source" in ('sync', 'webhook', 'query', 'reconciliation')),
	CONSTRAINT "payment_provider_observations_outcome_check" CHECK ("app"."payment_provider_observations"."normalized_outcome" in (
        'CLIENT_ACTION_REQUIRED',
        'PENDING',
        'SUCCEEDED',
        'DEFINITIVE_FAILURE',
        'DEFINITIVE_CANCELLED',
        'INDETERMINATE',
        'UNSUPPORTED',
        'ANOMALY'
      )),
	CONSTRAINT "payment_provider_observations_currency_check" CHECK ("app"."payment_provider_observations"."observed_currency" is null or length(trim("app"."payment_provider_observations"."observed_currency")) > 0),
	CONSTRAINT "payment_provider_observations_amount_positive_check" CHECK ("app"."payment_provider_observations"."observed_amount_paise" is null or "app"."payment_provider_observations"."observed_amount_paise" > 0),
	CONSTRAINT "payment_provider_observations_payload_digest_check" CHECK ("app"."payment_provider_observations"."payload_digest" is null or "app"."payment_provider_observations"."payload_digest" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."payment_provider_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"attempt_id" uuid,
	"provider" text NOT NULL,
	"reference_kind" text NOT NULL,
	"reference_value" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_provider_references_provider_nonempty_check" CHECK (length(trim("app"."payment_provider_references"."provider")) > 0),
	CONSTRAINT "payment_provider_references_kind_nonempty_check" CHECK (length(trim("app"."payment_provider_references"."reference_kind")) > 0),
	CONSTRAINT "payment_provider_references_value_nonempty_check" CHECK (length(trim("app"."payment_provider_references"."reference_value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"checkout_id" uuid NOT NULL,
	"checkout_snapshot_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"succeeded_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "payments_status_check" CHECK ("app"."payments"."status" in ('OPEN', 'PROCESSING', 'SUCCEEDED', 'SUPERSEDED', 'CANCELLED', 'EXPIRED')),
	CONSTRAINT "payments_succeeded_state_check" CHECK (("app"."payments"."status" = 'SUCCEEDED' and "app"."payments"."succeeded_at" is not null)
        or ("app"."payments"."status" <> 'SUCCEEDED' and "app"."payments"."succeeded_at" is null)),
	CONSTRAINT "payments_cancelled_state_check" CHECK (("app"."payments"."status" = 'CANCELLED' and "app"."payments"."cancelled_at" is not null)
        or ("app"."payments"."status" <> 'CANCELLED' and "app"."payments"."cancelled_at" is null)),
	CONSTRAINT "payments_expired_state_check" CHECK (("app"."payments"."status" = 'EXPIRED' and "app"."payments"."expired_at" is not null)
        or ("app"."payments"."status" <> 'EXPIRED' and "app"."payments"."expired_at" is null)),
	CONSTRAINT "payments_superseded_state_check" CHECK (("app"."payments"."status" = 'SUPERSEDED' and "app"."payments"."superseded_at" is not null)
        or ("app"."payments"."status" <> 'SUPERSEDED' and "app"."payments"."superseded_at" is null)),
	CONSTRAINT "payments_updated_at_after_created_at_check" CHECK ("app"."payments"."updated_at" >= "app"."payments"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."promotion_redemption_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"checkout_snapshot_id" uuid NOT NULL,
	"payment_id" uuid,
	"payment_attempt_id" uuid,
	"redemption_units" bigint NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "promotion_redemption_claims_units_positive_check" CHECK ("app"."promotion_redemption_claims"."redemption_units" > 0),
	CONSTRAINT "promotion_redemption_claims_status_check" CHECK ("app"."promotion_redemption_claims"."status" in ('RESERVED', 'CONSUMED', 'RELEASED')),
	CONSTRAINT "promotion_redemption_claims_payment_attempt_pair_check" CHECK (("app"."promotion_redemption_claims"."payment_id" is null) = ("app"."promotion_redemption_claims"."payment_attempt_id" is null)),
	CONSTRAINT "promotion_redemption_claims_zero_must_be_consumed_check" CHECK ("app"."promotion_redemption_claims"."payment_id" is not null or "app"."promotion_redemption_claims"."status" = 'CONSUMED'),
	CONSTRAINT "promotion_redemption_claims_reserved_timestamps_check" CHECK ("app"."promotion_redemption_claims"."status" <> 'RESERVED' or (
        "app"."promotion_redemption_claims"."consumed_at" is null and "app"."promotion_redemption_claims"."released_at" is null
      )),
	CONSTRAINT "promotion_redemption_claims_consumed_timestamps_check" CHECK ("app"."promotion_redemption_claims"."status" <> 'CONSUMED' or (
        "app"."promotion_redemption_claims"."consumed_at" is not null and "app"."promotion_redemption_claims"."released_at" is null
      )),
	CONSTRAINT "promotion_redemption_claims_released_timestamps_check" CHECK ("app"."promotion_redemption_claims"."status" <> 'RELEASED' or (
        "app"."promotion_redemption_claims"."consumed_at" is null and "app"."promotion_redemption_claims"."released_at" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_id_payment_id_uidx" ON "app"."payment_attempts" USING btree ("id","payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_id_checkout_snapshot_id_uidx" ON "app"."payments" USING btree ("id","checkout_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_checkout_snapshot_id_uidx" ON "app"."payments" USING btree ("checkout_snapshot_id");--> statement-breakpoint
ALTER TABLE "app"."payment_attempts" ADD CONSTRAINT "payment_attempts_payment_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_initiation_idempotency" ADD CONSTRAINT "payment_initiation_idempotency_customer_fk" FOREIGN KEY ("customer_auth_user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_initiation_idempotency" ADD CONSTRAINT "payment_initiation_idempotency_payment_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_initiation_idempotency" ADD CONSTRAINT "payment_initiation_idempotency_attempt_ownership_fk" FOREIGN KEY ("payment_attempt_id","payment_id") REFERENCES "app"."payment_attempts"("id","payment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_provider_observations" ADD CONSTRAINT "payment_provider_observations_attempt_fk" FOREIGN KEY ("attempt_id") REFERENCES "app"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_provider_references" ADD CONSTRAINT "payment_provider_references_payment_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_provider_references" ADD CONSTRAINT "payment_provider_references_attempt_ownership_fk" FOREIGN KEY ("attempt_id","payment_id") REFERENCES "app"."payment_attempts"("id","payment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_checkout_snapshot_ownership_fk" FOREIGN KEY ("checkout_snapshot_id","checkout_id") REFERENCES "app"."checkout_snapshots"("id","checkout_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_redemption_claims" ADD CONSTRAINT "promotion_redemption_claims_promotion_fk" FOREIGN KEY ("promotion_id") REFERENCES "app"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_redemption_claims" ADD CONSTRAINT "promotion_redemption_claims_checkout_snapshot_fk" FOREIGN KEY ("checkout_snapshot_id") REFERENCES "app"."checkout_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_redemption_claims" ADD CONSTRAINT "promotion_redemption_claims_payment_snapshot_fk" FOREIGN KEY ("payment_id","checkout_snapshot_id") REFERENCES "app"."payments"("id","checkout_snapshot_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_redemption_claims" ADD CONSTRAINT "promotion_redemption_claims_attempt_payment_fk" FOREIGN KEY ("payment_attempt_id","payment_id") REFERENCES "app"."payment_attempts"("id","payment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_payment_ordinal_uidx" ON "app"."payment_attempts" USING btree ("payment_id","attempt_ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_execution_identity_uidx" ON "app"."payment_attempts" USING btree ("provider_execution_identity");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_one_unresolved_uidx" ON "app"."payment_attempts" USING btree ("payment_id") WHERE "app"."payment_attempts"."status" in ('CREATED', 'PENDING', 'INDETERMINATE');--> statement-breakpoint
CREATE UNIQUE INDEX "payment_initiation_idempotency_scope_uidx" ON "app"."payment_initiation_idempotency" USING btree ("customer_auth_user_id","operation_kind","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_observations_provider_event_uidx" ON "app"."payment_provider_observations" USING btree ("provider","provider_event_id") WHERE "app"."payment_provider_observations"."provider_event_id" is not null;--> statement-breakpoint
CREATE INDEX "payment_provider_observations_attempt_idx" ON "app"."payment_provider_observations" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_references_provider_kind_value_uidx" ON "app"."payment_provider_references" USING btree ("provider","reference_kind","reference_value");--> statement-breakpoint
CREATE INDEX "payment_provider_references_payment_idx" ON "app"."payment_provider_references" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_provider_references_attempt_idx" ON "app"."payment_provider_references" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "payments_checkout_id_idx" ON "app"."payments" USING btree ("checkout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_redemption_claims_attempt_promotion_uidx" ON "app"."promotion_redemption_claims" USING btree ("payment_attempt_id","promotion_id") WHERE "app"."promotion_redemption_claims"."payment_attempt_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_redemption_claims_zero_snapshot_promotion_uidx" ON "app"."promotion_redemption_claims" USING btree ("checkout_snapshot_id","promotion_id") WHERE "app"."promotion_redemption_claims"."payment_id" is null;--> statement-breakpoint
CREATE INDEX "promotion_redemption_claims_promotion_status_idx" ON "app"."promotion_redemption_claims" USING btree ("promotion_id","status");--> statement-breakpoint
CREATE INDEX "promotion_redemption_claims_snapshot_idx" ON "app"."promotion_redemption_claims" USING btree ("checkout_snapshot_id");
