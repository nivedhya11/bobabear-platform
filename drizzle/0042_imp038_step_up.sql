CREATE TABLE "app"."workforce_step_up_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"proof_id" uuid,
	"action_class" text NOT NULL,
	"workforce_user_id" text NOT NULL,
	"session_token_hash" text NOT NULL,
	"reason_code" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workforce_step_up_audit_events_event_type_check" CHECK ("app"."workforce_step_up_audit_events"."event_type" in ('grant', 'consume', 'deny')),
	CONSTRAINT "workforce_step_up_audit_events_action_class_check" CHECK ("app"."workforce_step_up_audit_events"."action_class" in (
        'CLASS_ACCESS_MUTATION',
        'CLASS_CREDENTIAL_SECURITY',
        'CLASS_PRIVACY_DESTRUCTIVE',
        'CLASS_FINANCIAL_REVERSAL'
      )),
	CONSTRAINT "workforce_step_up_audit_events_session_token_hash_hex_check" CHECK ("app"."workforce_step_up_audit_events"."session_token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_step_up_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token_hash" text NOT NULL,
	"workforce_user_id" text NOT NULL,
	"action_class" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"grant_method" text NOT NULL,
	CONSTRAINT "workforce_step_up_proofs_session_token_hash_hex_check" CHECK ("app"."workforce_step_up_proofs"."session_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "workforce_step_up_proofs_action_class_check" CHECK ("app"."workforce_step_up_proofs"."action_class" in (
        'CLASS_ACCESS_MUTATION',
        'CLASS_CREDENTIAL_SECURITY',
        'CLASS_PRIVACY_DESTRUCTIVE',
        'CLASS_FINANCIAL_REVERSAL'
      )),
	CONSTRAINT "workforce_step_up_proofs_grant_method_check" CHECK ("app"."workforce_step_up_proofs"."grant_method" in ('totp', 'password', 'password_and_totp')),
	CONSTRAINT "workforce_step_up_proofs_expires_after_created_check" CHECK ("app"."workforce_step_up_proofs"."expires_at" > "app"."workforce_step_up_proofs"."created_at"),
	CONSTRAINT "workforce_step_up_proofs_consumed_after_created_check" CHECK ("app"."workforce_step_up_proofs"."consumed_at" is null or "app"."workforce_step_up_proofs"."consumed_at" >= "app"."workforce_step_up_proofs"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."workforce_step_up_proofs" ADD CONSTRAINT "workforce_step_up_proofs_workforce_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workforce_step_up_audit_events_created_at_idx" ON "app"."workforce_step_up_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "workforce_step_up_audit_events_user_created_idx" ON "app"."workforce_step_up_audit_events" USING btree ("workforce_user_id","created_at");--> statement-breakpoint
CREATE INDEX "workforce_step_up_proofs_session_class_expires_idx" ON "app"."workforce_step_up_proofs" USING btree ("session_token_hash","action_class","expires_at");--> statement-breakpoint
CREATE INDEX "workforce_step_up_proofs_expires_at_idx" ON "app"."workforce_step_up_proofs" USING btree ("expires_at");