-- IMP-034 Meta WhatsApp Cloud API adapter (Notifications-owned additive).
CREATE TABLE "app"."notification_inbound_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"wa_from_e164" text,
	"customer_id" text,
	"message_type" text,
	"body_preview" text,
	"classification" text DEFAULT 'UNCLASSIFIED' NOT NULL,
	"provider_event_dedup_key" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_inbound_messages_provider_nonempty_check" CHECK (char_length(trim("app"."notification_inbound_messages"."provider")) between 1 and 64),
	CONSTRAINT "notification_inbound_messages_provider_message_id_length_check" CHECK (char_length(trim("app"."notification_inbound_messages"."provider_message_id")) between 1 and 256),
	CONSTRAINT "notification_inbound_messages_classification_check" CHECK ("app"."notification_inbound_messages"."classification" in ('UNCLASSIFIED')),
	CONSTRAINT "notification_inbound_messages_body_preview_length_check" CHECK ("app"."notification_inbound_messages"."body_preview" is null or char_length("app"."notification_inbound_messages"."body_preview") <= 280),
	CONSTRAINT "notification_inbound_messages_wa_from_length_check" CHECK ("app"."notification_inbound_messages"."wa_from_e164" is null or char_length(trim("app"."notification_inbound_messages"."wa_from_e164")) between 1 and 32),
	CONSTRAINT "notification_inbound_messages_customer_id_length_check" CHECK ("app"."notification_inbound_messages"."customer_id" is null or char_length(trim("app"."notification_inbound_messages"."customer_id")) between 1 and 255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_inbound_messages_provider_message_uidx" ON "app"."notification_inbound_messages" USING btree ("provider","provider_message_id");
--> statement-breakpoint
CREATE INDEX "notification_inbound_messages_received_at_idx" ON "app"."notification_inbound_messages" USING btree ("received_at");
--> statement-breakpoint
-- Map internal template keys to Meta template names for adapter resolution.
-- Production Meta approval of these names remains a launch-validation item.
UPDATE "app"."notification_templates"
SET "provider_template_ref" = "template_key",
    "updated_at" = timestamptz '2026-08-31T12:00:00Z'
WHERE "channel" = 'WHATSAPP'
  AND "provider_template_ref" is null;
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE, TRUNCATE ON app.notification_inbound_messages FROM boba_bear_app;
  END IF;
END
$priv$;
