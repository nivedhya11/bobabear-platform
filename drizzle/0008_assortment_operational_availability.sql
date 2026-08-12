CREATE TABLE "app"."assortment_availability_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"action" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "assortment_availability_audit_events_action_nonempty_check" CHECK (length(trim("app"."assortment_availability_audit_events"."action")) > 0),
	CONSTRAINT "assortment_availability_audit_events_target_type_nonempty_check" CHECK (length(trim("app"."assortment_availability_audit_events"."target_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."assortment_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"target_type" text NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"modifier_option_id" uuid,
	"decision" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reason_code" text,
	"created_by_workforce_user_id" text,
	"retired_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "assortment_rules_scope_type_check" CHECK ("app"."assortment_rules"."scope_type" in ('brand', 'territory', 'organization', 'outlet')),
	CONSTRAINT "assortment_rules_target_type_check" CHECK ("app"."assortment_rules"."target_type" in ('product', 'variant', 'modifier_option')),
	CONSTRAINT "assortment_rules_decision_check" CHECK ("app"."assortment_rules"."decision" in ('include', 'exclude')),
	CONSTRAINT "assortment_rules_status_check" CHECK ("app"."assortment_rules"."status" in ('active', 'retired')),
	CONSTRAINT "assortment_rules_active_state_check" CHECK ("app"."assortment_rules"."status" <> 'active' or "app"."assortment_rules"."retired_at" is null),
	CONSTRAINT "assortment_rules_retired_state_check" CHECK ("app"."assortment_rules"."status" <> 'retired' or "app"."assortment_rules"."retired_at" is not null),
	CONSTRAINT "assortment_rules_include_shape_check" CHECK ("app"."assortment_rules"."decision" <> 'include' or ("app"."assortment_rules"."scope_type" = 'brand' and "app"."assortment_rules"."target_type" = 'variant')),
	CONSTRAINT "assortment_rules_scope_brand_shape_check" CHECK ("app"."assortment_rules"."scope_type" <> 'brand' or (
        "app"."assortment_rules"."territory_id" is null
        and "app"."assortment_rules"."organization_id" is null
        and "app"."assortment_rules"."outlet_id" is null
      )),
	CONSTRAINT "assortment_rules_scope_territory_shape_check" CHECK ("app"."assortment_rules"."scope_type" <> 'territory' or (
        "app"."assortment_rules"."territory_id" is not null
        and "app"."assortment_rules"."organization_id" is null
        and "app"."assortment_rules"."outlet_id" is null
      )),
	CONSTRAINT "assortment_rules_scope_organization_shape_check" CHECK ("app"."assortment_rules"."scope_type" <> 'organization' or (
        "app"."assortment_rules"."organization_id" is not null
        and "app"."assortment_rules"."territory_id" is null
        and "app"."assortment_rules"."outlet_id" is null
      )),
	CONSTRAINT "assortment_rules_scope_outlet_shape_check" CHECK ("app"."assortment_rules"."scope_type" <> 'outlet' or (
        "app"."assortment_rules"."outlet_id" is not null
        and "app"."assortment_rules"."territory_id" is not null
        and "app"."assortment_rules"."organization_id" is not null
      )),
	CONSTRAINT "assortment_rules_target_product_shape_check" CHECK ("app"."assortment_rules"."target_type" <> 'product' or (
        "app"."assortment_rules"."product_id" is not null
        and "app"."assortment_rules"."variant_id" is null
        and "app"."assortment_rules"."modifier_option_id" is null
      )),
	CONSTRAINT "assortment_rules_target_variant_shape_check" CHECK ("app"."assortment_rules"."target_type" <> 'variant' or (
        "app"."assortment_rules"."variant_id" is not null
        and "app"."assortment_rules"."product_id" is null
        and "app"."assortment_rules"."modifier_option_id" is null
      )),
	CONSTRAINT "assortment_rules_target_modifier_option_shape_check" CHECK ("app"."assortment_rules"."target_type" <> 'modifier_option' or (
        "app"."assortment_rules"."modifier_option_id" is not null
        and "app"."assortment_rules"."product_id" is null
        and "app"."assortment_rules"."variant_id" is null
      )),
	CONSTRAINT "assortment_rules_reason_code_length_check" CHECK ("app"."assortment_rules"."reason_code" is null or char_length("app"."assortment_rules"."reason_code") between 1 and 64)
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_modifier_option_availability" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"state" text NOT NULL,
	"unavailable_until" timestamp with time zone,
	"reason_code" text,
	"note" text,
	"updated_by_workforce_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_modifier_option_availability_outlet_option_key" UNIQUE("outlet_id","modifier_option_id"),
	CONSTRAINT "outlet_modifier_option_availability_state_check" CHECK ("app"."outlet_modifier_option_availability"."state" in ('available', 'temporarily_unavailable', 'sold_out')),
	CONSTRAINT "outlet_modifier_option_availability_available_expiry_check" CHECK ("app"."outlet_modifier_option_availability"."state" <> 'available' or "app"."outlet_modifier_option_availability"."unavailable_until" is null),
	CONSTRAINT "outlet_modifier_option_availability_sold_out_expiry_check" CHECK ("app"."outlet_modifier_option_availability"."state" <> 'sold_out' or "app"."outlet_modifier_option_availability"."unavailable_until" is null),
	CONSTRAINT "outlet_modifier_option_availability_updated_at_after_created_at_check" CHECK ("app"."outlet_modifier_option_availability"."updated_at" >= "app"."outlet_modifier_option_availability"."created_at"),
	CONSTRAINT "outlet_modifier_option_availability_reason_code_length_check" CHECK ("app"."outlet_modifier_option_availability"."reason_code" is null or char_length("app"."outlet_modifier_option_availability"."reason_code") between 1 and 64),
	CONSTRAINT "outlet_modifier_option_availability_note_length_check" CHECK ("app"."outlet_modifier_option_availability"."note" is null or char_length("app"."outlet_modifier_option_availability"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_operating_intervals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_operating_intervals_day_of_week_check" CHECK ("app"."outlet_operating_intervals"."day_of_week" between 0 and 6),
	CONSTRAINT "outlet_operating_intervals_start_minute_check" CHECK ("app"."outlet_operating_intervals"."start_minute" >= 0 and "app"."outlet_operating_intervals"."start_minute" < 1440),
	CONSTRAINT "outlet_operating_intervals_end_minute_check" CHECK ("app"."outlet_operating_intervals"."end_minute" > 0 and "app"."outlet_operating_intervals"."end_minute" <= 1440),
	CONSTRAINT "outlet_operating_intervals_start_before_end_check" CHECK ("app"."outlet_operating_intervals"."start_minute" < "app"."outlet_operating_intervals"."end_minute"),
	CONSTRAINT "outlet_operating_intervals_updated_at_after_created_at_check" CHECK ("app"."outlet_operating_intervals"."updated_at" >= "app"."outlet_operating_intervals"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_operating_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"timezone" text NOT NULL,
	"control_state" text NOT NULL,
	"paused_until" timestamp with time zone,
	"reason_code" text,
	"note" text,
	"updated_by_workforce_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_operating_profiles_outlet_key" UNIQUE("outlet_id"),
	CONSTRAINT "outlet_operating_profiles_control_state_check" CHECK ("app"."outlet_operating_profiles"."control_state" in ('accepting', 'paused', 'suspended')),
	CONSTRAINT "outlet_operating_profiles_accepting_pause_check" CHECK ("app"."outlet_operating_profiles"."control_state" <> 'accepting' or "app"."outlet_operating_profiles"."paused_until" is null),
	CONSTRAINT "outlet_operating_profiles_suspended_pause_check" CHECK ("app"."outlet_operating_profiles"."control_state" <> 'suspended' or "app"."outlet_operating_profiles"."paused_until" is null),
	CONSTRAINT "outlet_operating_profiles_timezone_nonempty_check" CHECK (length(trim("app"."outlet_operating_profiles"."timezone")) > 0),
	CONSTRAINT "outlet_operating_profiles_updated_at_after_created_at_check" CHECK ("app"."outlet_operating_profiles"."updated_at" >= "app"."outlet_operating_profiles"."created_at"),
	CONSTRAINT "outlet_operating_profiles_reason_code_length_check" CHECK ("app"."outlet_operating_profiles"."reason_code" is null or char_length("app"."outlet_operating_profiles"."reason_code") between 1 and 64),
	CONSTRAINT "outlet_operating_profiles_note_length_check" CHECK ("app"."outlet_operating_profiles"."note" is null or char_length("app"."outlet_operating_profiles"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_variant_availability" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"state" text NOT NULL,
	"unavailable_until" timestamp with time zone,
	"reason_code" text,
	"note" text,
	"updated_by_workforce_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_variant_availability_outlet_variant_key" UNIQUE("outlet_id","variant_id"),
	CONSTRAINT "outlet_variant_availability_state_check" CHECK ("app"."outlet_variant_availability"."state" in ('available', 'temporarily_unavailable', 'sold_out')),
	CONSTRAINT "outlet_variant_availability_available_expiry_check" CHECK ("app"."outlet_variant_availability"."state" <> 'available' or "app"."outlet_variant_availability"."unavailable_until" is null),
	CONSTRAINT "outlet_variant_availability_sold_out_expiry_check" CHECK ("app"."outlet_variant_availability"."state" <> 'sold_out' or "app"."outlet_variant_availability"."unavailable_until" is null),
	CONSTRAINT "outlet_variant_availability_updated_at_after_created_at_check" CHECK ("app"."outlet_variant_availability"."updated_at" >= "app"."outlet_variant_availability"."created_at"),
	CONSTRAINT "outlet_variant_availability_reason_code_length_check" CHECK ("app"."outlet_variant_availability"."reason_code" is null or char_length("app"."outlet_variant_availability"."reason_code") between 1 and 64),
	CONSTRAINT "outlet_variant_availability_note_length_check" CHECK ("app"."outlet_variant_availability"."note" is null or char_length("app"."outlet_variant_availability"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "app"."assortment_availability_audit_events" ADD CONSTRAINT "assortment_availability_audit_events_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_availability_audit_events" ADD CONSTRAINT "assortment_availability_audit_events_actor_workforce_user_fk" FOREIGN KEY ("actor_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_territory_brand_fk" FOREIGN KEY ("territory_id","brand_id") REFERENCES "app"."territories"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_product_brand_fk" FOREIGN KEY ("product_id","brand_id") REFERENCES "app"."catalog_products"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_variant_brand_fk" FOREIGN KEY ("variant_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_modifier_option_brand_fk" FOREIGN KEY ("modifier_option_id","brand_id") REFERENCES "app"."catalog_modifier_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_created_by_workforce_user_fk" FOREIGN KEY ("created_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_retired_by_workforce_user_fk" FOREIGN KEY ("retired_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_modifier_option_availability" ADD CONSTRAINT "outlet_modifier_option_availability_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_modifier_option_availability" ADD CONSTRAINT "outlet_modifier_option_availability_option_brand_fk" FOREIGN KEY ("modifier_option_id","brand_id") REFERENCES "app"."catalog_modifier_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_modifier_option_availability" ADD CONSTRAINT "outlet_modifier_option_availability_updated_by_workforce_user_fk" FOREIGN KEY ("updated_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_operating_intervals" ADD CONSTRAINT "outlet_operating_intervals_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_operating_profiles" ADD CONSTRAINT "outlet_operating_profiles_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_operating_profiles" ADD CONSTRAINT "outlet_operating_profiles_updated_by_workforce_user_fk" FOREIGN KEY ("updated_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_variant_availability" ADD CONSTRAINT "outlet_variant_availability_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_variant_availability" ADD CONSTRAINT "outlet_variant_availability_variant_brand_fk" FOREIGN KEY ("variant_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_variant_availability" ADD CONSTRAINT "outlet_variant_availability_updated_by_workforce_user_fk" FOREIGN KEY ("updated_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assortment_availability_audit_events_brand_occurred_idx" ON "app"."assortment_availability_audit_events" USING btree ("brand_id","occurred_at");--> statement-breakpoint
CREATE INDEX "assortment_availability_audit_events_outlet_occurred_idx" ON "app"."assortment_availability_audit_events" USING btree ("outlet_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_brand_product_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","target_type","product_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'brand' and "app"."assortment_rules"."target_type" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_brand_variant_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","target_type","variant_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'brand' and "app"."assortment_rules"."target_type" = 'variant';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_brand_modifier_option_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","target_type","modifier_option_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'brand' and "app"."assortment_rules"."target_type" = 'modifier_option';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_territory_product_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","territory_id","target_type","product_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'territory' and "app"."assortment_rules"."target_type" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_territory_variant_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","territory_id","target_type","variant_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'territory' and "app"."assortment_rules"."target_type" = 'variant';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_territory_modifier_option_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","territory_id","target_type","modifier_option_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'territory' and "app"."assortment_rules"."target_type" = 'modifier_option';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_organization_product_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","organization_id","target_type","product_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'organization' and "app"."assortment_rules"."target_type" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_organization_variant_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","organization_id","target_type","variant_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'organization' and "app"."assortment_rules"."target_type" = 'variant';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_organization_modifier_option_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","organization_id","target_type","modifier_option_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'organization' and "app"."assortment_rules"."target_type" = 'modifier_option';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_outlet_product_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","outlet_id","target_type","product_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'outlet' and "app"."assortment_rules"."target_type" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_outlet_variant_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","outlet_id","target_type","variant_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'outlet' and "app"."assortment_rules"."target_type" = 'variant';--> statement-breakpoint
CREATE UNIQUE INDEX "assortment_rules_active_outlet_modifier_option_uidx" ON "app"."assortment_rules" USING btree ("brand_id","scope_type","outlet_id","target_type","modifier_option_id","decision") WHERE "app"."assortment_rules"."status" = 'active' and "app"."assortment_rules"."scope_type" = 'outlet' and "app"."assortment_rules"."target_type" = 'modifier_option';--> statement-breakpoint
CREATE INDEX "assortment_rules_brand_status_idx" ON "app"."assortment_rules" USING btree ("brand_id","status");--> statement-breakpoint
CREATE INDEX "assortment_rules_outlet_status_idx" ON "app"."assortment_rules" USING btree ("outlet_id","status");--> statement-breakpoint
CREATE INDEX "outlet_modifier_option_availability_outlet_state_idx" ON "app"."outlet_modifier_option_availability" USING btree ("outlet_id","state");--> statement-breakpoint
CREATE INDEX "outlet_operating_intervals_outlet_day_idx" ON "app"."outlet_operating_intervals" USING btree ("outlet_id","day_of_week");--> statement-breakpoint
CREATE INDEX "outlet_variant_availability_outlet_state_idx" ON "app"."outlet_variant_availability" USING btree ("outlet_id","state");
--> statement-breakpoint
-- IMP-014 assortment/availability permission seed (append-only; must match src/shared/access-control/catalog.ts)
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('assortment.read', 'assortment.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('assortment.manage', 'assortment.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('availability.read', 'availability.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('availability.manage', 'availability.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.operating_state.read', 'outlet.operating_state.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.operating_state.pause', 'outlet.operating_state.pause', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.operating_state.suspend', 'outlet.operating_state.suspend', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.operating_schedule.read', 'outlet.operating_schedule.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.operating_schedule.manage', 'outlet.operating_schedule.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('assortment.audit.read', 'assortment.audit.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'assortment.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'assortment.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'availability.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'availability.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.operating_state.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.operating_state.pause', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.operating_state.suspend', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.operating_schedule.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.operating_schedule.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'assortment.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'assortment.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'assortment.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'availability.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'availability.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.operating_state.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.operating_state.pause', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.operating_state.suspend', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.operating_schedule.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.operating_schedule.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'assortment.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'assortment.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'assortment.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'availability.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'availability.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.operating_state.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.operating_state.pause', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.operating_schedule.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.operating_schedule.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'assortment.audit.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'assortment.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'availability.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'availability.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'outlet.operating_state.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'outlet.operating_state.pause', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'outlet.operating_schedule.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'availability.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'outlet.operating_state.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'outlet.operating_schedule.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'assortment.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'availability.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'outlet.operating_state.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'outlet.operating_schedule.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'assortment.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
-- Privilege tightening for boba_bear_app when the role exists (Compose).
-- Default privileges already grant DML; REVOKE DELETE/TRUNCATE (and audit UPDATE) only. No GRANT hardcoding.
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- outlet_operating_intervals keeps DELETE so schedule replacement can
    -- atomically clear+insert intervals (config rows, not historical audit).
    REVOKE DELETE ON
      app.assortment_rules,
      app.outlet_variant_availability,
      app.outlet_modifier_option_availability,
      app.outlet_operating_profiles,
      app.assortment_availability_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.assortment_rules,
      app.outlet_variant_availability,
      app.outlet_modifier_option_availability,
      app.outlet_operating_profiles,
      app.outlet_operating_intervals,
      app.assortment_availability_audit_events
    FROM boba_bear_app;
    REVOKE UPDATE ON
      app.assortment_availability_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;
