CREATE TABLE "app"."checkout_delivery_destinations" (
	"checkout_id" uuid PRIMARY KEY NOT NULL,
	"destination_kind" text NOT NULL,
	"source_saved_address_id" uuid,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"landmark" text,
	"locality" text,
	"city" text NOT NULL,
	"state_code" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"label" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "checkout_delivery_destinations_kind_check" CHECK ("app"."checkout_delivery_destinations"."destination_kind" in ('SAVED_ADDRESS', 'ONE_TIME_ADDRESS')),
	CONSTRAINT "checkout_delivery_destinations_saved_provenance_check" CHECK ((
        (
          "app"."checkout_delivery_destinations"."destination_kind" = 'SAVED_ADDRESS'
          and "app"."checkout_delivery_destinations"."source_saved_address_id" is not null
        )
        or
        (
          "app"."checkout_delivery_destinations"."destination_kind" = 'ONE_TIME_ADDRESS'
          and "app"."checkout_delivery_destinations"."source_saved_address_id" is null
        )
      )),
	CONSTRAINT "checkout_delivery_destinations_recipient_name_length_check" CHECK (char_length("app"."checkout_delivery_destinations"."recipient_name") between 1 and 100),
	CONSTRAINT "checkout_delivery_destinations_recipient_phone_nonempty_check" CHECK (length(trim("app"."checkout_delivery_destinations"."recipient_phone")) > 0),
	CONSTRAINT "checkout_delivery_destinations_address_line_1_length_check" CHECK (char_length("app"."checkout_delivery_destinations"."address_line_1") between 1 and 200),
	CONSTRAINT "checkout_delivery_destinations_address_line_2_length_check" CHECK ("app"."checkout_delivery_destinations"."address_line_2" is null or char_length("app"."checkout_delivery_destinations"."address_line_2") between 1 and 200),
	CONSTRAINT "checkout_delivery_destinations_landmark_length_check" CHECK ("app"."checkout_delivery_destinations"."landmark" is null or char_length("app"."checkout_delivery_destinations"."landmark") between 1 and 150),
	CONSTRAINT "checkout_delivery_destinations_locality_length_check" CHECK ("app"."checkout_delivery_destinations"."locality" is null or char_length("app"."checkout_delivery_destinations"."locality") between 1 and 120),
	CONSTRAINT "checkout_delivery_destinations_city_length_check" CHECK (char_length("app"."checkout_delivery_destinations"."city") between 1 and 100),
	CONSTRAINT "checkout_delivery_destinations_state_code_nonempty_check" CHECK (length(trim("app"."checkout_delivery_destinations"."state_code")) > 0),
	CONSTRAINT "checkout_delivery_destinations_postal_code_check" CHECK ("app"."checkout_delivery_destinations"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "checkout_delivery_destinations_label_length_check" CHECK ("app"."checkout_delivery_destinations"."label" is null or char_length("app"."checkout_delivery_destinations"."label") between 1 and 50),
	CONSTRAINT "checkout_delivery_destinations_coordinates_pair_check" CHECK (("app"."checkout_delivery_destinations"."latitude" is null) = ("app"."checkout_delivery_destinations"."longitude" is null)),
	CONSTRAINT "checkout_delivery_destinations_latitude_range_check" CHECK ("app"."checkout_delivery_destinations"."latitude" is null or ("app"."checkout_delivery_destinations"."latitude" >= -90 and "app"."checkout_delivery_destinations"."latitude" <= 90)),
	CONSTRAINT "checkout_delivery_destinations_longitude_range_check" CHECK ("app"."checkout_delivery_destinations"."longitude" is null or ("app"."checkout_delivery_destinations"."longitude" >= -180 and "app"."checkout_delivery_destinations"."longitude" <= 180)),
	CONSTRAINT "checkout_delivery_destinations_updated_at_after_created_at_check" CHECK ("app"."checkout_delivery_destinations"."updated_at" >= "app"."checkout_delivery_destinations"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_charges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"charge_definition_id" uuid NOT NULL,
	"charge_code" text NOT NULL,
	"calculation_mode" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "checkout_snapshot_charges_code_check" CHECK ("app"."checkout_snapshot_charges"."charge_code" in ('packaging', 'delivery')),
	CONSTRAINT "checkout_snapshot_charges_calculation_mode_check" CHECK ("app"."checkout_snapshot_charges"."calculation_mode" in ('fixed_per_order', 'per_item_quantity')),
	CONSTRAINT "checkout_snapshot_charges_amount_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_charges"."amount_paise" >= 0),
	CONSTRAINT "checkout_snapshot_charges_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_charges"."name")) > 0),
	CONSTRAINT "checkout_snapshot_charges_sort_order_nonnegative_check" CHECK ("app"."checkout_snapshot_charges"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_line_bundle_modifier_selections" (
	"snapshot_line_bundle_selection_id" uuid NOT NULL,
	"variant_modifier_group_id" uuid NOT NULL,
	"modifier_group_option_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"group_name" text NOT NULL,
	"option_name" text NOT NULL,
	"unit_delta_paise" bigint NOT NULL,
	CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_pk" PRIMARY KEY("snapshot_line_bundle_selection_id","variant_modifier_group_id","modifier_group_option_id"),
	CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_quantity_positive_check" CHECK ("app"."checkout_snapshot_line_bundle_modifier_selections"."quantity" > 0),
	CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_group_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_bundle_modifier_selections"."group_name")) > 0),
	CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_option_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_bundle_modifier_selections"."option_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_line_bundle_selections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"snapshot_line_id" uuid NOT NULL,
	"bundle_group_option_id" uuid NOT NULL,
	"selected_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"group_name" text NOT NULL,
	"option_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"unit_delta_paise" bigint NOT NULL,
	CONSTRAINT "checkout_snapshot_line_bundle_selections_quantity_positive_check" CHECK ("app"."checkout_snapshot_line_bundle_selections"."quantity" > 0),
	CONSTRAINT "checkout_snapshot_line_bundle_selections_group_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_bundle_selections"."group_name")) > 0),
	CONSTRAINT "checkout_snapshot_line_bundle_selections_option_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_bundle_selections"."option_name")) > 0),
	CONSTRAINT "checkout_snapshot_line_bundle_selections_variant_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_bundle_selections"."variant_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_line_modifier_selections" (
	"snapshot_line_id" uuid NOT NULL,
	"variant_modifier_group_id" uuid NOT NULL,
	"modifier_group_option_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"group_name" text NOT NULL,
	"option_name" text NOT NULL,
	"unit_delta_paise" bigint NOT NULL,
	CONSTRAINT "checkout_snapshot_line_modifier_selections_pk" PRIMARY KEY("snapshot_line_id","variant_modifier_group_id","modifier_group_option_id"),
	CONSTRAINT "checkout_snapshot_line_modifier_selections_quantity_positive_check" CHECK ("app"."checkout_snapshot_line_modifier_selections"."quantity" > 0),
	CONSTRAINT "checkout_snapshot_line_modifier_selections_group_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_modifier_selections"."group_name")) > 0),
	CONSTRAINT "checkout_snapshot_line_modifier_selections_option_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_line_modifier_selections"."option_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"source_cart_line_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"line_base_paise" bigint NOT NULL,
	"line_modifier_adjustments_paise" bigint NOT NULL,
	"line_bundle_adjustments_paise" bigint NOT NULL,
	"line_subtotal_paise" bigint NOT NULL,
	"line_promotion_discount_paise" bigint NOT NULL,
	"line_taxable_paise" bigint NOT NULL,
	"line_tax_paise" bigint NOT NULL,
	"line_total_paise" bigint NOT NULL,
	"sequence" integer NOT NULL,
	CONSTRAINT "checkout_snapshot_lines_quantity_positive_check" CHECK ("app"."checkout_snapshot_lines"."quantity" > 0),
	CONSTRAINT "checkout_snapshot_lines_sequence_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."sequence" >= 0),
	CONSTRAINT "checkout_snapshot_lines_product_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_lines"."product_name")) > 0),
	CONSTRAINT "checkout_snapshot_lines_variant_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_lines"."variant_name")) > 0),
	CONSTRAINT "checkout_snapshot_lines_line_base_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_base_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_modifier_adjustments_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_modifier_adjustments_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_bundle_adjustments_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_bundle_adjustments_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_subtotal_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_subtotal_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_promotion_discount_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_promotion_discount_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_taxable_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_taxable_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_tax_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_tax_paise" >= 0),
	CONSTRAINT "checkout_snapshot_lines_line_total_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_lines"."line_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_promotion_effects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"effect_kind" text NOT NULL,
	"promotion_id" uuid NOT NULL,
	"coupon_id" uuid,
	"promotion_code" text NOT NULL,
	"display_name" text NOT NULL,
	"trigger_type" text,
	"stacking_policy" text,
	"component_id" text,
	"line_id" uuid,
	"amount_paise" bigint,
	"realized_discount_paise" bigint,
	"reward_variant_id" uuid,
	"reward_unit_id" text,
	"reward_quantity" integer,
	"reward_base_paise" bigint,
	"sort_order" integer NOT NULL,
	CONSTRAINT "checkout_snapshot_promotion_effects_kind_check" CHECK ("app"."checkout_snapshot_promotion_effects"."effect_kind" in (
        'monetary_allocation',
        'applied_promotion',
        'bogo_reward'
      )),
	CONSTRAINT "checkout_snapshot_promotion_effects_promotion_code_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_promotion_effects"."promotion_code")) > 0),
	CONSTRAINT "checkout_snapshot_promotion_effects_display_name_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_promotion_effects"."display_name")) > 0),
	CONSTRAINT "checkout_snapshot_promotion_effects_sort_order_nonnegative_check" CHECK ("app"."checkout_snapshot_promotion_effects"."sort_order" >= 0),
	CONSTRAINT "checkout_snapshot_promotion_effects_reward_quantity_positive_check" CHECK ("app"."checkout_snapshot_promotion_effects"."reward_quantity" is null or "app"."checkout_snapshot_promotion_effects"."reward_quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshot_tax_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"target_context" text NOT NULL,
	"tax_type" text NOT NULL,
	"rate_bps" integer NOT NULL,
	"taxable_amount_paise" bigint NOT NULL,
	"tax_amount_paise" bigint NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "checkout_snapshot_tax_components_target_context_nonempty_check" CHECK (length(trim("app"."checkout_snapshot_tax_components"."target_context")) > 0),
	CONSTRAINT "checkout_snapshot_tax_components_tax_type_check" CHECK ("app"."checkout_snapshot_tax_components"."tax_type" in ('cgst', 'sgst', 'utgst', 'igst')),
	CONSTRAINT "checkout_snapshot_tax_components_rate_bps_nonnegative_check" CHECK ("app"."checkout_snapshot_tax_components"."rate_bps" >= 0),
	CONSTRAINT "checkout_snapshot_tax_components_taxable_amount_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_tax_components"."taxable_amount_paise" >= 0),
	CONSTRAINT "checkout_snapshot_tax_components_tax_amount_paise_nonnegative_check" CHECK ("app"."checkout_snapshot_tax_components"."tax_amount_paise" >= 0),
	CONSTRAINT "checkout_snapshot_tax_components_sort_order_nonnegative_check" CHECK ("app"."checkout_snapshot_tax_components"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"checkout_id" uuid NOT NULL,
	"checkout_revision" bigint NOT NULL,
	"source_cart_revision" bigint NOT NULL,
	"selected_outlet_id" uuid NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"serviceability_evaluated_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"manual_coupon_code" text,
	"destination_kind" text NOT NULL,
	"source_saved_address_id" uuid,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"landmark" text,
	"locality" text,
	"city" text NOT NULL,
	"state_code" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"label" text,
	"base_paise" bigint NOT NULL,
	"modifier_adjustments_paise" bigint NOT NULL,
	"bundle_adjustments_paise" bigint NOT NULL,
	"charges_paise" bigint NOT NULL,
	"pre_promotion_subtotal_paise" bigint NOT NULL,
	"promotion_discount_paise" bigint NOT NULL,
	"taxable_paise" bigint NOT NULL,
	"tax_paise" bigint NOT NULL,
	"grand_total_paise" bigint NOT NULL,
	"tax_inclusion_mode" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "checkout_snapshots_checkout_revision_positive_check" CHECK ("app"."checkout_snapshots"."checkout_revision" > 0),
	CONSTRAINT "checkout_snapshots_source_cart_revision_positive_check" CHECK ("app"."checkout_snapshots"."source_cart_revision" > 0),
	CONSTRAINT "checkout_snapshots_currency_check" CHECK ("app"."checkout_snapshots"."currency" = 'INR'),
	CONSTRAINT "checkout_snapshots_destination_kind_check" CHECK ("app"."checkout_snapshots"."destination_kind" in ('SAVED_ADDRESS', 'ONE_TIME_ADDRESS')),
	CONSTRAINT "checkout_snapshots_tax_inclusion_mode_check" CHECK ("app"."checkout_snapshots"."tax_inclusion_mode" in ('exclusive', 'inclusive')),
	CONSTRAINT "checkout_snapshots_manual_coupon_code_nonempty_check" CHECK ("app"."checkout_snapshots"."manual_coupon_code" is null or length(trim("app"."checkout_snapshots"."manual_coupon_code")) > 0),
	CONSTRAINT "checkout_snapshots_recipient_name_length_check" CHECK (char_length("app"."checkout_snapshots"."recipient_name") between 1 and 100),
	CONSTRAINT "checkout_snapshots_recipient_phone_nonempty_check" CHECK (length(trim("app"."checkout_snapshots"."recipient_phone")) > 0),
	CONSTRAINT "checkout_snapshots_address_line_1_length_check" CHECK (char_length("app"."checkout_snapshots"."address_line_1") between 1 and 200),
	CONSTRAINT "checkout_snapshots_address_line_2_length_check" CHECK ("app"."checkout_snapshots"."address_line_2" is null or char_length("app"."checkout_snapshots"."address_line_2") between 1 and 200),
	CONSTRAINT "checkout_snapshots_landmark_length_check" CHECK ("app"."checkout_snapshots"."landmark" is null or char_length("app"."checkout_snapshots"."landmark") between 1 and 150),
	CONSTRAINT "checkout_snapshots_locality_length_check" CHECK ("app"."checkout_snapshots"."locality" is null or char_length("app"."checkout_snapshots"."locality") between 1 and 120),
	CONSTRAINT "checkout_snapshots_city_length_check" CHECK (char_length("app"."checkout_snapshots"."city") between 1 and 100),
	CONSTRAINT "checkout_snapshots_state_code_nonempty_check" CHECK (length(trim("app"."checkout_snapshots"."state_code")) > 0),
	CONSTRAINT "checkout_snapshots_postal_code_check" CHECK ("app"."checkout_snapshots"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "checkout_snapshots_label_length_check" CHECK ("app"."checkout_snapshots"."label" is null or char_length("app"."checkout_snapshots"."label") between 1 and 50),
	CONSTRAINT "checkout_snapshots_coordinates_pair_check" CHECK (("app"."checkout_snapshots"."latitude" is null) = ("app"."checkout_snapshots"."longitude" is null)),
	CONSTRAINT "checkout_snapshots_latitude_range_check" CHECK ("app"."checkout_snapshots"."latitude" is null or ("app"."checkout_snapshots"."latitude" >= -90 and "app"."checkout_snapshots"."latitude" <= 90)),
	CONSTRAINT "checkout_snapshots_longitude_range_check" CHECK ("app"."checkout_snapshots"."longitude" is null or ("app"."checkout_snapshots"."longitude" >= -180 and "app"."checkout_snapshots"."longitude" <= 180)),
	CONSTRAINT "checkout_snapshots_base_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."base_paise" >= 0),
	CONSTRAINT "checkout_snapshots_modifier_adjustments_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."modifier_adjustments_paise" >= 0),
	CONSTRAINT "checkout_snapshots_bundle_adjustments_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."bundle_adjustments_paise" >= 0),
	CONSTRAINT "checkout_snapshots_charges_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."charges_paise" >= 0),
	CONSTRAINT "checkout_snapshots_pre_promotion_subtotal_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."pre_promotion_subtotal_paise" >= 0),
	CONSTRAINT "checkout_snapshots_promotion_discount_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."promotion_discount_paise" >= 0),
	CONSTRAINT "checkout_snapshots_taxable_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."taxable_paise" >= 0),
	CONSTRAINT "checkout_snapshots_tax_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."tax_paise" >= 0),
	CONSTRAINT "checkout_snapshots_grand_total_paise_nonnegative_check" CHECK ("app"."checkout_snapshots"."grand_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."checkouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_auth_user_id" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"source_cart_revision" bigint NOT NULL,
	"revision" bigint NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"active_snapshot_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "checkouts_revision_positive_check" CHECK ("app"."checkouts"."revision" > 0),
	CONSTRAINT "checkouts_source_cart_revision_positive_check" CHECK ("app"."checkouts"."source_cart_revision" > 0),
	CONSTRAINT "checkouts_status_check" CHECK ("app"."checkouts"."status" in (
        'DRAFT',
        'READY_FOR_PAYMENT',
        'PAYMENT_PENDING',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED'
      )),
	CONSTRAINT "checkouts_status_snapshot_null_check" CHECK ((
        (
          "app"."checkouts"."status" in ('DRAFT', 'CANCELLED', 'EXPIRED')
          and "app"."checkouts"."active_snapshot_id" is null
        )
        or
        (
          "app"."checkouts"."status" in ('READY_FOR_PAYMENT', 'PAYMENT_PENDING', 'COMPLETED')
          and "app"."checkouts"."active_snapshot_id" is not null
        )
      )),
	CONSTRAINT "checkouts_updated_at_after_created_at_check" CHECK ("app"."checkouts"."updated_at" >= "app"."checkouts"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."checkout_delivery_destinations" ADD CONSTRAINT "checkout_delivery_destinations_checkout_fk" FOREIGN KEY ("checkout_id") REFERENCES "app"."checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_delivery_destinations" ADD CONSTRAINT "checkout_delivery_destinations_source_address_fk" FOREIGN KEY ("source_saved_address_id") REFERENCES "app"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_charges" ADD CONSTRAINT "checkout_snapshot_charges_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "app"."checkout_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_charges" ADD CONSTRAINT "checkout_snapshot_charges_definition_fk" FOREIGN KEY ("charge_definition_id") REFERENCES "app"."charge_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_bundle_sel_fk" FOREIGN KEY ("snapshot_line_bundle_selection_id") REFERENCES "app"."checkout_snapshot_line_bundle_selections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_vmg_fk" FOREIGN KEY ("variant_modifier_group_id") REFERENCES "app"."catalog_variant_modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_modifier_selections_mgo_fk" FOREIGN KEY ("modifier_group_option_id") REFERENCES "app"."catalog_modifier_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_selections_line_fk" FOREIGN KEY ("snapshot_line_id") REFERENCES "app"."checkout_snapshot_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_selections_bgo_fk" FOREIGN KEY ("bundle_group_option_id") REFERENCES "app"."catalog_bundle_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_bundle_selections" ADD CONSTRAINT "checkout_snapshot_line_bundle_selections_variant_fk" FOREIGN KEY ("selected_variant_id") REFERENCES "app"."catalog_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_modifier_selections_line_fk" FOREIGN KEY ("snapshot_line_id") REFERENCES "app"."checkout_snapshot_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_modifier_selections_vmg_fk" FOREIGN KEY ("variant_modifier_group_id") REFERENCES "app"."catalog_variant_modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_line_modifier_selections" ADD CONSTRAINT "checkout_snapshot_line_modifier_selections_mgo_fk" FOREIGN KEY ("modifier_group_option_id") REFERENCES "app"."catalog_modifier_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_lines" ADD CONSTRAINT "checkout_snapshot_lines_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "app"."checkout_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_lines" ADD CONSTRAINT "checkout_snapshot_lines_product_fk" FOREIGN KEY ("product_id") REFERENCES "app"."catalog_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_lines" ADD CONSTRAINT "checkout_snapshot_lines_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "app"."catalog_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_promotion_effects" ADD CONSTRAINT "checkout_snapshot_promotion_effects_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "app"."checkout_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshot_tax_components" ADD CONSTRAINT "checkout_snapshot_tax_components_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "app"."checkout_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_checkout_fk" FOREIGN KEY ("checkout_id") REFERENCES "app"."checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_outlet_fk" FOREIGN KEY ("selected_outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_snapshots_id_checkout_id_uidx" ON "app"."checkout_snapshots" USING btree ("id","checkout_id");--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_active_snapshot_ownership_fk" FOREIGN KEY ("active_snapshot_id","id") REFERENCES "app"."checkout_snapshots"("id","checkout_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_customer_auth_user_fk" FOREIGN KEY ("customer_auth_user_id") REFERENCES "app"."customer_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "app"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_snapshot_charges_snapshot_id_idx" ON "app"."checkout_snapshot_charges" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "checkout_snapshot_line_bundle_selections_line_id_idx" ON "app"."checkout_snapshot_line_bundle_selections" USING btree ("snapshot_line_id");--> statement-breakpoint
CREATE INDEX "checkout_snapshot_lines_snapshot_id_idx" ON "app"."checkout_snapshot_lines" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "checkout_snapshot_promotion_effects_snapshot_id_idx" ON "app"."checkout_snapshot_promotion_effects" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "checkout_snapshot_tax_components_snapshot_id_idx" ON "app"."checkout_snapshot_tax_components" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_snapshots_checkout_revision_uidx" ON "app"."checkout_snapshots" USING btree ("checkout_id","checkout_revision");--> statement-breakpoint
CREATE INDEX "checkout_snapshots_checkout_id_idx" ON "app"."checkout_snapshots" USING btree ("checkout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkouts_one_non_terminal_per_cart_uidx" ON "app"."checkouts" USING btree ("cart_id") WHERE "app"."checkouts"."status" in ('DRAFT', 'READY_FOR_PAYMENT', 'PAYMENT_PENDING');--> statement-breakpoint
CREATE INDEX "checkouts_customer_auth_user_id_idx" ON "app"."checkouts" USING btree ("customer_auth_user_id");--> statement-breakpoint
CREATE INDEX "checkouts_cart_id_idx" ON "app"."checkouts" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "checkouts_expires_at_idx" ON "app"."checkouts" USING btree ("expires_at");