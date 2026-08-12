CREATE TABLE "app"."workforce_auth_rate_limits" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"window_seconds" integer NOT NULL,
	"request_count" integer NOT NULL,
	"blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workforce_auth_rate_limits_pkey" PRIMARY KEY("scope","key_hash"),
	CONSTRAINT "workforce_auth_rate_limits_key_hash_hex_check" CHECK ("app"."workforce_auth_rate_limits"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "workforce_auth_rate_limits_window_seconds_positive_check" CHECK ("app"."workforce_auth_rate_limits"."window_seconds" > 0),
	CONSTRAINT "workforce_auth_rate_limits_request_count_non_negative_check" CHECK ("app"."workforce_auth_rate_limits"."request_count" >= 0),
	CONSTRAINT "workforce_auth_rate_limits_updated_at_after_created_at_check" CHECK ("app"."workforce_auth_rate_limits"."updated_at" >= "app"."workforce_auth_rate_limits"."created_at"),
	CONSTRAINT "workforce_auth_rate_limits_blocked_until_check" CHECK ("app"."workforce_auth_rate_limits"."blocked_until" is null or "app"."workforce_auth_rate_limits"."blocked_until" >= "app"."workforce_auth_rate_limits"."window_started_at"),
	CONSTRAINT "workforce_auth_rate_limits_scope_check" CHECK ("app"."workforce_auth_rate_limits"."scope" in (
        'workforce_sign_in_email_15m',
        'workforce_sign_in_ip_10m',
        'workforce_mfa_ip_10m',
        'workforce_security_change_ip_10m'
      ))
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_auth_two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_users" ADD COLUMN "password_change_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_users" ADD COLUMN "disabled_at" timestamp;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_two_factors" ADD CONSTRAINT "workforce_auth_two_factors_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workforce_auth_two_factors_secret_idx" ON "app"."workforce_auth_two_factors" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "workforce_auth_two_factors_user_id_idx" ON "app"."workforce_auth_two_factors" USING btree ("user_id");