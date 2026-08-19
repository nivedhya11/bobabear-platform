CREATE TABLE "app"."refund_provider_observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_id" uuid NOT NULL,
	"observation_source" text NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text,
	"normalized_outcome" text NOT NULL,
	"observed_amount_paise" bigint,
	"observed_currency" text,
	"provider_status_code" text,
	"payload_digest" text,
	"reconciliation_anomaly" text,
	"observed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "refund_provider_observations_source_check" CHECK ("app"."refund_provider_observations"."observation_source" in ('sync', 'webhook', 'query', 'reconciliation')),
	CONSTRAINT "refund_provider_observations_outcome_check" CHECK ("app"."refund_provider_observations"."normalized_outcome" in (
        'PENDING',
        'PROCESSED',
        'FAILED',
        'INDETERMINATE',
        'ANOMALY',
        'UNSUPPORTED'
      )),
	CONSTRAINT "refund_provider_observations_currency_check" CHECK ("app"."refund_provider_observations"."observed_currency" is null or length(trim("app"."refund_provider_observations"."observed_currency")) > 0),
	CONSTRAINT "refund_provider_observations_amount_positive_check" CHECK ("app"."refund_provider_observations"."observed_amount_paise" is null or "app"."refund_provider_observations"."observed_amount_paise" > 0),
	CONSTRAINT "refund_provider_observations_payload_digest_check" CHECK ("app"."refund_provider_observations"."payload_digest" is null or "app"."refund_provider_observations"."payload_digest" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."refund_provider_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"reference_kind" text NOT NULL,
	"reference_value" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "refund_provider_references_provider_nonempty_check" CHECK (length(trim("app"."refund_provider_references"."provider")) > 0),
	CONSTRAINT "refund_provider_references_kind_nonempty_check" CHECK (length(trim("app"."refund_provider_references"."reference_kind")) > 0),
	CONSTRAINT "refund_provider_references_value_nonempty_check" CHECK (length(trim("app"."refund_provider_references"."reference_value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"checkout_id" uuid,
	"checkout_snapshot_id" uuid,
	"order_id" uuid,
	"amount_paise" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"provider_idempotency_key" text NOT NULL,
	"provider_refund_id" text,
	"provider_payment_id" text,
	"provider_status_code" text,
	"failure_code" text,
	"failure_reason" text,
	"acquirer_reference" text,
	"reason" text NOT NULL,
	"operator_note" text,
	"initiated_by_actor_kind" text NOT NULL,
	"initiated_by_actor_id" text NOT NULL,
	"authorized_permission" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"pending_at" timestamp with time zone,
	"indeterminate_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "refunds_amount_positive_check" CHECK ("app"."refunds"."amount_paise" > 0),
	CONSTRAINT "refunds_currency_nonempty_check" CHECK (length(trim("app"."refunds"."currency")) > 0),
	CONSTRAINT "refunds_status_check" CHECK ("app"."refunds"."status" in ('ACCEPTED', 'PENDING', 'INDETERMINATE', 'PROCESSED', 'FAILED')),
	CONSTRAINT "refunds_provider_nonempty_check" CHECK (length(trim("app"."refunds"."provider")) > 0),
	CONSTRAINT "refunds_provider_idempotency_key_nonempty_check" CHECK (length(trim("app"."refunds"."provider_idempotency_key")) > 0),
	CONSTRAINT "refunds_reason_length_check" CHECK (char_length("app"."refunds"."reason") between 1 and 500),
	CONSTRAINT "refunds_operator_note_length_check" CHECK ("app"."refunds"."operator_note" is null or char_length("app"."refunds"."operator_note") between 1 and 1000),
	CONSTRAINT "refunds_actor_kind_check" CHECK ("app"."refunds"."initiated_by_actor_kind" = 'workforce'),
	CONSTRAINT "refunds_authorized_permission_check" CHECK ("app"."refunds"."authorized_permission" = 'payment.refund'),
	CONSTRAINT "refunds_processed_state_check" CHECK (("app"."refunds"."status" = 'PROCESSED' and "app"."refunds"."processed_at" is not null)
        or ("app"."refunds"."status" <> 'PROCESSED' and "app"."refunds"."processed_at" is null)),
	CONSTRAINT "refunds_failed_state_check" CHECK (("app"."refunds"."status" = 'FAILED' and "app"."refunds"."failed_at" is not null)
        or ("app"."refunds"."status" <> 'FAILED' and "app"."refunds"."failed_at" is null)),
	CONSTRAINT "refunds_pending_state_check" CHECK (("app"."refunds"."status" = 'PENDING' and "app"."refunds"."pending_at" is not null)
        or ("app"."refunds"."status" <> 'PENDING')),
	CONSTRAINT "refunds_indeterminate_state_check" CHECK (("app"."refunds"."status" = 'INDETERMINATE' and "app"."refunds"."indeterminate_at" is not null)
        or ("app"."refunds"."status" <> 'INDETERMINATE')),
	CONSTRAINT "refunds_updated_at_after_created_at_check" CHECK ("app"."refunds"."updated_at" >= "app"."refunds"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."refund_provider_observations" ADD CONSTRAINT "refund_provider_observations_refund_fk" FOREIGN KEY ("refund_id") REFERENCES "app"."refunds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refund_provider_references" ADD CONSTRAINT "refund_provider_references_refund_fk" FOREIGN KEY ("refund_id") REFERENCES "app"."refunds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_payment_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_checkout_snapshot_ownership_fk" FOREIGN KEY ("checkout_snapshot_id","checkout_id") REFERENCES "app"."checkout_snapshots"("id","checkout_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_order_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_initiated_by_workforce_user_fk" FOREIGN KEY ("initiated_by_actor_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refund_provider_observations_provider_event_uidx" ON "app"."refund_provider_observations" USING btree ("provider","provider_event_id") WHERE "app"."refund_provider_observations"."provider_event_id" is not null;--> statement-breakpoint
CREATE INDEX "refund_provider_observations_refund_idx" ON "app"."refund_provider_observations" USING btree ("refund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_provider_references_provider_kind_value_uidx" ON "app"."refund_provider_references" USING btree ("provider","reference_kind","reference_value");--> statement-breakpoint
CREATE INDEX "refund_provider_references_refund_idx" ON "app"."refund_provider_references" USING btree ("refund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_idempotency_key_uidx" ON "app"."refunds" USING btree ("provider_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_refund_id_uidx" ON "app"."refunds" USING btree ("provider","provider_refund_id") WHERE "app"."refunds"."provider_refund_id" is not null;--> statement-breakpoint
CREATE INDEX "refunds_payment_id_idx" ON "app"."refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_nonterminal_idx" ON "app"."refunds" USING btree ("payment_id","status") WHERE "app"."refunds"."status" in ('ACCEPTED', 'PENDING', 'INDETERMINATE');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('payment.refund', 'payment.refund', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('payment.refund.read', 'payment.refund.read', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'payment.refund', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'payment.refund.read', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'payment.refund', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'payment.refund.read', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'payment.refund', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'payment.refund.read', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'payment.refund.read', 'descendants', timestamptz '2026-08-14T00:00:00Z');
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON app.refunds FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refunds FROM boba_bear_app;
    REVOKE DELETE ON app.refund_provider_references FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_provider_references FROM boba_bear_app;
    REVOKE DELETE ON app.refund_provider_observations FROM boba_bear_app;
    REVOKE TRUNCATE ON app.refund_provider_observations FROM boba_bear_app;
  END IF;
END
$priv$;
