CREATE TABLE "app"."turnstile_token_redemptions" (
	"token_hash" text NOT NULL,
	"redeemed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	CONSTRAINT "turnstile_token_redemptions_pkey" PRIMARY KEY("token_hash"),
	CONSTRAINT "turnstile_token_redemptions_token_hash_hex_check" CHECK ("app"."turnstile_token_redemptions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "turnstile_token_redemptions_outcome_check" CHECK ("app"."turnstile_token_redemptions"."outcome" in ('success', 'failure')),
	CONSTRAINT "turnstile_token_redemptions_expires_at_after_redeemed_at_check" CHECK ("app"."turnstile_token_redemptions"."expires_at" >= "app"."turnstile_token_redemptions"."redeemed_at")
);
--> statement-breakpoint
ALTER TABLE "app"."customer_otp_rate_limits" DROP CONSTRAINT "customer_otp_rate_limits_scope_check";--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_rate_limits" DROP CONSTRAINT "workforce_auth_rate_limits_scope_check";--> statement-breakpoint
ALTER TABLE "app"."customer_otp_rate_limits" ADD COLUMN "violation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."customer_otp_rate_limits" ADD COLUMN "challenge_required_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_rate_limits" ADD COLUMN "violation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_rate_limits" ADD COLUMN "challenge_required_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "turnstile_token_redemptions_expires_at_idx" ON "app"."turnstile_token_redemptions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "app"."customer_otp_rate_limits" ADD CONSTRAINT "customer_otp_rate_limits_violation_count_non_negative_check" CHECK ("app"."customer_otp_rate_limits"."violation_count" >= 0);--> statement-breakpoint
ALTER TABLE "app"."customer_otp_rate_limits" ADD CONSTRAINT "customer_otp_rate_limits_scope_check" CHECK ("app"."customer_otp_rate_limits"."scope" in (
        'otp_send_phone_60s',
        'otp_send_phone_1h',
        'otp_send_ip_10m',
        'otp_verify_ip_10m',
        'otp_send_phone_ip_10m',
        'otp_verify_phone_ip_10m',
        'otp_abuse_phone_1d',
        'otp_abuse_ip_1d'
      ));--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_rate_limits" ADD CONSTRAINT "workforce_auth_rate_limits_violation_count_non_negative_check" CHECK ("app"."workforce_auth_rate_limits"."violation_count" >= 0);--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_rate_limits" ADD CONSTRAINT "workforce_auth_rate_limits_scope_check" CHECK ("app"."workforce_auth_rate_limits"."scope" in (
        'workforce_sign_in_email_15m',
        'workforce_sign_in_ip_10m',
        'workforce_mfa_ip_10m',
        'workforce_security_change_ip_10m',
        'workforce_sign_in_email_ip_15m',
        'workforce_abuse_email_1d',
        'workforce_abuse_ip_1d'
      ));