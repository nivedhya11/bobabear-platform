CREATE TABLE "app"."cart_line_bundle_modifier_selections" (
	"cart_line_bundle_selection_id" uuid NOT NULL,
	"variant_modifier_group_id" uuid NOT NULL,
	"modifier_group_option_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_line_bundle_modifier_selections_pk" PRIMARY KEY("cart_line_bundle_selection_id","variant_modifier_group_id","modifier_group_option_id"),
	CONSTRAINT "cart_line_bundle_modifier_selections_quantity_positive_check" CHECK ("app"."cart_line_bundle_modifier_selections"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."cart_line_bundle_selections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_line_id" uuid NOT NULL,
	"bundle_group_option_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_line_bundle_selections_quantity_positive_check" CHECK ("app"."cart_line_bundle_selections"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."cart_line_modifier_selections" (
	"cart_line_id" uuid NOT NULL,
	"variant_modifier_group_id" uuid NOT NULL,
	"modifier_group_option_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_line_modifier_selections_pk" PRIMARY KEY("cart_line_id","variant_modifier_group_id","modifier_group_option_id"),
	CONSTRAINT "cart_line_modifier_selections_quantity_positive_check" CHECK ("app"."cart_line_modifier_selections"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."cart_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_lines_quantity_positive_check" CHECK ("app"."cart_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"customer_auth_user_id" text,
	"guest_credential_verifier" text,
	"manual_coupon_code" text,
	"revision" bigint NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "carts_owner_xor_check" CHECK ((
        (
          "app"."carts"."customer_auth_user_id" is not null
          and "app"."carts"."guest_credential_verifier" is null
          and "app"."carts"."expires_at" is null
        )
        or
        (
          "app"."carts"."customer_auth_user_id" is null
          and "app"."carts"."guest_credential_verifier" is not null
          and "app"."carts"."expires_at" is not null
        )
      )),
	CONSTRAINT "carts_revision_positive_check" CHECK ("app"."carts"."revision" > 0),
	CONSTRAINT "carts_guest_credential_verifier_sha256_hex_check" CHECK ("app"."carts"."guest_credential_verifier" is null or "app"."carts"."guest_credential_verifier" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "carts_manual_coupon_code_nonempty_check" CHECK ("app"."carts"."manual_coupon_code" is null or length(trim("app"."carts"."manual_coupon_code")) > 0),
	CONSTRAINT "carts_updated_at_after_created_at_check" CHECK ("app"."carts"."updated_at" >= "app"."carts"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."cart_line_bundle_modifier_selections" ADD CONSTRAINT "cart_line_bundle_modifier_selections_bundle_sel_fk" FOREIGN KEY ("cart_line_bundle_selection_id") REFERENCES "app"."cart_line_bundle_selections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_bundle_modifier_selections" ADD CONSTRAINT "cart_line_bundle_modifier_selections_vmg_fk" FOREIGN KEY ("variant_modifier_group_id") REFERENCES "app"."catalog_variant_modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_bundle_modifier_selections" ADD CONSTRAINT "cart_line_bundle_modifier_selections_mgo_fk" FOREIGN KEY ("modifier_group_option_id") REFERENCES "app"."catalog_modifier_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_bundle_selections" ADD CONSTRAINT "cart_line_bundle_selections_line_fk" FOREIGN KEY ("cart_line_id") REFERENCES "app"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_bundle_selections" ADD CONSTRAINT "cart_line_bundle_selections_bgo_fk" FOREIGN KEY ("bundle_group_option_id") REFERENCES "app"."catalog_bundle_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_modifier_selections" ADD CONSTRAINT "cart_line_modifier_selections_line_fk" FOREIGN KEY ("cart_line_id") REFERENCES "app"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_modifier_selections" ADD CONSTRAINT "cart_line_modifier_selections_vmg_fk" FOREIGN KEY ("variant_modifier_group_id") REFERENCES "app"."catalog_variant_modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_modifier_selections" ADD CONSTRAINT "cart_line_modifier_selections_mgo_fk" FOREIGN KEY ("modifier_group_option_id") REFERENCES "app"."catalog_modifier_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_lines" ADD CONSTRAINT "cart_lines_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "app"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_lines" ADD CONSTRAINT "cart_lines_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "app"."catalog_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."carts" ADD CONSTRAINT "carts_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."carts" ADD CONSTRAINT "carts_customer_auth_user_fk" FOREIGN KEY ("customer_auth_user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_line_bundle_selections_line_id_idx" ON "app"."cart_line_bundle_selections" USING btree ("cart_line_id");--> statement-breakpoint
CREATE INDEX "cart_lines_cart_id_idx" ON "app"."cart_lines" USING btree ("cart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_customer_brand_uidx" ON "app"."carts" USING btree ("customer_auth_user_id","brand_id") WHERE "app"."carts"."customer_auth_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_guest_credential_verifier_uidx" ON "app"."carts" USING btree ("guest_credential_verifier") WHERE "app"."carts"."guest_credential_verifier" is not null;--> statement-breakpoint
CREATE INDEX "carts_expires_at_idx" ON "app"."carts" USING btree ("expires_at") WHERE "app"."carts"."expires_at" is not null;