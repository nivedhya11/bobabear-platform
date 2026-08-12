CREATE TABLE "app"."catalog_bundle_group_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"bundle_group_id" uuid NOT NULL,
	"component_variant_id" uuid NOT NULL,
	"component_product_kind" text DEFAULT 'standard' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_bundle_group_options_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_bundle_group_options_component_kind_check" CHECK ("app"."catalog_bundle_group_options"."component_product_kind" = 'standard'),
	CONSTRAINT "catalog_bundle_group_options_quantity_check" CHECK ("app"."catalog_bundle_group_options"."quantity" >= 1 and "app"."catalog_bundle_group_options"."quantity" <= 99),
	CONSTRAINT "catalog_bundle_group_options_position_check" CHECK ("app"."catalog_bundle_group_options"."position" >= 0),
	CONSTRAINT "catalog_bundle_group_options_updated_at_after_created_at_check" CHECK ("app"."catalog_bundle_group_options"."updated_at" >= "app"."catalog_bundle_group_options"."created_at"),
	CONSTRAINT "catalog_bundle_group_options_lifecycle_status_check" CHECK ("app"."catalog_bundle_group_options"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_bundle_group_options_draft_state_check" CHECK ("app"."catalog_bundle_group_options"."lifecycle_status" <> 'draft' or ("app"."catalog_bundle_group_options"."activated_at" is null and "app"."catalog_bundle_group_options"."retired_at" is null)),
	CONSTRAINT "catalog_bundle_group_options_active_state_check" CHECK ("app"."catalog_bundle_group_options"."lifecycle_status" <> 'active' or ("app"."catalog_bundle_group_options"."activated_at" is not null and "app"."catalog_bundle_group_options"."retired_at" is null)),
	CONSTRAINT "catalog_bundle_group_options_retired_state_check" CHECK ("app"."catalog_bundle_group_options"."lifecycle_status" <> 'retired' or "app"."catalog_bundle_group_options"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_bundle_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"bundle_variant_id" uuid NOT NULL,
	"parent_product_kind" text DEFAULT 'bundle' NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_bundle_groups_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_bundle_groups_parent_kind_check" CHECK ("app"."catalog_bundle_groups"."parent_product_kind" = 'bundle'),
	CONSTRAINT "catalog_bundle_groups_min_selections_check" CHECK ("app"."catalog_bundle_groups"."min_selections" >= 0),
	CONSTRAINT "catalog_bundle_groups_max_selections_check" CHECK ("app"."catalog_bundle_groups"."max_selections" >= 1 and "app"."catalog_bundle_groups"."max_selections" <= 99),
	CONSTRAINT "catalog_bundle_groups_selections_range_check" CHECK ("app"."catalog_bundle_groups"."min_selections" <= "app"."catalog_bundle_groups"."max_selections"),
	CONSTRAINT "catalog_bundle_groups_position_check" CHECK ("app"."catalog_bundle_groups"."position" >= 0),
	CONSTRAINT "catalog_bundle_groups_name_length_check" CHECK (char_length("app"."catalog_bundle_groups"."name") between 1 and 160),
	CONSTRAINT "catalog_bundle_groups_updated_at_after_created_at_check" CHECK ("app"."catalog_bundle_groups"."updated_at" >= "app"."catalog_bundle_groups"."created_at"),
	CONSTRAINT "catalog_bundle_groups_code_format_check" CHECK ("app"."catalog_bundle_groups"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_bundle_groups"."code") between 1 and 64),
	CONSTRAINT "catalog_bundle_groups_lifecycle_status_check" CHECK ("app"."catalog_bundle_groups"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_bundle_groups_draft_state_check" CHECK ("app"."catalog_bundle_groups"."lifecycle_status" <> 'draft' or ("app"."catalog_bundle_groups"."activated_at" is null and "app"."catalog_bundle_groups"."retired_at" is null)),
	CONSTRAINT "catalog_bundle_groups_active_state_check" CHECK ("app"."catalog_bundle_groups"."lifecycle_status" <> 'active' or ("app"."catalog_bundle_groups"."activated_at" is not null and "app"."catalog_bundle_groups"."retired_at" is null)),
	CONSTRAINT "catalog_bundle_groups_retired_state_check" CHECK ("app"."catalog_bundle_groups"."lifecycle_status" <> 'retired' or "app"."catalog_bundle_groups"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_dietary_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_dietary_tags_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_dietary_tags_kind_check" CHECK ("app"."catalog_dietary_tags"."kind" in ('dietary', 'allergen')),
	CONSTRAINT "catalog_dietary_tags_name_length_check" CHECK (char_length("app"."catalog_dietary_tags"."name") between 1 and 160),
	CONSTRAINT "catalog_dietary_tags_updated_at_after_created_at_check" CHECK ("app"."catalog_dietary_tags"."updated_at" >= "app"."catalog_dietary_tags"."created_at"),
	CONSTRAINT "catalog_dietary_tags_code_format_check" CHECK ("app"."catalog_dietary_tags"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_dietary_tags"."code") between 1 and 64),
	CONSTRAINT "catalog_dietary_tags_lifecycle_status_check" CHECK ("app"."catalog_dietary_tags"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_dietary_tags_draft_state_check" CHECK ("app"."catalog_dietary_tags"."lifecycle_status" <> 'draft' or ("app"."catalog_dietary_tags"."activated_at" is null and "app"."catalog_dietary_tags"."retired_at" is null)),
	CONSTRAINT "catalog_dietary_tags_active_state_check" CHECK ("app"."catalog_dietary_tags"."lifecycle_status" <> 'active' or ("app"."catalog_dietary_tags"."activated_at" is not null and "app"."catalog_dietary_tags"."retired_at" is null)),
	CONSTRAINT "catalog_dietary_tags_retired_state_check" CHECK ("app"."catalog_dietary_tags"."lifecycle_status" <> 'retired' or "app"."catalog_dietary_tags"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_group_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"max_quantity" integer NOT NULL,
	"default_quantity" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_modifier_group_options_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_modifier_group_options_min_quantity_check" CHECK ("app"."catalog_modifier_group_options"."min_quantity" >= 0),
	CONSTRAINT "catalog_modifier_group_options_max_quantity_check" CHECK ("app"."catalog_modifier_group_options"."max_quantity" >= 1 and "app"."catalog_modifier_group_options"."max_quantity" <= 99),
	CONSTRAINT "catalog_modifier_group_options_quantity_range_check" CHECK ("app"."catalog_modifier_group_options"."min_quantity" <= "app"."catalog_modifier_group_options"."max_quantity"),
	CONSTRAINT "catalog_modifier_group_options_default_quantity_check" CHECK ("app"."catalog_modifier_group_options"."default_quantity" >= "app"."catalog_modifier_group_options"."min_quantity" and "app"."catalog_modifier_group_options"."default_quantity" <= "app"."catalog_modifier_group_options"."max_quantity"),
	CONSTRAINT "catalog_modifier_group_options_position_check" CHECK ("app"."catalog_modifier_group_options"."position" >= 0),
	CONSTRAINT "catalog_modifier_group_options_updated_at_after_created_at_check" CHECK ("app"."catalog_modifier_group_options"."updated_at" >= "app"."catalog_modifier_group_options"."created_at"),
	CONSTRAINT "catalog_modifier_group_options_lifecycle_status_check" CHECK ("app"."catalog_modifier_group_options"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_modifier_group_options_draft_state_check" CHECK ("app"."catalog_modifier_group_options"."lifecycle_status" <> 'draft' or ("app"."catalog_modifier_group_options"."activated_at" is null and "app"."catalog_modifier_group_options"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_group_options_active_state_check" CHECK ("app"."catalog_modifier_group_options"."lifecycle_status" <> 'active' or ("app"."catalog_modifier_group_options"."activated_at" is not null and "app"."catalog_modifier_group_options"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_group_options_retired_state_check" CHECK ("app"."catalog_modifier_group_options"."lifecycle_status" <> 'retired' or "app"."catalog_modifier_group_options"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_modifier_groups_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_modifier_groups_name_length_check" CHECK (char_length("app"."catalog_modifier_groups"."name") between 1 and 160),
	CONSTRAINT "catalog_modifier_groups_description_length_check" CHECK ("app"."catalog_modifier_groups"."description" is null or char_length("app"."catalog_modifier_groups"."description") <= 2000),
	CONSTRAINT "catalog_modifier_groups_updated_at_after_created_at_check" CHECK ("app"."catalog_modifier_groups"."updated_at" >= "app"."catalog_modifier_groups"."created_at"),
	CONSTRAINT "catalog_modifier_groups_code_format_check" CHECK ("app"."catalog_modifier_groups"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_modifier_groups"."code") between 1 and 64),
	CONSTRAINT "catalog_modifier_groups_lifecycle_status_check" CHECK ("app"."catalog_modifier_groups"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_modifier_groups_draft_state_check" CHECK ("app"."catalog_modifier_groups"."lifecycle_status" <> 'draft' or ("app"."catalog_modifier_groups"."activated_at" is null and "app"."catalog_modifier_groups"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_groups_active_state_check" CHECK ("app"."catalog_modifier_groups"."lifecycle_status" <> 'active' or ("app"."catalog_modifier_groups"."activated_at" is not null and "app"."catalog_modifier_groups"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_groups_retired_state_check" CHECK ("app"."catalog_modifier_groups"."lifecycle_status" <> 'retired' or "app"."catalog_modifier_groups"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_option_dietary_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"dietary_tag_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_modifier_options_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_modifier_options_name_length_check" CHECK (char_length("app"."catalog_modifier_options"."name") between 1 and 160),
	CONSTRAINT "catalog_modifier_options_description_length_check" CHECK ("app"."catalog_modifier_options"."description" is null or char_length("app"."catalog_modifier_options"."description") <= 2000),
	CONSTRAINT "catalog_modifier_options_updated_at_after_created_at_check" CHECK ("app"."catalog_modifier_options"."updated_at" >= "app"."catalog_modifier_options"."created_at"),
	CONSTRAINT "catalog_modifier_options_code_format_check" CHECK ("app"."catalog_modifier_options"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_modifier_options"."code") between 1 and 64),
	CONSTRAINT "catalog_modifier_options_lifecycle_status_check" CHECK ("app"."catalog_modifier_options"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_modifier_options_draft_state_check" CHECK ("app"."catalog_modifier_options"."lifecycle_status" <> 'draft' or ("app"."catalog_modifier_options"."activated_at" is null and "app"."catalog_modifier_options"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_options_active_state_check" CHECK ("app"."catalog_modifier_options"."lifecycle_status" <> 'active' or ("app"."catalog_modifier_options"."activated_at" is not null and "app"."catalog_modifier_options"."retired_at" is null)),
	CONSTRAINT "catalog_modifier_options_retired_state_check" CHECK ("app"."catalog_modifier_options"."lifecycle_status" <> 'retired' or "app"."catalog_modifier_options"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"product_kind" text NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_products_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_products_id_brand_kind_key" UNIQUE("id","brand_id","product_kind"),
	CONSTRAINT "catalog_products_product_kind_check" CHECK ("app"."catalog_products"."product_kind" in ('standard', 'bundle')),
	CONSTRAINT "catalog_products_name_length_check" CHECK (char_length("app"."catalog_products"."name") between 1 and 160),
	CONSTRAINT "catalog_products_description_length_check" CHECK ("app"."catalog_products"."description" is null or char_length("app"."catalog_products"."description") <= 2000),
	CONSTRAINT "catalog_products_updated_at_after_created_at_check" CHECK ("app"."catalog_products"."updated_at" >= "app"."catalog_products"."created_at"),
	CONSTRAINT "catalog_products_code_format_check" CHECK ("app"."catalog_products"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_products"."code") between 1 and 64),
	CONSTRAINT "catalog_products_lifecycle_status_check" CHECK ("app"."catalog_products"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_products_draft_state_check" CHECK ("app"."catalog_products"."lifecycle_status" <> 'draft' or ("app"."catalog_products"."activated_at" is null and "app"."catalog_products"."retired_at" is null)),
	CONSTRAINT "catalog_products_active_state_check" CHECK ("app"."catalog_products"."lifecycle_status" <> 'active' or ("app"."catalog_products"."activated_at" is not null and "app"."catalog_products"."retired_at" is null)),
	CONSTRAINT "catalog_products_retired_state_check" CHECK ("app"."catalog_products"."lifecycle_status" <> 'retired' or "app"."catalog_products"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_variant_dietary_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"dietary_tag_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_variant_modifier_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	"min_total_quantity" integer DEFAULT 0 NOT NULL,
	"max_total_quantity" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_variant_modifier_groups_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_variant_modifier_groups_min_total_check" CHECK ("app"."catalog_variant_modifier_groups"."min_total_quantity" >= 0),
	CONSTRAINT "catalog_variant_modifier_groups_max_total_check" CHECK ("app"."catalog_variant_modifier_groups"."max_total_quantity" >= 1 and "app"."catalog_variant_modifier_groups"."max_total_quantity" <= 99),
	CONSTRAINT "catalog_variant_modifier_groups_total_range_check" CHECK ("app"."catalog_variant_modifier_groups"."min_total_quantity" <= "app"."catalog_variant_modifier_groups"."max_total_quantity"),
	CONSTRAINT "catalog_variant_modifier_groups_position_check" CHECK ("app"."catalog_variant_modifier_groups"."position" >= 0),
	CONSTRAINT "catalog_variant_modifier_groups_updated_at_after_created_at_check" CHECK ("app"."catalog_variant_modifier_groups"."updated_at" >= "app"."catalog_variant_modifier_groups"."created_at"),
	CONSTRAINT "catalog_variant_modifier_groups_lifecycle_status_check" CHECK ("app"."catalog_variant_modifier_groups"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_variant_modifier_groups_draft_state_check" CHECK ("app"."catalog_variant_modifier_groups"."lifecycle_status" <> 'draft' or ("app"."catalog_variant_modifier_groups"."activated_at" is null and "app"."catalog_variant_modifier_groups"."retired_at" is null)),
	CONSTRAINT "catalog_variant_modifier_groups_active_state_check" CHECK ("app"."catalog_variant_modifier_groups"."lifecycle_status" <> 'active' or ("app"."catalog_variant_modifier_groups"."activated_at" is not null and "app"."catalog_variant_modifier_groups"."retired_at" is null)),
	CONSTRAINT "catalog_variant_modifier_groups_retired_state_check" CHECK ("app"."catalog_variant_modifier_groups"."lifecycle_status" <> 'retired' or "app"."catalog_variant_modifier_groups"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_kind" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_selector_visible" boolean DEFAULT true NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "catalog_variants_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "catalog_variants_id_brand_kind_key" UNIQUE("id","brand_id","product_kind"),
	CONSTRAINT "catalog_variants_product_kind_check" CHECK ("app"."catalog_variants"."product_kind" in ('standard', 'bundle')),
	CONSTRAINT "catalog_variants_name_length_check" CHECK (char_length("app"."catalog_variants"."name") between 1 and 120),
	CONSTRAINT "catalog_variants_description_length_check" CHECK ("app"."catalog_variants"."description" is null or char_length("app"."catalog_variants"."description") <= 1000),
	CONSTRAINT "catalog_variants_updated_at_after_created_at_check" CHECK ("app"."catalog_variants"."updated_at" >= "app"."catalog_variants"."created_at"),
	CONSTRAINT "catalog_variants_code_format_check" CHECK ("app"."catalog_variants"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."catalog_variants"."code") between 1 and 64),
	CONSTRAINT "catalog_variants_lifecycle_status_check" CHECK ("app"."catalog_variants"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "catalog_variants_draft_state_check" CHECK ("app"."catalog_variants"."lifecycle_status" <> 'draft' or ("app"."catalog_variants"."activated_at" is null and "app"."catalog_variants"."retired_at" is null)),
	CONSTRAINT "catalog_variants_active_state_check" CHECK ("app"."catalog_variants"."lifecycle_status" <> 'active' or ("app"."catalog_variants"."activated_at" is not null and "app"."catalog_variants"."retired_at" is null)),
	CONSTRAINT "catalog_variants_retired_state_check" CHECK ("app"."catalog_variants"."lifecycle_status" <> 'retired' or "app"."catalog_variants"."retired_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."catalog_bundle_group_options" ADD CONSTRAINT "catalog_bundle_group_options_group_brand_fk" FOREIGN KEY ("bundle_group_id","brand_id") REFERENCES "app"."catalog_bundle_groups"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_bundle_group_options" ADD CONSTRAINT "catalog_bundle_group_options_component_brand_kind_fk" FOREIGN KEY ("component_variant_id","brand_id","component_product_kind") REFERENCES "app"."catalog_variants"("id","brand_id","product_kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_bundle_groups" ADD CONSTRAINT "catalog_bundle_groups_variant_brand_kind_fk" FOREIGN KEY ("bundle_variant_id","brand_id","parent_product_kind") REFERENCES "app"."catalog_variants"("id","brand_id","product_kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_dietary_tags" ADD CONSTRAINT "catalog_dietary_tags_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD CONSTRAINT "catalog_modifier_group_options_group_brand_fk" FOREIGN KEY ("modifier_group_id","brand_id") REFERENCES "app"."catalog_modifier_groups"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD CONSTRAINT "catalog_modifier_group_options_option_brand_fk" FOREIGN KEY ("modifier_option_id","brand_id") REFERENCES "app"."catalog_modifier_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_groups" ADD CONSTRAINT "catalog_modifier_groups_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_option_dietary_tags" ADD CONSTRAINT "catalog_modifier_option_dietary_tags_option_brand_fk" FOREIGN KEY ("target_id","brand_id") REFERENCES "app"."catalog_modifier_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_option_dietary_tags" ADD CONSTRAINT "catalog_modifier_option_dietary_tags_tag_brand_fk" FOREIGN KEY ("dietary_tag_id","brand_id") REFERENCES "app"."catalog_dietary_tags"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_options" ADD CONSTRAINT "catalog_modifier_options_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_products" ADD CONSTRAINT "catalog_products_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_dietary_tags" ADD CONSTRAINT "catalog_variant_dietary_tags_variant_brand_fk" FOREIGN KEY ("target_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_dietary_tags" ADD CONSTRAINT "catalog_variant_dietary_tags_tag_brand_fk" FOREIGN KEY ("dietary_tag_id","brand_id") REFERENCES "app"."catalog_dietary_tags"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD CONSTRAINT "catalog_variant_modifier_groups_variant_brand_fk" FOREIGN KEY ("variant_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD CONSTRAINT "catalog_variant_modifier_groups_group_brand_fk" FOREIGN KEY ("modifier_group_id","brand_id") REFERENCES "app"."catalog_modifier_groups"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD CONSTRAINT "catalog_variants_product_brand_fk" FOREIGN KEY ("product_id","brand_id") REFERENCES "app"."catalog_products"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD CONSTRAINT "catalog_variants_product_brand_kind_fk" FOREIGN KEY ("product_id","brand_id","product_kind") REFERENCES "app"."catalog_products"("id","brand_id","product_kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_bundle_group_options_nonretired_uidx" ON "app"."catalog_bundle_group_options" USING btree ("bundle_group_id","component_variant_id") WHERE "app"."catalog_bundle_group_options"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_bundle_groups_variant_code_uidx" ON "app"."catalog_bundle_groups" USING btree ("bundle_variant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_dietary_tags_brand_code_uidx" ON "app"."catalog_dietary_tags" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_modifier_group_options_nonretired_uidx" ON "app"."catalog_modifier_group_options" USING btree ("modifier_group_id","modifier_option_id") WHERE "app"."catalog_modifier_group_options"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_modifier_groups_brand_code_uidx" ON "app"."catalog_modifier_groups" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_modifier_option_dietary_tags_active_uidx" ON "app"."catalog_modifier_option_dietary_tags" USING btree ("target_id","dietary_tag_id") WHERE "app"."catalog_modifier_option_dietary_tags"."retired_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_modifier_options_brand_code_uidx" ON "app"."catalog_modifier_options" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_products_brand_code_uidx" ON "app"."catalog_products" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variant_dietary_tags_active_uidx" ON "app"."catalog_variant_dietary_tags" USING btree ("target_id","dietary_tag_id") WHERE "app"."catalog_variant_dietary_tags"."retired_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variant_modifier_groups_nonretired_uidx" ON "app"."catalog_variant_modifier_groups" USING btree ("variant_id","modifier_group_id") WHERE "app"."catalog_variant_modifier_groups"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variants_product_code_uidx" ON "app"."catalog_variants" USING btree ("product_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variants_product_default_nonretired_uidx" ON "app"."catalog_variants" USING btree ("product_id") WHERE "app"."catalog_variants"."is_default" = true and "app"."catalog_variants"."lifecycle_status" <> 'retired';--> statement-breakpoint
-- IMP-012 catalog permission seed (append-only; must match src/shared/access-control/catalog.ts)
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('catalog.read', 'catalog.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('catalog.manage', 'catalog.manage', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'catalog.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'catalog.manage', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'catalog.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'catalog.manage', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
-- Privilege tightening for boba_bear_app when the role exists (Compose).
-- Default privileges already grant DML; REVOKE DELETE/TRUNCATE only. No GRANT hardcoding.
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON
      app.catalog_products,
      app.catalog_variants,
      app.catalog_modifier_groups,
      app.catalog_modifier_options,
      app.catalog_modifier_group_options,
      app.catalog_variant_modifier_groups,
      app.catalog_bundle_groups,
      app.catalog_bundle_group_options,
      app.catalog_dietary_tags,
      app.catalog_variant_dietary_tags,
      app.catalog_modifier_option_dietary_tags
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.catalog_products,
      app.catalog_variants,
      app.catalog_modifier_groups,
      app.catalog_modifier_options,
      app.catalog_modifier_group_options,
      app.catalog_variant_modifier_groups,
      app.catalog_bundle_groups,
      app.catalog_bundle_group_options,
      app.catalog_dietary_tags,
      app.catalog_variant_dietary_tags,
      app.catalog_modifier_option_dietary_tags
    FROM boba_bear_app;
  END IF;
END
$priv$;
