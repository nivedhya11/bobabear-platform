CREATE TABLE "app"."customer_profile_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"action" text NOT NULL,
	"affected_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "customer_profile_audit_events_actor_kind_check" CHECK ("app"."customer_profile_audit_events"."actor_kind" = 'customer'),
	CONSTRAINT "customer_profile_audit_events_actor_id_nonempty_check" CHECK (length(trim("app"."customer_profile_audit_events"."actor_id")) > 0),
	CONSTRAINT "customer_profile_audit_events_customer_auth_user_id_nonempty_check" CHECK (length(trim("app"."customer_profile_audit_events"."customer_auth_user_id")) > 0),
	CONSTRAINT "customer_profile_audit_events_action_check" CHECK ("app"."customer_profile_audit_events"."action" in ('profile_created', 'profile_updated', 'profile_deleted')),
	CONSTRAINT "customer_profile_audit_events_affected_fields_array_check" CHECK (jsonb_typeof("app"."customer_profile_audit_events"."affected_fields") = 'array')
);
--> statement-breakpoint
CREATE TABLE "app"."customer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text,
	"email" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "customer_profiles_given_name_length_check" CHECK (char_length("app"."customer_profiles"."given_name") between 1 and 100),
	CONSTRAINT "customer_profiles_family_name_length_check" CHECK ("app"."customer_profiles"."family_name" is null or char_length("app"."customer_profiles"."family_name") between 1 and 100),
	CONSTRAINT "customer_profiles_email_length_check" CHECK ("app"."customer_profiles"."email" is null or char_length("app"."customer_profiles"."email") <= 254)
);
--> statement-breakpoint
ALTER TABLE "app"."customer_profiles" ADD CONSTRAINT "customer_profiles_customer_auth_user_fk" FOREIGN KEY ("customer_auth_user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_profile_audit_events_profile_occurred_idx" ON "app"."customer_profile_audit_events" USING btree ("profile_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_profile_audit_events_auth_user_occurred_idx" ON "app"."customer_profile_audit_events" USING btree ("customer_auth_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_profile_audit_events_action_occurred_idx" ON "app"."customer_profile_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_profiles_customer_auth_user_id_uidx" ON "app"."customer_profiles" USING btree ("customer_auth_user_id");--> statement-breakpoint
CREATE INDEX "customer_profiles_updated_at_idx" ON "app"."customer_profiles" USING btree ("updated_at");
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Customer profiles may hard-delete (application-enforced). Audit is append-only.
    REVOKE UPDATE ON
      app.customer_profile_audit_events
    FROM boba_bear_app;
    REVOKE DELETE ON
      app.customer_profile_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.customer_profiles,
      app.customer_profile_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;