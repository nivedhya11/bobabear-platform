CREATE TABLE "app"."customer_otp_rate_limits" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"window_seconds" integer NOT NULL,
	"request_count" integer NOT NULL,
	"blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "customer_otp_rate_limits_pkey" PRIMARY KEY("scope","key_hash"),
	CONSTRAINT "customer_otp_rate_limits_key_hash_hex_check" CHECK ("app"."customer_otp_rate_limits"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "customer_otp_rate_limits_window_seconds_positive_check" CHECK ("app"."customer_otp_rate_limits"."window_seconds" > 0),
	CONSTRAINT "customer_otp_rate_limits_request_count_non_negative_check" CHECK ("app"."customer_otp_rate_limits"."request_count" >= 0),
	CONSTRAINT "customer_otp_rate_limits_updated_at_after_created_at_check" CHECK ("app"."customer_otp_rate_limits"."updated_at" >= "app"."customer_otp_rate_limits"."created_at"),
	CONSTRAINT "customer_otp_rate_limits_blocked_until_check" CHECK ("app"."customer_otp_rate_limits"."blocked_until" is null or "app"."customer_otp_rate_limits"."blocked_until" >= "app"."customer_otp_rate_limits"."window_started_at"),
	CONSTRAINT "customer_otp_rate_limits_scope_check" CHECK ("app"."customer_otp_rate_limits"."scope" in (
        'otp_send_phone_60s',
        'otp_send_phone_1h',
        'otp_send_ip_10m',
        'otp_verify_ip_10m'
      ))
);
--> statement-breakpoint
ALTER TABLE "app"."customer_auth_users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "app"."customer_auth_users" ADD COLUMN "phone_number_verified" boolean;--> statement-breakpoint
ALTER TABLE "app"."customer_auth_users" ADD CONSTRAINT "customer_auth_users_phone_number_unique" UNIQUE("phone_number");