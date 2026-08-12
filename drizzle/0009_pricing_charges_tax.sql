CREATE TABLE "app"."charge_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "charge_definitions_code_check" CHECK ("app"."charge_definitions"."code" in ('packaging', 'delivery')),
	CONSTRAINT "charge_definitions_lifecycle_status_check" CHECK ("app"."charge_definitions"."lifecycle_status" in ('active', 'retired')),
	CONSTRAINT "charge_definitions_active_state_check" CHECK ("app"."charge_definitions"."lifecycle_status" <> 'active' or "app"."charge_definitions"."retired_at" is null),
	CONSTRAINT "charge_definitions_retired_state_check" CHECK ("app"."charge_definitions"."lifecycle_status" <> 'retired' or "app"."charge_definitions"."retired_at" is not null),
	CONSTRAINT "charge_definitions_name_nonempty_check" CHECK (length(trim("app"."charge_definitions"."name")) > 0),
	CONSTRAINT "charge_definitions_updated_at_after_created_at_check" CHECK ("app"."charge_definitions"."updated_at" >= "app"."charge_definitions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."legal_entity_tax_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"state_code" text NOT NULL,
	"registration_status" text NOT NULL,
	"gstin" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"created_by_workforce_user_id" text,
	"retired_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "legal_entity_tax_profiles_id_legal_entity_key" UNIQUE("id","legal_entity_id"),
	CONSTRAINT "legal_entity_tax_profiles_registration_status_check" CHECK ("app"."legal_entity_tax_profiles"."registration_status" in ('registered', 'unregistered')),
	CONSTRAINT "legal_entity_tax_profiles_registered_gstin_check" CHECK ("app"."legal_entity_tax_profiles"."registration_status" <> 'registered' or (
        "app"."legal_entity_tax_profiles"."gstin" is not null
        and "app"."legal_entity_tax_profiles"."gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'
      )),
	CONSTRAINT "legal_entity_tax_profiles_unregistered_gstin_check" CHECK ("app"."legal_entity_tax_profiles"."registration_status" <> 'unregistered' or "app"."legal_entity_tax_profiles"."gstin" is null),
	CONSTRAINT "legal_entity_tax_profiles_state_code_check" CHECK ("app"."legal_entity_tax_profiles"."state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "legal_entity_tax_profiles_gstin_state_prefix_check" CHECK ("app"."legal_entity_tax_profiles"."gstin" is null or substring("app"."legal_entity_tax_profiles"."gstin" from 1 for 2) = "app"."legal_entity_tax_profiles"."state_code"),
	CONSTRAINT "legal_entity_tax_profiles_lifecycle_status_check" CHECK ("app"."legal_entity_tax_profiles"."lifecycle_status" in ('active', 'retired')),
	CONSTRAINT "legal_entity_tax_profiles_active_state_check" CHECK ("app"."legal_entity_tax_profiles"."lifecycle_status" <> 'active' or "app"."legal_entity_tax_profiles"."retired_at" is null),
	CONSTRAINT "legal_entity_tax_profiles_retired_state_check" CHECK ("app"."legal_entity_tax_profiles"."lifecycle_status" <> 'retired' or "app"."legal_entity_tax_profiles"."retired_at" is not null),
	CONSTRAINT "legal_entity_tax_profiles_valid_range_check" CHECK ("app"."legal_entity_tax_profiles"."valid_to" is null or "app"."legal_entity_tax_profiles"."valid_to" > "app"."legal_entity_tax_profiles"."valid_from"),
	CONSTRAINT "legal_entity_tax_profiles_updated_at_after_created_at_check" CHECK ("app"."legal_entity_tax_profiles"."updated_at" >= "app"."legal_entity_tax_profiles"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_tax_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"legal_entity_tax_profile_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"assigned_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "outlet_tax_profiles_lifecycle_status_check" CHECK ("app"."outlet_tax_profiles"."lifecycle_status" in ('active', 'retired')),
	CONSTRAINT "outlet_tax_profiles_active_state_check" CHECK ("app"."outlet_tax_profiles"."lifecycle_status" <> 'active' or "app"."outlet_tax_profiles"."retired_at" is null),
	CONSTRAINT "outlet_tax_profiles_retired_state_check" CHECK ("app"."outlet_tax_profiles"."lifecycle_status" <> 'retired' or "app"."outlet_tax_profiles"."retired_at" is not null),
	CONSTRAINT "outlet_tax_profiles_effective_range_check" CHECK ("app"."outlet_tax_profiles"."effective_to" is null or "app"."outlet_tax_profiles"."effective_to" > "app"."outlet_tax_profiles"."effective_from"),
	CONSTRAINT "outlet_tax_profiles_updated_at_after_created_at_check" CHECK ("app"."outlet_tax_profiles"."updated_at" >= "app"."outlet_tax_profiles"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."price_book_bundle_option_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"price_book_id" uuid NOT NULL,
	"bundle_group_option_id" uuid NOT NULL,
	"price_delta_paise" bigint NOT NULL,
	"allow_territory_override" boolean DEFAULT false NOT NULL,
	"allow_organization_override" boolean DEFAULT false NOT NULL,
	"allow_outlet_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_book_bundle_option_prices_book_option_key" UNIQUE("price_book_id","bundle_group_option_id"),
	CONSTRAINT "price_book_bundle_option_prices_delta_nonnegative_check" CHECK ("app"."price_book_bundle_option_prices"."price_delta_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."price_book_charge_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"price_book_id" uuid NOT NULL,
	"charge_definition_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"calculation_mode" text NOT NULL,
	"allow_territory_override" boolean DEFAULT false NOT NULL,
	"allow_organization_override" boolean DEFAULT false NOT NULL,
	"allow_outlet_override" boolean DEFAULT false NOT NULL,
	"tax_category_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_book_charge_prices_book_charge_key" UNIQUE("price_book_id","charge_definition_id"),
	CONSTRAINT "price_book_charge_prices_amount_nonnegative_check" CHECK ("app"."price_book_charge_prices"."amount_paise" >= 0),
	CONSTRAINT "price_book_charge_prices_calculation_mode_check" CHECK ("app"."price_book_charge_prices"."calculation_mode" in ('fixed_per_order', 'per_item_quantity'))
);
--> statement-breakpoint
CREATE TABLE "app"."price_book_modifier_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"price_book_id" uuid NOT NULL,
	"variant_modifier_group_id" uuid NOT NULL,
	"modifier_group_option_id" uuid NOT NULL,
	"price_delta_paise" bigint NOT NULL,
	"allow_territory_override" boolean DEFAULT false NOT NULL,
	"allow_organization_override" boolean DEFAULT false NOT NULL,
	"allow_outlet_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_book_modifier_prices_book_binding_key" UNIQUE("price_book_id","variant_modifier_group_id","modifier_group_option_id"),
	CONSTRAINT "price_book_modifier_prices_delta_nonnegative_check" CHECK ("app"."price_book_modifier_prices"."price_delta_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."price_book_variant_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"price_book_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"allow_territory_override" boolean DEFAULT false NOT NULL,
	"allow_organization_override" boolean DEFAULT false NOT NULL,
	"allow_outlet_override" boolean DEFAULT false NOT NULL,
	"floor_paise" bigint,
	"ceiling_paise" bigint,
	"tax_category_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_book_variant_prices_book_variant_key" UNIQUE("price_book_id","variant_id"),
	CONSTRAINT "price_book_variant_prices_amount_nonnegative_check" CHECK ("app"."price_book_variant_prices"."amount_paise" >= 0),
	CONSTRAINT "price_book_variant_prices_floor_nonnegative_check" CHECK ("app"."price_book_variant_prices"."floor_paise" is null or "app"."price_book_variant_prices"."floor_paise" >= 0),
	CONSTRAINT "price_book_variant_prices_ceiling_nonnegative_check" CHECK ("app"."price_book_variant_prices"."ceiling_paise" is null or "app"."price_book_variant_prices"."ceiling_paise" >= 0),
	CONSTRAINT "price_book_variant_prices_floor_bound_check" CHECK ("app"."price_book_variant_prices"."floor_paise" is null or "app"."price_book_variant_prices"."amount_paise" >= "app"."price_book_variant_prices"."floor_paise"),
	CONSTRAINT "price_book_variant_prices_ceiling_bound_check" CHECK ("app"."price_book_variant_prices"."ceiling_paise" is null or "app"."price_book_variant_prices"."amount_paise" <= "app"."price_book_variant_prices"."ceiling_paise"),
	CONSTRAINT "price_book_variant_prices_floor_ceiling_order_check" CHECK ("app"."price_book_variant_prices"."floor_paise" is null or "app"."price_book_variant_prices"."ceiling_paise" is null or "app"."price_book_variant_prices"."floor_paise" <= "app"."price_book_variant_prices"."ceiling_paise")
);
--> statement-breakpoint
CREATE TABLE "app"."price_books" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sales_channel" text DEFAULT 'direct' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"tax_inclusion_mode" text DEFAULT 'exclusive' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_by_workforce_user_id" text,
	"activated_by_workforce_user_id" text,
	"retired_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "price_books_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "price_books_scope_type_check" CHECK ("app"."price_books"."scope_type" in ('brand', 'territory', 'organization', 'outlet')),
	CONSTRAINT "price_books_scope_brand_shape_check" CHECK ("app"."price_books"."scope_type" <> 'brand' or (
        "app"."price_books"."territory_id" is null
        and "app"."price_books"."organization_id" is null
        and "app"."price_books"."outlet_id" is null
      )),
	CONSTRAINT "price_books_scope_territory_shape_check" CHECK ("app"."price_books"."scope_type" <> 'territory' or (
        "app"."price_books"."territory_id" is not null
        and "app"."price_books"."organization_id" is null
        and "app"."price_books"."outlet_id" is null
      )),
	CONSTRAINT "price_books_scope_organization_shape_check" CHECK ("app"."price_books"."scope_type" <> 'organization' or (
        "app"."price_books"."organization_id" is not null
        and "app"."price_books"."territory_id" is null
        and "app"."price_books"."outlet_id" is null
      )),
	CONSTRAINT "price_books_scope_outlet_shape_check" CHECK ("app"."price_books"."scope_type" <> 'outlet' or (
        "app"."price_books"."outlet_id" is not null
        and "app"."price_books"."territory_id" is not null
        and "app"."price_books"."organization_id" is not null
      )),
	CONSTRAINT "price_books_sales_channel_check" CHECK ("app"."price_books"."sales_channel" = 'direct'),
	CONSTRAINT "price_books_currency_check" CHECK ("app"."price_books"."currency" = 'INR'),
	CONSTRAINT "price_books_tax_inclusion_mode_check" CHECK ("app"."price_books"."tax_inclusion_mode" in ('exclusive', 'inclusive')),
	CONSTRAINT "price_books_lifecycle_status_check" CHECK ("app"."price_books"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "price_books_draft_state_check" CHECK ("app"."price_books"."lifecycle_status" <> 'draft' or ("app"."price_books"."activated_at" is null and "app"."price_books"."retired_at" is null)),
	CONSTRAINT "price_books_active_state_check" CHECK ("app"."price_books"."lifecycle_status" <> 'active' or ("app"."price_books"."activated_at" is not null and "app"."price_books"."retired_at" is null)),
	CONSTRAINT "price_books_retired_state_check" CHECK ("app"."price_books"."lifecycle_status" <> 'retired' or "app"."price_books"."retired_at" is not null),
	CONSTRAINT "price_books_effective_range_check" CHECK ("app"."price_books"."effective_to" is null or "app"."price_books"."effective_to" > "app"."price_books"."effective_from"),
	CONSTRAINT "price_books_code_format_check" CHECK ("app"."price_books"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."price_books"."code") between 1 and 64),
	CONSTRAINT "price_books_name_nonempty_check" CHECK (length(trim("app"."price_books"."name")) > 0),
	CONSTRAINT "price_books_updated_at_after_created_at_check" CHECK ("app"."price_books"."updated_at" >= "app"."price_books"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."pricing_tax_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"action" text NOT NULL,
	"brand_id" uuid,
	"territory_id" uuid,
	"organization_id" uuid,
	"outlet_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "pricing_tax_audit_events_action_nonempty_check" CHECK (length(trim("app"."pricing_tax_audit_events"."action")) > 0),
	CONSTRAINT "pricing_tax_audit_events_target_type_nonempty_check" CHECK (length(trim("app"."pricing_tax_audit_events"."target_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."tax_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"place_of_supply_method" text NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "tax_categories_place_of_supply_method_check" CHECK ("app"."tax_categories"."place_of_supply_method" in ('outlet_performance_location')),
	CONSTRAINT "tax_categories_lifecycle_status_check" CHECK ("app"."tax_categories"."lifecycle_status" in ('active', 'retired')),
	CONSTRAINT "tax_categories_retired_state_check" CHECK ("app"."tax_categories"."lifecycle_status" <> 'retired' or "app"."tax_categories"."retired_at" is not null),
	CONSTRAINT "tax_categories_active_state_check" CHECK ("app"."tax_categories"."lifecycle_status" <> 'active' or "app"."tax_categories"."retired_at" is null),
	CONSTRAINT "tax_categories_code_nonempty_check" CHECK (length(trim("app"."tax_categories"."code")) > 0),
	CONSTRAINT "tax_categories_name_nonempty_check" CHECK (length(trim("app"."tax_categories"."name")) > 0),
	CONSTRAINT "tax_categories_updated_at_after_created_at_check" CHECK ("app"."tax_categories"."updated_at" >= "app"."tax_categories"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."tax_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tax_category_id" uuid NOT NULL,
	"jurisdiction" text NOT NULL,
	"sales_channel" text DEFAULT 'direct' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"total_rate_bps" integer NOT NULL,
	"itc_allowed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"legal_reference" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "tax_policies_sales_channel_check" CHECK ("app"."tax_policies"."sales_channel" = 'direct'),
	CONSTRAINT "tax_policies_jurisdiction_nonempty_check" CHECK (length(trim("app"."tax_policies"."jurisdiction")) > 0),
	CONSTRAINT "tax_policies_total_rate_bps_check" CHECK ("app"."tax_policies"."total_rate_bps" >= 0 and "app"."tax_policies"."total_rate_bps" <= 10000),
	CONSTRAINT "tax_policies_lifecycle_status_check" CHECK ("app"."tax_policies"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "tax_policies_draft_state_check" CHECK ("app"."tax_policies"."lifecycle_status" <> 'draft' or ("app"."tax_policies"."activated_at" is null and "app"."tax_policies"."retired_at" is null)),
	CONSTRAINT "tax_policies_active_state_check" CHECK ("app"."tax_policies"."lifecycle_status" <> 'active' or ("app"."tax_policies"."activated_at" is not null and "app"."tax_policies"."retired_at" is null)),
	CONSTRAINT "tax_policies_retired_state_check" CHECK ("app"."tax_policies"."lifecycle_status" <> 'retired' or "app"."tax_policies"."retired_at" is not null),
	CONSTRAINT "tax_policies_effective_range_check" CHECK ("app"."tax_policies"."effective_to" is null or "app"."tax_policies"."effective_to" > "app"."tax_policies"."effective_from"),
	CONSTRAINT "tax_policies_legal_reference_length_check" CHECK ("app"."tax_policies"."legal_reference" is null or char_length("app"."tax_policies"."legal_reference") <= 500),
	CONSTRAINT "tax_policies_updated_at_after_created_at_check" CHECK ("app"."tax_policies"."updated_at" >= "app"."tax_policies"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."tax_policy_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tax_policy_id" uuid NOT NULL,
	"applicability" text NOT NULL,
	"tax_type" text NOT NULL,
	"rate_bps" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tax_policy_components_policy_applicability_type_key" UNIQUE("tax_policy_id","applicability","tax_type"),
	CONSTRAINT "tax_policy_components_applicability_check" CHECK ("app"."tax_policy_components"."applicability" in ('intra_state', 'inter_state')),
	CONSTRAINT "tax_policy_components_tax_type_check" CHECK ("app"."tax_policy_components"."tax_type" in ('cgst', 'sgst', 'utgst', 'igst')),
	CONSTRAINT "tax_policy_components_rate_bps_check" CHECK ("app"."tax_policy_components"."rate_bps" >= 0 and "app"."tax_policy_components"."rate_bps" <= 10000),
	CONSTRAINT "tax_policy_components_intra_state_type_check" CHECK ("app"."tax_policy_components"."applicability" <> 'intra_state' or "app"."tax_policy_components"."tax_type" in ('cgst', 'sgst', 'utgst')),
	CONSTRAINT "tax_policy_components_inter_state_type_check" CHECK ("app"."tax_policy_components"."applicability" <> 'inter_state' or "app"."tax_policy_components"."tax_type" = 'igst')
);
--> statement-breakpoint
ALTER TABLE "app"."legal_entity_tax_profiles" ADD CONSTRAINT "legal_entity_tax_profiles_legal_entity_ancestry_fk" FOREIGN KEY ("legal_entity_id","brand_id","organization_id") REFERENCES "app"."legal_entities"("id","brand_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."legal_entity_tax_profiles" ADD CONSTRAINT "legal_entity_tax_profiles_created_by_workforce_user_fk" FOREIGN KEY ("created_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."legal_entity_tax_profiles" ADD CONSTRAINT "legal_entity_tax_profiles_retired_by_workforce_user_fk" FOREIGN KEY ("retired_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_tax_profiles" ADD CONSTRAINT "outlet_tax_profiles_outlet_full_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id","legal_entity_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id","legal_entity_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_tax_profiles" ADD CONSTRAINT "outlet_tax_profiles_profile_legal_entity_fk" FOREIGN KEY ("legal_entity_tax_profile_id","legal_entity_id") REFERENCES "app"."legal_entity_tax_profiles"("id","legal_entity_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_tax_profiles" ADD CONSTRAINT "outlet_tax_profiles_assigned_by_workforce_user_fk" FOREIGN KEY ("assigned_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_bundle_option_prices" ADD CONSTRAINT "price_book_bundle_option_prices_book_brand_fk" FOREIGN KEY ("price_book_id","brand_id") REFERENCES "app"."price_books"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_bundle_option_prices" ADD CONSTRAINT "price_book_bundle_option_prices_option_brand_fk" FOREIGN KEY ("bundle_group_option_id","brand_id") REFERENCES "app"."catalog_bundle_group_options"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_charge_prices" ADD CONSTRAINT "price_book_charge_prices_book_brand_fk" FOREIGN KEY ("price_book_id","brand_id") REFERENCES "app"."price_books"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_charge_prices" ADD CONSTRAINT "price_book_charge_prices_charge_definition_fk" FOREIGN KEY ("charge_definition_id") REFERENCES "app"."charge_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_charge_prices" ADD CONSTRAINT "price_book_charge_prices_tax_category_fk" FOREIGN KEY ("tax_category_id") REFERENCES "app"."tax_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_modifier_prices" ADD CONSTRAINT "price_book_modifier_prices_book_brand_fk" FOREIGN KEY ("price_book_id","brand_id") REFERENCES "app"."price_books"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_modifier_prices" ADD CONSTRAINT "price_book_modifier_prices_variant_group_brand_fk" FOREIGN KEY ("variant_modifier_group_id","brand_id") REFERENCES "app"."catalog_variant_modifier_groups"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_modifier_prices" ADD CONSTRAINT "price_book_modifier_prices_group_option_brand_fk" FOREIGN KEY ("modifier_group_option_id","brand_id") REFERENCES "app"."catalog_modifier_group_options"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_variant_prices" ADD CONSTRAINT "price_book_variant_prices_book_brand_fk" FOREIGN KEY ("price_book_id","brand_id") REFERENCES "app"."price_books"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_variant_prices" ADD CONSTRAINT "price_book_variant_prices_variant_brand_fk" FOREIGN KEY ("variant_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_book_variant_prices" ADD CONSTRAINT "price_book_variant_prices_tax_category_fk" FOREIGN KEY ("tax_category_id") REFERENCES "app"."tax_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_territory_brand_fk" FOREIGN KEY ("territory_id","brand_id") REFERENCES "app"."territories"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_created_by_workforce_user_fk" FOREIGN KEY ("created_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_activated_by_workforce_user_fk" FOREIGN KEY ("activated_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_retired_by_workforce_user_fk" FOREIGN KEY ("retired_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pricing_tax_audit_events" ADD CONSTRAINT "pricing_tax_audit_events_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pricing_tax_audit_events" ADD CONSTRAINT "pricing_tax_audit_events_actor_workforce_user_fk" FOREIGN KEY ("actor_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_policies" ADD CONSTRAINT "tax_policies_tax_category_fk" FOREIGN KEY ("tax_category_id") REFERENCES "app"."tax_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_policy_components" ADD CONSTRAINT "tax_policy_components_policy_fk" FOREIGN KEY ("tax_policy_id") REFERENCES "app"."tax_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "charge_definitions_code_uidx" ON "app"."charge_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "legal_entity_tax_profiles_legal_entity_status_idx" ON "app"."legal_entity_tax_profiles" USING btree ("legal_entity_id","lifecycle_status");--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_tax_profiles_outlet_active_from_uidx" ON "app"."outlet_tax_profiles" USING btree ("outlet_id","effective_from") WHERE "app"."outlet_tax_profiles"."lifecycle_status" = 'active';--> statement-breakpoint
CREATE INDEX "outlet_tax_profiles_outlet_status_idx" ON "app"."outlet_tax_profiles" USING btree ("outlet_id","lifecycle_status");--> statement-breakpoint
CREATE INDEX "price_book_bundle_option_prices_option_idx" ON "app"."price_book_bundle_option_prices" USING btree ("bundle_group_option_id");--> statement-breakpoint
CREATE INDEX "price_book_modifier_prices_binding_idx" ON "app"."price_book_modifier_prices" USING btree ("variant_modifier_group_id","modifier_group_option_id");--> statement-breakpoint
CREATE INDEX "price_book_variant_prices_variant_idx" ON "app"."price_book_variant_prices" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_books_brand_code_nonretired_uidx" ON "app"."price_books" USING btree ("brand_id","code") WHERE "app"."price_books"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE INDEX "price_books_brand_scope_status_idx" ON "app"."price_books" USING btree ("brand_id","scope_type","lifecycle_status");--> statement-breakpoint
CREATE INDEX "price_books_outlet_status_idx" ON "app"."price_books" USING btree ("outlet_id","lifecycle_status");--> statement-breakpoint
CREATE INDEX "pricing_tax_audit_events_brand_occurred_idx" ON "app"."pricing_tax_audit_events" USING btree ("brand_id","occurred_at");--> statement-breakpoint
CREATE INDEX "pricing_tax_audit_events_action_occurred_idx" ON "app"."pricing_tax_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_categories_code_uidx" ON "app"."tax_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tax_policies_category_channel_idx" ON "app"."tax_policies" USING btree ("tax_category_id","jurisdiction","sales_channel","lifecycle_status");--> statement-breakpoint
CREATE INDEX "tax_policy_components_policy_idx" ON "app"."tax_policy_components" USING btree ("tax_policy_id","applicability");

--> statement-breakpoint
-- IMP-015 system/reference seeds only (no BOBA Bear business prices/GSTIN/outlet tax/charge amounts)
INSERT INTO "app"."tax_categories" ("id", "code", "name", "place_of_supply_method", "lifecycle_status", "created_at", "updated_at", "retired_at")
  VALUES ('a0150001-0000-4000-8000-000000000001', 'restaurant_service', 'Restaurant service', 'outlet_performance_location', 'active', timestamptz '2026-08-08T00:00:00Z', timestamptz '2026-08-08T00:00:00Z', null);
--> statement-breakpoint
INSERT INTO "app"."tax_policies" ("id", "tax_category_id", "jurisdiction", "sales_channel", "effective_from", "effective_to", "total_rate_bps", "itc_allowed", "lifecycle_status", "legal_reference", "created_at", "updated_at", "activated_at", "retired_at")
  VALUES ('a0150001-0000-4000-8000-000000000002', 'a0150001-0000-4000-8000-000000000001', 'IN', 'direct', timestamptz '2026-08-08T00:00:00+05:30', null, 500, false, 'active', 'CBIC restaurant service GST treatment (effective-dated platform policy; provisional pending launch validation)', timestamptz '2026-08-08T00:00:00Z', timestamptz '2026-08-08T00:00:00Z', timestamptz '2026-08-08T00:00:00Z', null);
--> statement-breakpoint
INSERT INTO "app"."tax_policy_components" ("id", "tax_policy_id", "applicability", "tax_type", "rate_bps", "created_at") VALUES
  ('a0150001-0000-4000-8000-000000000021', 'a0150001-0000-4000-8000-000000000002', 'intra_state', 'cgst', 250, timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."tax_policy_components" ("id", "tax_policy_id", "applicability", "tax_type", "rate_bps", "created_at") VALUES
  ('a0150001-0000-4000-8000-000000000022', 'a0150001-0000-4000-8000-000000000002', 'intra_state', 'sgst', 250, timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."tax_policy_components" ("id", "tax_policy_id", "applicability", "tax_type", "rate_bps", "created_at") VALUES
  ('a0150001-0000-4000-8000-000000000023', 'a0150001-0000-4000-8000-000000000002', 'intra_state', 'utgst', 250, timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."tax_policy_components" ("id", "tax_policy_id", "applicability", "tax_type", "rate_bps", "created_at") VALUES
  ('a0150001-0000-4000-8000-000000000024', 'a0150001-0000-4000-8000-000000000002', 'inter_state', 'igst', 500, timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."charge_definitions" ("id", "code", "name", "description", "lifecycle_status", "created_at", "updated_at", "retired_at") VALUES
  ('a0150001-0000-4000-8000-000000000003', 'packaging', 'Packaging', 'Customer packaging charge definition (no amount until configured)', 'active', timestamptz '2026-08-08T00:00:00Z', timestamptz '2026-08-08T00:00:00Z', null);
--> statement-breakpoint
INSERT INTO "app"."charge_definitions" ("id", "code", "name", "description", "lifecycle_status", "created_at", "updated_at", "retired_at") VALUES
  ('a0150001-0000-4000-8000-000000000004', 'delivery', 'Delivery', 'Customer delivery charge definition (no amount until configured; distinct from provider cost)', 'active', timestamptz '2026-08-08T00:00:00Z', timestamptz '2026-08-08T00:00:00Z', null);
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('pricing.read', 'pricing.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('pricing.manage', 'pricing.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('charges.read', 'charges.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('charges.manage', 'charges.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('tax.read', 'tax.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('tax.manage', 'tax.manage', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('pricing.audit.read', 'pricing.audit.read', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'pricing.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'pricing.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'pricing.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'pricing.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'charges.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'charges.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'charges.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'charges.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'tax.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'tax.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'tax.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'tax.manage', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'pricing.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'pricing.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'pricing.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'pricing.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'charges.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'charges.manage', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'tax.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'pricing.audit.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'charges.read', 'exact', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'pricing.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'pricing.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'charges.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'charges.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'tax.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'tax.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'pricing.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'pricing.audit.read', 'descendants', timestamptz '2026-08-08T00:00:00Z');
--> statement-breakpoint
-- Privilege tightening for boba_bear_app when the role exists (Compose).
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON
      app.price_books,
      app.price_book_variant_prices,
      app.price_book_modifier_prices,
      app.price_book_bundle_option_prices,
      app.charge_definitions,
      app.price_book_charge_prices,
      app.tax_categories,
      app.tax_policies,
      app.tax_policy_components,
      app.legal_entity_tax_profiles,
      app.outlet_tax_profiles,
      app.pricing_tax_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.price_books,
      app.price_book_variant_prices,
      app.price_book_modifier_prices,
      app.price_book_bundle_option_prices,
      app.charge_definitions,
      app.price_book_charge_prices,
      app.tax_categories,
      app.tax_policies,
      app.tax_policy_components,
      app.legal_entity_tax_profiles,
      app.outlet_tax_profiles,
      app.pricing_tax_audit_events
    FROM boba_bear_app;
    REVOKE UPDATE ON
      app.pricing_tax_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;
