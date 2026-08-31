CREATE TABLE "app"."notification_communication_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"quiet_hours_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_communication_preferences_channel_check" CHECK ("app"."notification_communication_preferences"."channel" in ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')),
	CONSTRAINT "notification_communication_preferences_customer_id_nonempty_check" CHECK (char_length(trim("app"."notification_communication_preferences"."customer_id")) between 1 and 255),
	CONSTRAINT "notification_communication_preferences_updated_at_after_created_at_check" CHECK ("app"."notification_communication_preferences"."updated_at" >= "app"."notification_communication_preferences"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."notification_consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_ref" text,
	"granted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_consents_purpose_check" CHECK ("app"."notification_consents"."purpose" in (
  'ORDER_UPDATES',
  'DELIVERY_UPDATES',
  'SUPPORT_MESSAGES',
  'MARKETING_MESSAGES',
  'AUTHENTICATION_MESSAGES'
)),
	CONSTRAINT "notification_consents_status_check" CHECK ("app"."notification_consents"."status" in ('GRANTED', 'WITHDRAWN', 'SUPPRESSED')),
	CONSTRAINT "notification_consents_evidence_type_check" CHECK ("app"."notification_consents"."evidence_type" in (
        'TRANSACTIONAL_RELATIONSHIP',
        'EXPLICIT_OPT_IN',
        'EXPLICIT_OPT_OUT',
        'OPERATOR_SUPPRESSION'
      )),
	CONSTRAINT "notification_consents_customer_id_nonempty_check" CHECK (char_length(trim("app"."notification_consents"."customer_id")) between 1 and 255),
	CONSTRAINT "notification_consents_evidence_ref_length_check" CHECK ("app"."notification_consents"."evidence_ref" is null or char_length(trim("app"."notification_consents"."evidence_ref")) between 1 and 256),
	CONSTRAINT "notification_consents_granted_provenance_check" CHECK ("app"."notification_consents"."status" <> 'GRANTED' or "app"."notification_consents"."granted_at" is not null),
	CONSTRAINT "notification_consents_withdrawn_provenance_check" CHECK ("app"."notification_consents"."status" <> 'WITHDRAWN' or "app"."notification_consents"."withdrawn_at" is not null),
	CONSTRAINT "notification_consents_updated_at_after_created_at_check" CHECK ("app"."notification_consents"."updated_at" >= "app"."notification_consents"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."notification_message_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"notification_request_id" uuid NOT NULL,
	"attempt_sequence" bigint NOT NULL,
	"channel" text NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"status" text NOT NULL,
	"failure_category" text,
	"failure_code" text,
	"failure_detail" text,
	"correlation_id" uuid NOT NULL,
	"manual_resend_reason" text,
	"manual_resend_by_workforce_user_id" text,
	"sent_at" timestamp with time zone,
	"provider_acked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_message_attempts_channel_check" CHECK ("app"."notification_message_attempts"."channel" in ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')),
	CONSTRAINT "notification_message_attempts_status_check" CHECK ("app"."notification_message_attempts"."status" in (
  'PENDING',
  'SCHEDULED',
  'SUPPRESSED',
  'SENDING',
  'PROVIDER_ACCEPTED',
  'DELIVERED',
  'READ',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REVIEW_REQUIRED'
)),
	CONSTRAINT "notification_message_attempts_provider_nonempty_check" CHECK (char_length(trim("app"."notification_message_attempts"."provider")) between 1 and 64),
	CONSTRAINT "notification_message_attempts_sequence_positive_check" CHECK ("app"."notification_message_attempts"."attempt_sequence" > 0),
	CONSTRAINT "notification_message_attempts_failure_category_check" CHECK ("app"."notification_message_attempts"."failure_category" is null or "app"."notification_message_attempts"."failure_category" in (
  'TRANSIENT',
  'RATE_LIMITED',
  'AUTHENTICATION_FAILURE',
  'TEMPLATE_FAILURE',
  'RECIPIENT_UNAVAILABLE',
  'POLICY_REJECTED',
  'PERMANENT_FAILURE',
  'UNKNOWN'
)),
	CONSTRAINT "notification_message_attempts_failure_code_length_check" CHECK ("app"."notification_message_attempts"."failure_code" is null or char_length(trim("app"."notification_message_attempts"."failure_code")) between 1 and 128),
	CONSTRAINT "notification_message_attempts_failure_detail_length_check" CHECK ("app"."notification_message_attempts"."failure_detail" is null or char_length("app"."notification_message_attempts"."failure_detail") <= 500),
	CONSTRAINT "notification_message_attempts_manual_resend_pair_check" CHECK (("app"."notification_message_attempts"."manual_resend_reason" is null)
        = ("app"."notification_message_attempts"."manual_resend_by_workforce_user_id" is null)),
	CONSTRAINT "notification_message_attempts_manual_resend_reason_length_check" CHECK ("app"."notification_message_attempts"."manual_resend_reason" is null
        or char_length(trim("app"."notification_message_attempts"."manual_resend_reason")) between 1 and 500),
	CONSTRAINT "notification_message_attempts_external_success_provenance_check" CHECK ("app"."notification_message_attempts"."status" not in ('PROVIDER_ACCEPTED', 'DELIVERED', 'READ')
        or ("app"."notification_message_attempts"."provider_message_id" is not null and "app"."notification_message_attempts"."provider_acked_at" is not null)),
	CONSTRAINT "notification_message_attempts_non_sending_provider_check" CHECK ("app"."notification_message_attempts"."provider" not in ('noop', 'in_app')
        or (
          "app"."notification_message_attempts"."status" not in ('PROVIDER_ACCEPTED', 'DELIVERED', 'READ')
          and "app"."notification_message_attempts"."provider_message_id" is null
          and "app"."notification_message_attempts"."provider_acked_at" is null
          and "app"."notification_message_attempts"."sent_at" is null
        ))
);
--> statement-breakpoint
CREATE TABLE "app"."notification_provider_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"provider" text NOT NULL,
	"direction" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"dedup_key" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_status" text NOT NULL,
	CONSTRAINT "notification_provider_events_channel_check" CHECK ("app"."notification_provider_events"."channel" in ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')),
	CONSTRAINT "notification_provider_events_direction_check" CHECK ("app"."notification_provider_events"."direction" in ('INBOUND', 'OUTBOUND')),
	CONSTRAINT "notification_provider_events_processing_status_check" CHECK ("app"."notification_provider_events"."processing_status" in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
	CONSTRAINT "notification_provider_events_provider_nonempty_check" CHECK (char_length(trim("app"."notification_provider_events"."provider")) between 1 and 64),
	CONSTRAINT "notification_provider_events_provider_event_id_length_check" CHECK (char_length(trim("app"."notification_provider_events"."provider_event_id")) between 1 and 256),
	CONSTRAINT "notification_provider_events_dedup_key_length_check" CHECK (char_length("app"."notification_provider_events"."dedup_key") between 1 and 512),
	CONSTRAINT "notification_provider_events_processed_provenance_check" CHECK ("app"."notification_provider_events"."processing_status" <> 'PROCESSED' or "app"."notification_provider_events"."processed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."notification_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"purpose" text NOT NULL,
	"channel" text NOT NULL,
	"semantic_type" text NOT NULL,
	"domain_event_ref" text NOT NULL,
	"dedup_key" text NOT NULL,
	"order_id" uuid,
	"status" text NOT NULL,
	"template_key" text,
	"locale" text NOT NULL,
	"suppression_reason" text,
	"review_reason" text,
	"attempt_count" bigint NOT NULL,
	"max_attempts" bigint NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"terminal_at" timestamp with time zone,
	CONSTRAINT "notification_requests_channel_check" CHECK ("app"."notification_requests"."channel" in ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')),
	CONSTRAINT "notification_requests_purpose_check" CHECK ("app"."notification_requests"."purpose" in (
  'ORDER_UPDATES',
  'DELIVERY_UPDATES',
  'SUPPORT_MESSAGES',
  'MARKETING_MESSAGES',
  'AUTHENTICATION_MESSAGES'
)),
	CONSTRAINT "notification_requests_semantic_type_check" CHECK ("app"."notification_requests"."semantic_type" in (
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'ORDER_CANCELLED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
)),
	CONSTRAINT "notification_requests_status_check" CHECK ("app"."notification_requests"."status" in (
  'PENDING',
  'SCHEDULED',
  'SUPPRESSED',
  'SENDING',
  'PROVIDER_ACCEPTED',
  'DELIVERED',
  'READ',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REVIEW_REQUIRED'
)),
	CONSTRAINT "notification_requests_customer_id_nonempty_check" CHECK (char_length(trim("app"."notification_requests"."customer_id")) between 1 and 255),
	CONSTRAINT "notification_requests_domain_event_ref_length_check" CHECK (char_length(trim("app"."notification_requests"."domain_event_ref")) between 1 and 256),
	CONSTRAINT "notification_requests_dedup_key_length_check" CHECK (char_length("app"."notification_requests"."dedup_key") between 1 and 512),
	CONSTRAINT "notification_requests_locale_length_check" CHECK (char_length(trim("app"."notification_requests"."locale")) between 2 and 35),
	CONSTRAINT "notification_requests_template_key_length_check" CHECK ("app"."notification_requests"."template_key" is null or char_length(trim("app"."notification_requests"."template_key")) between 1 and 128),
	CONSTRAINT "notification_requests_suppression_reason_check" CHECK ("app"."notification_requests"."suppression_reason" is null or "app"."notification_requests"."suppression_reason" in (
        'CONSENT_WITHDRAWN',
        'CONSENT_SUPPRESSED',
        'CONSENT_MISSING',
        'CHANNEL_DISABLED',
        'SUPERSEDED_BY_LATER_SEMANTIC',
        'EXPIRED_BEFORE_SEND'
      )),
	CONSTRAINT "notification_requests_review_reason_check" CHECK ("app"."notification_requests"."review_reason" is null or "app"."notification_requests"."review_reason" in (
        'AUTHENTICATION_FAILURE',
        'TEMPLATE_FAILURE',
        'POLICY_REJECTED',
        'RETRIES_EXHAUSTED',
        'UNKNOWN_FAILURE'
      )),
	CONSTRAINT "notification_requests_attempt_count_check" CHECK ("app"."notification_requests"."attempt_count" >= 0 and "app"."notification_requests"."attempt_count" <= "app"."notification_requests"."max_attempts"),
	CONSTRAINT "notification_requests_max_attempts_check" CHECK ("app"."notification_requests"."max_attempts" between 1 and 20),
	CONSTRAINT "notification_requests_updated_at_after_created_at_check" CHECK ("app"."notification_requests"."updated_at" >= "app"."notification_requests"."created_at"),
	CONSTRAINT "notification_requests_expires_at_after_created_at_check" CHECK ("app"."notification_requests"."expires_at" > "app"."notification_requests"."created_at"),
	CONSTRAINT "notification_requests_suppression_provenance_check" CHECK (("app"."notification_requests"."status" = 'SUPPRESSED') = ("app"."notification_requests"."suppression_reason" is not null)),
	CONSTRAINT "notification_requests_review_provenance_check" CHECK ("app"."notification_requests"."status" = 'REVIEW_REQUIRED' or "app"."notification_requests"."review_reason" is null)
);
--> statement-breakpoint
CREATE TABLE "app"."notification_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"semantic_type" text NOT NULL,
	"template_key" text NOT NULL,
	"locale" text NOT NULL,
	"version" bigint NOT NULL,
	"channel" text NOT NULL,
	"provider_template_ref" text,
	"status" text NOT NULL,
	"variable_schema_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_templates_semantic_type_check" CHECK ("app"."notification_templates"."semantic_type" in (
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'ORDER_CANCELLED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
)),
	CONSTRAINT "notification_templates_channel_check" CHECK ("app"."notification_templates"."channel" in ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')),
	CONSTRAINT "notification_templates_status_check" CHECK ("app"."notification_templates"."status" in (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'PAUSED',
        'DISABLED',
        'RETIRED'
      )),
	CONSTRAINT "notification_templates_template_key_length_check" CHECK (char_length(trim("app"."notification_templates"."template_key")) between 1 and 128),
	CONSTRAINT "notification_templates_locale_length_check" CHECK (char_length(trim("app"."notification_templates"."locale")) between 2 and 35),
	CONSTRAINT "notification_templates_version_positive_check" CHECK ("app"."notification_templates"."version" > 0),
	CONSTRAINT "notification_templates_provider_template_ref_length_check" CHECK ("app"."notification_templates"."provider_template_ref" is null
        or char_length(trim("app"."notification_templates"."provider_template_ref")) between 1 and 256),
	CONSTRAINT "notification_templates_updated_at_after_created_at_check" CHECK ("app"."notification_templates"."updated_at" >= "app"."notification_templates"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."notification_message_attempts" ADD CONSTRAINT "notification_message_attempts_request_fk" FOREIGN KEY ("notification_request_id") REFERENCES "app"."notification_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_requests" ADD CONSTRAINT "notification_requests_order_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_communication_preferences_customer_channel_uidx" ON "app"."notification_communication_preferences" USING btree ("customer_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_consents_customer_purpose_uidx" ON "app"."notification_consents" USING btree ("customer_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_message_attempts_request_sequence_uidx" ON "app"."notification_message_attempts" USING btree ("notification_request_id","attempt_sequence");--> statement-breakpoint
CREATE INDEX "notification_message_attempts_request_idx" ON "app"."notification_message_attempts" USING btree ("notification_request_id");--> statement-breakpoint
CREATE INDEX "notification_message_attempts_provider_message_id_idx" ON "app"."notification_message_attempts" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_provider_events_dedup_key_uidx" ON "app"."notification_provider_events" USING btree ("dedup_key");--> statement-breakpoint
CREATE INDEX "notification_provider_events_provider_received_at_idx" ON "app"."notification_provider_events" USING btree ("provider","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_requests_dedup_key_uidx" ON "app"."notification_requests" USING btree ("dedup_key");--> statement-breakpoint
CREATE INDEX "notification_requests_customer_created_at_idx" ON "app"."notification_requests" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_requests_order_id_idx" ON "app"."notification_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "notification_requests_status_next_attempt_at_idx" ON "app"."notification_requests" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_key_locale_version_channel_uidx" ON "app"."notification_templates" USING btree ("template_key","locale","version","channel");--> statement-breakpoint
CREATE INDEX "notification_templates_lookup_idx" ON "app"."notification_templates" USING btree ("semantic_type","channel","locale","status");--> statement-breakpoint
-- IMP-033 notification template registry seed.
-- provider_template_ref stays NULL: no messaging provider adapter exists in
-- this slice, so no external template reference has been registered. An
-- APPROVED row only permits the pipeline to resolve a template; the
-- explicitly non-sending channel adapters still refuse to transmit.
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000001', 'ORDER_RECEIVED', 'order_received', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000002', 'PAYMENT_CONFIRMED', 'payment_confirmed', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000003', 'ORDER_ACCEPTED', 'order_accepted', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000004', 'ORDER_CANCELLED', 'order_cancelled', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000005', 'OUT_FOR_DELIVERY', 'out_for_delivery', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000006', 'DELIVERED', 'delivered', 'en-IN', 1, 'WHATSAPP', NULL, 'APPROVED', '[]'::jsonb, timestamptz '2026-08-31T00:00:00Z', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('notification.resend', 'notification.resend', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'notification.resend', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'notification.resend', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Communication records and their attempts are append-only history; the
    -- application runtime never hard-deletes them.
    REVOKE DELETE, TRUNCATE ON app.notification_requests FROM boba_bear_app;
    REVOKE DELETE, TRUNCATE ON app.notification_message_attempts FROM boba_bear_app;
    REVOKE DELETE, TRUNCATE ON app.notification_provider_events FROM boba_bear_app;
    REVOKE DELETE, TRUNCATE ON app.notification_consents FROM boba_bear_app;
    -- Template registry is migration-seeded content, never runtime-written.
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON app.notification_templates FROM boba_bear_app;
  END IF;
END
$priv$;
