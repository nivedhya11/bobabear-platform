CREATE TABLE "app"."brand_promotion_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"allow_territory_promotions" boolean DEFAULT false NOT NULL,
	"allow_organization_promotions" boolean DEFAULT false NOT NULL,
	"allow_outlet_promotions" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_promotion_policies_updated_at_after_created_at_check" CHECK ("app"."brand_promotion_policies"."updated_at" >= "app"."brand_promotion_policies"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."promotion_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"permission_key" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"brand_id" uuid,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"configuration_fingerprint" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "promotion_audit_events_action_nonempty_check" CHECK (length(trim("app"."promotion_audit_events"."action")) > 0),
	CONSTRAINT "promotion_audit_events_resource_type_nonempty_check" CHECK (length(trim("app"."promotion_audit_events"."resource_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."promotion_benefits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"benefit_type" text NOT NULL,
	"percentage_bps" integer,
	"fixed_amount_paise" bigint,
	"maximum_discount_paise" bigint,
	"buy_quantity" integer,
	"get_quantity" integer,
	"repeatable" boolean,
	"maximum_reward_quantity" integer,
	"include_modifiers" boolean DEFAULT false NOT NULL,
	"include_bundle_deltas" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotion_benefits_type_check" CHECK ("app"."promotion_benefits"."benefit_type" in ('percentage_discount', 'fixed_amount_discount', 'buy_x_get_y')),
	CONSTRAINT "promotion_benefits_percentage_shape_check" CHECK ("app"."promotion_benefits"."benefit_type" <> 'percentage_discount' or (
        "app"."promotion_benefits"."percentage_bps" is not null
        and "app"."promotion_benefits"."percentage_bps" > 0
        and "app"."promotion_benefits"."percentage_bps" <= 10000
        and "app"."promotion_benefits"."fixed_amount_paise" is null
        and "app"."promotion_benefits"."buy_quantity" is null
        and "app"."promotion_benefits"."get_quantity" is null
        and "app"."promotion_benefits"."repeatable" is null
        and "app"."promotion_benefits"."maximum_reward_quantity" is null
      )),
	CONSTRAINT "promotion_benefits_fixed_shape_check" CHECK ("app"."promotion_benefits"."benefit_type" <> 'fixed_amount_discount' or (
        "app"."promotion_benefits"."fixed_amount_paise" is not null
        and "app"."promotion_benefits"."fixed_amount_paise" > 0
        and "app"."promotion_benefits"."percentage_bps" is null
        and "app"."promotion_benefits"."buy_quantity" is null
        and "app"."promotion_benefits"."get_quantity" is null
        and "app"."promotion_benefits"."repeatable" is null
        and "app"."promotion_benefits"."maximum_reward_quantity" is null
      )),
	CONSTRAINT "promotion_benefits_bogo_shape_check" CHECK ("app"."promotion_benefits"."benefit_type" <> 'buy_x_get_y' or (
        "app"."promotion_benefits"."buy_quantity" is not null
        and "app"."promotion_benefits"."buy_quantity" > 0
        and "app"."promotion_benefits"."get_quantity" is not null
        and "app"."promotion_benefits"."get_quantity" > 0
        and "app"."promotion_benefits"."repeatable" is not null
        and "app"."promotion_benefits"."percentage_bps" is null
        and "app"."promotion_benefits"."fixed_amount_paise" is null
        and "app"."promotion_benefits"."maximum_discount_paise" is null
        and "app"."promotion_benefits"."include_modifiers" = false
        and "app"."promotion_benefits"."include_bundle_deltas" = false
        and (
          "app"."promotion_benefits"."maximum_reward_quantity" is null
          or (
            "app"."promotion_benefits"."maximum_reward_quantity" > 0
            and "app"."promotion_benefits"."maximum_reward_quantity" % "app"."promotion_benefits"."get_quantity" = 0
          )
        )
        and (
          "app"."promotion_benefits"."repeatable" = true
          or "app"."promotion_benefits"."maximum_reward_quantity" is null
        )
      )),
	CONSTRAINT "promotion_benefits_maximum_discount_check" CHECK ("app"."promotion_benefits"."maximum_discount_paise" is null or "app"."promotion_benefits"."maximum_discount_paise" > 0),
	CONSTRAINT "promotion_benefits_updated_at_after_created_at_check" CHECK ("app"."promotion_benefits"."updated_at" >= "app"."promotion_benefits"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."promotion_coupons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"canonical_code" text NOT NULL,
	"origin" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"maximum_redemptions" integer,
	"maximum_redemptions_per_customer" integer,
	"activated_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotion_coupons_origin_check" CHECK ("app"."promotion_coupons"."origin" in ('manual', 'generated')),
	CONSTRAINT "promotion_coupons_status_check" CHECK ("app"."promotion_coupons"."status" in ('draft', 'active', 'disabled', 'retired')),
	CONSTRAINT "promotion_coupons_canonical_code_format_check" CHECK ("app"."promotion_coupons"."canonical_code" ~ '^[A-Z0-9][A-Z0-9_-]*$' and char_length("app"."promotion_coupons"."canonical_code") between 3 and 64),
	CONSTRAINT "promotion_coupons_draft_state_check" CHECK ("app"."promotion_coupons"."status" <> 'draft' or ("app"."promotion_coupons"."activated_at" is null and "app"."promotion_coupons"."disabled_at" is null and "app"."promotion_coupons"."retired_at" is null)),
	CONSTRAINT "promotion_coupons_active_state_check" CHECK ("app"."promotion_coupons"."status" <> 'active' or ("app"."promotion_coupons"."activated_at" is not null and "app"."promotion_coupons"."disabled_at" is null and "app"."promotion_coupons"."retired_at" is null)),
	CONSTRAINT "promotion_coupons_disabled_state_check" CHECK ("app"."promotion_coupons"."status" <> 'disabled' or ("app"."promotion_coupons"."activated_at" is not null and "app"."promotion_coupons"."disabled_at" is not null and "app"."promotion_coupons"."retired_at" is null)),
	CONSTRAINT "promotion_coupons_retired_state_check" CHECK ("app"."promotion_coupons"."status" <> 'retired' or ("app"."promotion_coupons"."activated_at" is not null and "app"."promotion_coupons"."retired_at" is not null)),
	CONSTRAINT "promotion_coupons_time_window_check" CHECK ("app"."promotion_coupons"."starts_at" is null or "app"."promotion_coupons"."ends_at" is null or "app"."promotion_coupons"."ends_at" > "app"."promotion_coupons"."starts_at"),
	CONSTRAINT "promotion_coupons_maximum_redemptions_check" CHECK ("app"."promotion_coupons"."maximum_redemptions" is null or "app"."promotion_coupons"."maximum_redemptions" > 0),
	CONSTRAINT "promotion_coupons_maximum_redemptions_per_customer_check" CHECK ("app"."promotion_coupons"."maximum_redemptions_per_customer" is null or "app"."promotion_coupons"."maximum_redemptions_per_customer" > 0),
	CONSTRAINT "promotion_coupons_updated_at_after_created_at_check" CHECK ("app"."promotion_coupons"."updated_at" >= "app"."promotion_coupons"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."promotion_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"target_role" text NOT NULL,
	"target_type" text NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"charge_definition_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotion_targets_role_check" CHECK ("app"."promotion_targets"."target_role" in ('qualifier', 'benefit')),
	CONSTRAINT "promotion_targets_type_check" CHECK ("app"."promotion_targets"."target_type" in ('all_merchandise', 'product', 'variant', 'charge')),
	CONSTRAINT "promotion_targets_all_merchandise_shape_check" CHECK ("app"."promotion_targets"."target_type" <> 'all_merchandise' or (
        "app"."promotion_targets"."product_id" is null
        and "app"."promotion_targets"."variant_id" is null
        and "app"."promotion_targets"."charge_definition_id" is null
      )),
	CONSTRAINT "promotion_targets_product_shape_check" CHECK ("app"."promotion_targets"."target_type" <> 'product' or (
        "app"."promotion_targets"."product_id" is not null
        and "app"."promotion_targets"."variant_id" is null
        and "app"."promotion_targets"."charge_definition_id" is null
      )),
	CONSTRAINT "promotion_targets_variant_shape_check" CHECK ("app"."promotion_targets"."target_type" <> 'variant' or (
        "app"."promotion_targets"."variant_id" is not null
        and "app"."promotion_targets"."product_id" is null
        and "app"."promotion_targets"."charge_definition_id" is null
      )),
	CONSTRAINT "promotion_targets_charge_shape_check" CHECK ("app"."promotion_targets"."target_type" <> 'charge' or (
        "app"."promotion_targets"."charge_definition_id" is not null
        and "app"."promotion_targets"."product_id" is null
        and "app"."promotion_targets"."variant_id" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "app"."promotions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"scope_type" text NOT NULL,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"sales_channel" text DEFAULT 'direct' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"trigger_type" text NOT NULL,
	"stacking_policy" text DEFAULT 'exclusive' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"minimum_qualifying_amount_paise" bigint,
	"minimum_item_quantity" integer,
	"configuration_fingerprint" text,
	"activated_at" timestamp with time zone,
	"activated_by_workforce_user_id" text,
	"retired_at" timestamp with time zone,
	"retired_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotions_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "promotions_scope_type_check" CHECK ("app"."promotions"."scope_type" in ('brand', 'territory', 'organization', 'outlet')),
	CONSTRAINT "promotions_scope_brand_shape_check" CHECK ("app"."promotions"."scope_type" <> 'brand' or (
        "app"."promotions"."territory_id" is null
        and "app"."promotions"."organization_id" is null
        and "app"."promotions"."outlet_id" is null
      )),
	CONSTRAINT "promotions_scope_territory_shape_check" CHECK ("app"."promotions"."scope_type" <> 'territory' or (
        "app"."promotions"."territory_id" is not null
        and "app"."promotions"."organization_id" is null
        and "app"."promotions"."outlet_id" is null
      )),
	CONSTRAINT "promotions_scope_organization_shape_check" CHECK ("app"."promotions"."scope_type" <> 'organization' or (
        "app"."promotions"."organization_id" is not null
        and "app"."promotions"."territory_id" is null
        and "app"."promotions"."outlet_id" is null
      )),
	CONSTRAINT "promotions_scope_outlet_shape_check" CHECK ("app"."promotions"."scope_type" <> 'outlet' or (
        "app"."promotions"."outlet_id" is not null
        and "app"."promotions"."territory_id" is null
        and "app"."promotions"."organization_id" is null
      )),
	CONSTRAINT "promotions_sales_channel_check" CHECK ("app"."promotions"."sales_channel" = 'direct'),
	CONSTRAINT "promotions_status_check" CHECK ("app"."promotions"."status" in ('draft', 'active', 'retired')),
	CONSTRAINT "promotions_trigger_type_check" CHECK ("app"."promotions"."trigger_type" in ('automatic', 'coupon')),
	CONSTRAINT "promotions_stacking_policy_check" CHECK ("app"."promotions"."stacking_policy" in ('exclusive', 'combinable')),
	CONSTRAINT "promotions_draft_state_check" CHECK ("app"."promotions"."status" <> 'draft' or ("app"."promotions"."activated_at" is null and "app"."promotions"."retired_at" is null and "app"."promotions"."configuration_fingerprint" is null)),
	CONSTRAINT "promotions_active_state_check" CHECK ("app"."promotions"."status" <> 'active' or ("app"."promotions"."activated_at" is not null and "app"."promotions"."retired_at" is null and "app"."promotions"."configuration_fingerprint" is not null)),
	CONSTRAINT "promotions_retired_state_check" CHECK ("app"."promotions"."status" <> 'retired' or ("app"."promotions"."retired_at" is not null and "app"."promotions"."configuration_fingerprint" is not null)),
	CONSTRAINT "promotions_time_window_check" CHECK ("app"."promotions"."ends_at" is null or "app"."promotions"."ends_at" > "app"."promotions"."starts_at"),
	CONSTRAINT "promotions_minimum_qualifying_amount_check" CHECK ("app"."promotions"."minimum_qualifying_amount_paise" is null or "app"."promotions"."minimum_qualifying_amount_paise" > 0),
	CONSTRAINT "promotions_minimum_item_quantity_check" CHECK ("app"."promotions"."minimum_item_quantity" is null or "app"."promotions"."minimum_item_quantity" > 0),
	CONSTRAINT "promotions_code_format_check" CHECK ("app"."promotions"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."promotions"."code") between 1 and 64),
	CONSTRAINT "promotions_display_name_nonempty_check" CHECK (length(trim("app"."promotions"."display_name")) > 0),
	CONSTRAINT "promotions_updated_at_after_created_at_check" CHECK ("app"."promotions"."updated_at" >= "app"."promotions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."brand_promotion_policies" ADD CONSTRAINT "brand_promotion_policies_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_audit_events" ADD CONSTRAINT "promotion_audit_events_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_audit_events" ADD CONSTRAINT "promotion_audit_events_actor_workforce_user_fk" FOREIGN KEY ("actor_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_benefits" ADD CONSTRAINT "promotion_benefits_promotion_fk" FOREIGN KEY ("promotion_id") REFERENCES "app"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_coupons" ADD CONSTRAINT "promotion_coupons_promotion_fk" FOREIGN KEY ("promotion_id") REFERENCES "app"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_targets" ADD CONSTRAINT "promotion_targets_promotion_fk" FOREIGN KEY ("promotion_id") REFERENCES "app"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_targets" ADD CONSTRAINT "promotion_targets_product_fk" FOREIGN KEY ("product_id") REFERENCES "app"."catalog_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_targets" ADD CONSTRAINT "promotion_targets_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "app"."catalog_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotion_targets" ADD CONSTRAINT "promotion_targets_charge_definition_fk" FOREIGN KEY ("charge_definition_id") REFERENCES "app"."charge_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_territory_brand_fk" FOREIGN KEY ("territory_id","brand_id") REFERENCES "app"."territories"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_outlet_brand_fk" FOREIGN KEY ("outlet_id","brand_id") REFERENCES "app"."outlets"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_activated_by_workforce_user_fk" FOREIGN KEY ("activated_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_retired_by_workforce_user_fk" FOREIGN KEY ("retired_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_promotion_policies_brand_uidx" ON "app"."brand_promotion_policies" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "promotion_audit_events_brand_occurred_idx" ON "app"."promotion_audit_events" USING btree ("brand_id","occurred_at");--> statement-breakpoint
CREATE INDEX "promotion_audit_events_action_occurred_idx" ON "app"."promotion_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "promotion_audit_events_resource_idx" ON "app"."promotion_audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_benefits_promotion_uidx" ON "app"."promotion_benefits" USING btree ("promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_coupons_canonical_code_uidx" ON "app"."promotion_coupons" USING btree ("canonical_code");--> statement-breakpoint
CREATE INDEX "promotion_coupons_promotion_status_idx" ON "app"."promotion_coupons" USING btree ("promotion_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_targets_all_merchandise_role_uidx" ON "app"."promotion_targets" USING btree ("promotion_id","target_role") WHERE "app"."promotion_targets"."target_type" = 'all_merchandise';--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_targets_product_role_uidx" ON "app"."promotion_targets" USING btree ("promotion_id","target_role","product_id") WHERE "app"."promotion_targets"."target_type" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_targets_variant_role_uidx" ON "app"."promotion_targets" USING btree ("promotion_id","target_role","variant_id") WHERE "app"."promotion_targets"."target_type" = 'variant';--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_targets_charge_role_uidx" ON "app"."promotion_targets" USING btree ("promotion_id","target_role","charge_definition_id") WHERE "app"."promotion_targets"."target_type" = 'charge';--> statement-breakpoint
CREATE INDEX "promotion_targets_promotion_role_idx" ON "app"."promotion_targets" USING btree ("promotion_id","target_role");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_brand_code_uidx" ON "app"."promotions" USING btree ("brand_id","code");--> statement-breakpoint
CREATE INDEX "promotions_brand_status_channel_idx" ON "app"."promotions" USING btree ("brand_id","status","sales_channel");--> statement-breakpoint
CREATE INDEX "promotions_scope_status_idx" ON "app"."promotions" USING btree ("scope_type","status","starts_at");--> statement-breakpoint
CREATE INDEX "promotions_outlet_status_idx" ON "app"."promotions" USING btree ("outlet_id","status");
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('promotions.read', 'promotions.read', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('promotions.manage', 'promotions.manage', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('promotions.activate', 'promotions.activate', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('coupons.read', 'coupons.read', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('coupons.manage', 'coupons.manage', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('promotions.audit.read', 'promotions.audit.read', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'promotions.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'promotions.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'promotions.activate', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'coupons.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'coupons.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'promotions.audit.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'promotions.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'promotions.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'promotions.activate', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'coupons.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'coupons.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'promotions.audit.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'promotions.read', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'promotions.manage', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'coupons.read', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'coupons.manage', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'promotions.audit.read', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'promotions.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'coupons.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'promotions.audit.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'promotions.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'coupons.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'promotions.audit.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Draft promotions/coupons may hard-delete when never activated (application-enforced).
    -- Audit is append-only. Soft-lifecycle rows must not be truncated.
    REVOKE DELETE ON
      app.promotion_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.brand_promotion_policies,
      app.promotions,
      app.promotion_benefits,
      app.promotion_targets,
      app.promotion_coupons,
      app.promotion_audit_events
    FROM boba_bear_app;
    REVOKE UPDATE ON
      app.promotion_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;
