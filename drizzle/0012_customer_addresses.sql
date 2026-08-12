CREATE TABLE "app"."customer_address_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"address_id" uuid NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"action" text NOT NULL,
	"affected_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"previous_default_address_id" uuid,
	CONSTRAINT "customer_address_audit_events_actor_kind_check" CHECK ("app"."customer_address_audit_events"."actor_kind" = 'customer'),
	CONSTRAINT "customer_address_audit_events_actor_id_nonempty_check" CHECK (length(trim("app"."customer_address_audit_events"."actor_id")) > 0),
	CONSTRAINT "customer_address_audit_events_customer_auth_user_id_nonempty_check" CHECK (length(trim("app"."customer_address_audit_events"."customer_auth_user_id")) > 0),
	CONSTRAINT "customer_address_audit_events_action_check" CHECK ("app"."customer_address_audit_events"."action" in ('address_created', 'address_updated', 'address_deleted', 'address_default_set', 'address_default_cleared')),
	CONSTRAINT "customer_address_audit_events_affected_fields_array_check" CHECK (jsonb_typeof("app"."customer_address_audit_events"."affected_fields") = 'array'),
	CONSTRAINT "customer_address_audit_events_previous_default_usage_check" CHECK (("app"."customer_address_audit_events"."action" = 'address_default_set') or ("app"."customer_address_audit_events"."previous_default_address_id" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."customer_addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"landmark" text,
	"locality" text,
	"city" text NOT NULL,
	"state_code" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"label" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "customer_addresses_recipient_name_length_check" CHECK (char_length("app"."customer_addresses"."recipient_name") between 1 and 100),
	CONSTRAINT "customer_addresses_recipient_phone_nonempty_check" CHECK (length(trim("app"."customer_addresses"."recipient_phone")) > 0),
	CONSTRAINT "customer_addresses_address_line_1_length_check" CHECK (char_length("app"."customer_addresses"."address_line_1") between 1 and 200),
	CONSTRAINT "customer_addresses_address_line_2_length_check" CHECK ("app"."customer_addresses"."address_line_2" is null or char_length("app"."customer_addresses"."address_line_2") between 1 and 200),
	CONSTRAINT "customer_addresses_landmark_length_check" CHECK ("app"."customer_addresses"."landmark" is null or char_length("app"."customer_addresses"."landmark") between 1 and 150),
	CONSTRAINT "customer_addresses_locality_length_check" CHECK ("app"."customer_addresses"."locality" is null or char_length("app"."customer_addresses"."locality") between 1 and 120),
	CONSTRAINT "customer_addresses_city_length_check" CHECK (char_length("app"."customer_addresses"."city") between 1 and 100),
	CONSTRAINT "customer_addresses_state_code_nonempty_check" CHECK (length(trim("app"."customer_addresses"."state_code")) > 0),
	CONSTRAINT "customer_addresses_postal_code_check" CHECK ("app"."customer_addresses"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "customer_addresses_coordinates_pair_check" CHECK (("app"."customer_addresses"."latitude" is null) = ("app"."customer_addresses"."longitude" is null)),
	CONSTRAINT "customer_addresses_latitude_range_check" CHECK ("app"."customer_addresses"."latitude" is null or ("app"."customer_addresses"."latitude" >= -90 and "app"."customer_addresses"."latitude" <= 90)),
	CONSTRAINT "customer_addresses_longitude_range_check" CHECK ("app"."customer_addresses"."longitude" is null or ("app"."customer_addresses"."longitude" >= -180 and "app"."customer_addresses"."longitude" <= 180)),
	CONSTRAINT "customer_addresses_label_length_check" CHECK ("app"."customer_addresses"."label" is null or char_length("app"."customer_addresses"."label") between 1 and 50)
);
--> statement-breakpoint
ALTER TABLE "app"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_auth_user_fk" FOREIGN KEY ("customer_auth_user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_address_audit_events_address_occurred_idx" ON "app"."customer_address_audit_events" USING btree ("address_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_address_audit_events_auth_user_occurred_idx" ON "app"."customer_address_audit_events" USING btree ("customer_auth_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_address_audit_events_action_occurred_idx" ON "app"."customer_address_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_one_default_per_customer_uidx" ON "app"."customer_addresses" USING btree ("customer_auth_user_id") WHERE "app"."customer_addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX "customer_addresses_owner_list_idx" ON "app"."customer_addresses" USING btree ("customer_auth_user_id","is_default","created_at","id");
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Customer addresses may hard-delete (application-enforced). Audit is append-only.
    REVOKE UPDATE ON
      app.customer_address_audit_events
    FROM boba_bear_app;
    REVOKE DELETE ON
      app.customer_address_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.customer_addresses,
      app.customer_address_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;
