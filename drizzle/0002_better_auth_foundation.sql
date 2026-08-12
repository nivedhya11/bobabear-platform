CREATE TABLE "app"."customer_auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."customer_auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "customer_auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app"."customer_auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app"."customer_auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "workforce_auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workforce_auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app"."workforce_auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."customer_auth_accounts" ADD CONSTRAINT "customer_auth_accounts_user_id_customer_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_auth_sessions" ADD CONSTRAINT "customer_auth_sessions_user_id_customer_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_accounts" ADD CONSTRAINT "workforce_auth_accounts_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."workforce_auth_sessions" ADD CONSTRAINT "workforce_auth_sessions_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_auth_accounts_user_id_idx" ON "app"."customer_auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_auth_sessions_user_id_idx" ON "app"."customer_auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_auth_verifications_identifier_idx" ON "app"."customer_auth_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "workforce_auth_accounts_user_id_idx" ON "app"."workforce_auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workforce_auth_sessions_user_id_idx" ON "app"."workforce_auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workforce_auth_verifications_identifier_idx" ON "app"."workforce_auth_verifications" USING btree ("identifier");