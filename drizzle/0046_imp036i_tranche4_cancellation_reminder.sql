ALTER TABLE "app"."notification_requests" DROP CONSTRAINT "notification_requests_semantic_type_check";--> statement-breakpoint
ALTER TABLE "app"."notification_requests" DROP CONSTRAINT "notification_requests_suppression_reason_check";--> statement-breakpoint
ALTER TABLE "app"."notification_templates" DROP CONSTRAINT "notification_templates_semantic_type_check";--> statement-breakpoint
ALTER TABLE "app"."orders" DROP CONSTRAINT "orders_lifecycle_provenance_check";--> statement-breakpoint
ALTER TABLE "app"."orders" DROP CONSTRAINT "orders_cancelled_triple_check";--> statement-breakpoint
ALTER TABLE "app"."orders" ADD COLUMN "cancelled_by_customer_auth_user_id" text;--> statement-breakpoint
ALTER TABLE "app"."notification_requests" ADD CONSTRAINT "notification_requests_semantic_type_check" CHECK ("app"."notification_requests"."semantic_type" in (
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'SCHEDULED_FULFILMENT_REMINDER',
  'ORDER_CANCELLED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
));--> statement-breakpoint
ALTER TABLE "app"."notification_requests" ADD CONSTRAINT "notification_requests_suppression_reason_check" CHECK ("app"."notification_requests"."suppression_reason" is null or "app"."notification_requests"."suppression_reason" in (
        'CONSENT_WITHDRAWN',
        'CONSENT_SUPPRESSED',
        'CONSENT_MISSING',
        'CHANNEL_DISABLED',
        'SUPERSEDED_BY_LATER_SEMANTIC',
        'EXPIRED_BEFORE_SEND',
        'ORDER_NO_LONGER_REMINDER_ELIGIBLE'
      ));--> statement-breakpoint
ALTER TABLE "app"."notification_templates" ADD CONSTRAINT "notification_templates_semantic_type_check" CHECK ("app"."notification_templates"."semantic_type" in (
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'SCHEDULED_FULFILMENT_REMINDER',
  'ORDER_CANCELLED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
));--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_lifecycle_provenance_check" CHECK ((
        (
          "app"."orders"."status" = 'PLACED'
          and "app"."orders"."accepted_at" is null
          and "app"."orders"."accepted_by_workforce_user_id" is null
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_by_customer_auth_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'ACCEPTED'
          and "app"."orders"."accepted_at" is not null
          and "app"."orders"."accepted_by_workforce_user_id" is not null
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_by_customer_auth_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'FULFILLED'
          and "app"."orders"."accepted_at" is not null
          and "app"."orders"."accepted_by_workforce_user_id" is not null
          and "app"."orders"."fulfilled_at" is not null
          and "app"."orders"."fulfilled_by_workforce_user_id" is not null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_by_customer_auth_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'CANCELLED'
          and "app"."orders"."cancelled_at" is not null
          and "app"."orders"."cancellation_reason_code" is not null
          and (
            (
              "app"."orders"."cancelled_by_workforce_user_id" is not null
              and "app"."orders"."cancelled_by_customer_auth_user_id" is null
            )
            or
            (
              "app"."orders"."cancelled_by_workforce_user_id" is null
              and "app"."orders"."cancelled_by_customer_auth_user_id" is not null
              and "app"."orders"."cancellation_reason_code" = 'CUSTOMER_REQUESTED'
            )
          )
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and (
            (
              "app"."orders"."accepted_at" is null
              and "app"."orders"."accepted_by_workforce_user_id" is null
            )
            or
            (
              "app"."orders"."accepted_at" is not null
              and "app"."orders"."accepted_by_workforce_user_id" is not null
            )
          )
        )
      ));--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_cancelled_triple_check" CHECK ((
        (
          "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_by_customer_auth_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."cancelled_at" is not null
          and "app"."orders"."cancellation_reason_code" is not null
          and (
            (
              "app"."orders"."cancelled_by_workforce_user_id" is not null
              and "app"."orders"."cancelled_by_customer_auth_user_id" is null
            )
            or
            (
              "app"."orders"."cancelled_by_workforce_user_id" is null
              and "app"."orders"."cancelled_by_customer_auth_user_id" is not null
              and char_length(trim("app"."orders"."cancelled_by_customer_auth_user_id")) between 1 and 255
              and "app"."orders"."cancellation_reason_code" = 'CUSTOMER_REQUESTED'
            )
          )
        )
      ));--> statement-breakpoint
-- Approved platform template for the scheduled fulfilment reminder. Same
-- pattern as the IMP-033 seeds after IMP-034 mapped provider_template_ref to
-- the internal template key. No new provider is introduced.
INSERT INTO "app"."notification_templates" ("id", "semantic_type", "template_key", "locale", "version", "channel", "provider_template_ref", "status", "variable_schema_json", "created_at", "updated_at") VALUES ('4b5f3d6e-0a1c-4c2e-9d31-000000000007', 'SCHEDULED_FULFILMENT_REMINDER', 'scheduled_fulfilment_reminder', 'en-IN', 1, 'WHATSAPP', 'scheduled_fulfilment_reminder', 'APPROVED', '[]'::jsonb, timestamptz '2026-09-26T00:00:00Z', timestamptz '2026-09-26T00:00:00Z');