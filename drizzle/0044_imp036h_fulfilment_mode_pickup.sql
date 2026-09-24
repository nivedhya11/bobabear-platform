CREATE TABLE "app"."outlet_pickup_profiles" (
	"outlet_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"display_name" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"locality" text,
	"city" text NOT NULL,
	"state_code" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"instructions" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_pickup_profiles_display_name_length_check" CHECK (char_length("app"."outlet_pickup_profiles"."display_name") between 1 and 200),
	CONSTRAINT "outlet_pickup_profiles_address_line_1_length_check" CHECK (char_length("app"."outlet_pickup_profiles"."address_line_1") between 1 and 200),
	CONSTRAINT "outlet_pickup_profiles_address_line_2_length_check" CHECK ("app"."outlet_pickup_profiles"."address_line_2" is null or char_length("app"."outlet_pickup_profiles"."address_line_2") between 1 and 200),
	CONSTRAINT "outlet_pickup_profiles_locality_length_check" CHECK ("app"."outlet_pickup_profiles"."locality" is null or char_length("app"."outlet_pickup_profiles"."locality") between 1 and 120),
	CONSTRAINT "outlet_pickup_profiles_city_length_check" CHECK (char_length("app"."outlet_pickup_profiles"."city") between 1 and 100),
	CONSTRAINT "outlet_pickup_profiles_state_code_nonempty_check" CHECK (length(trim("app"."outlet_pickup_profiles"."state_code")) > 0),
	CONSTRAINT "outlet_pickup_profiles_postal_code_check" CHECK ("app"."outlet_pickup_profiles"."postal_code" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "outlet_pickup_profiles_instructions_nonempty_check" CHECK (length(trim("app"."outlet_pickup_profiles"."instructions")) > 0),
	CONSTRAINT "outlet_pickup_profiles_coordinates_pair_check" CHECK (("app"."outlet_pickup_profiles"."latitude" is null) = ("app"."outlet_pickup_profiles"."longitude" is null)),
	CONSTRAINT "outlet_pickup_profiles_latitude_range_check" CHECK ("app"."outlet_pickup_profiles"."latitude" is null or ("app"."outlet_pickup_profiles"."latitude" >= -90 and "app"."outlet_pickup_profiles"."latitude" <= 90)),
	CONSTRAINT "outlet_pickup_profiles_longitude_range_check" CHECK ("app"."outlet_pickup_profiles"."longitude" is null or ("app"."outlet_pickup_profiles"."longitude" >= -180 and "app"."outlet_pickup_profiles"."longitude" <= 180)),
	CONSTRAINT "outlet_pickup_profiles_revision_positive_check" CHECK ("app"."outlet_pickup_profiles"."revision" > 0),
	CONSTRAINT "outlet_pickup_profiles_updated_at_after_created_at_check" CHECK ("app"."outlet_pickup_profiles"."updated_at" >= "app"."outlet_pickup_profiles"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" DROP CONSTRAINT "checkout_snapshots_destination_kind_check";--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "serviceability_evaluated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "destination_kind" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "recipient_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "recipient_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "address_line_1" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "state_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ALTER COLUMN "postal_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "fulfilment_mode" text DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_display_name" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_address_line_1" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_address_line_2" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_locality" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_city" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_state_code" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_postal_code" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_instructions" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "pickup_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD COLUMN "fulfilment_mode" text DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD COLUMN "pickup_outlet_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."outlet_pickup_profiles" ADD CONSTRAINT "outlet_pickup_profiles_outlet_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_pickup_outlet_fk" FOREIGN KEY ("pickup_outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkouts_pickup_outlet_id_idx" ON "app"."checkouts" USING btree ("pickup_outlet_id");--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_fulfilment_mode_check" CHECK ("app"."checkout_snapshots"."fulfilment_mode" in ('DELIVERY', 'PICKUP'));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_display_name_length_check" CHECK ("app"."checkout_snapshots"."pickup_display_name" is null or char_length("app"."checkout_snapshots"."pickup_display_name") between 1 and 200);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_address_line_1_length_check" CHECK ("app"."checkout_snapshots"."pickup_address_line_1" is null or char_length("app"."checkout_snapshots"."pickup_address_line_1") between 1 and 200);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_address_line_2_length_check" CHECK ("app"."checkout_snapshots"."pickup_address_line_2" is null or char_length("app"."checkout_snapshots"."pickup_address_line_2") between 1 and 200);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_locality_length_check" CHECK ("app"."checkout_snapshots"."pickup_locality" is null or char_length("app"."checkout_snapshots"."pickup_locality") between 1 and 120);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_city_length_check" CHECK ("app"."checkout_snapshots"."pickup_city" is null or char_length("app"."checkout_snapshots"."pickup_city") between 1 and 100);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_state_code_nonempty_check" CHECK ("app"."checkout_snapshots"."pickup_state_code" is null or length(trim("app"."checkout_snapshots"."pickup_state_code")) > 0);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_postal_code_check" CHECK ("app"."checkout_snapshots"."pickup_postal_code" is null or "app"."checkout_snapshots"."pickup_postal_code" ~ '^[1-9][0-9]{5}$');--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_instructions_nonempty_check" CHECK ("app"."checkout_snapshots"."pickup_instructions" is null or length(trim("app"."checkout_snapshots"."pickup_instructions")) > 0);--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_coordinates_pair_check" CHECK (("app"."checkout_snapshots"."pickup_latitude" is null) = ("app"."checkout_snapshots"."pickup_longitude" is null));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_latitude_range_check" CHECK ("app"."checkout_snapshots"."pickup_latitude" is null or ("app"."checkout_snapshots"."pickup_latitude" >= -90 and "app"."checkout_snapshots"."pickup_latitude" <= 90));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_longitude_range_check" CHECK ("app"."checkout_snapshots"."pickup_longitude" is null or ("app"."checkout_snapshots"."pickup_longitude" >= -180 and "app"."checkout_snapshots"."pickup_longitude" <= 180));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_delivery_mode_shape_check" CHECK ((
        "app"."checkout_snapshots"."fulfilment_mode" <> 'DELIVERY'
        or (
          "app"."checkout_snapshots"."serviceability_evaluated_at" is not null
          and "app"."checkout_snapshots"."destination_kind" is not null
          and "app"."checkout_snapshots"."recipient_name" is not null
          and "app"."checkout_snapshots"."recipient_phone" is not null
          and "app"."checkout_snapshots"."address_line_1" is not null
          and "app"."checkout_snapshots"."city" is not null
          and "app"."checkout_snapshots"."state_code" is not null
          and "app"."checkout_snapshots"."postal_code" is not null
          and "app"."checkout_snapshots"."pickup_display_name" is null
          and "app"."checkout_snapshots"."pickup_address_line_1" is null
          and "app"."checkout_snapshots"."pickup_address_line_2" is null
          and "app"."checkout_snapshots"."pickup_locality" is null
          and "app"."checkout_snapshots"."pickup_city" is null
          and "app"."checkout_snapshots"."pickup_state_code" is null
          and "app"."checkout_snapshots"."pickup_postal_code" is null
          and "app"."checkout_snapshots"."pickup_instructions" is null
          and "app"."checkout_snapshots"."pickup_latitude" is null
          and "app"."checkout_snapshots"."pickup_longitude" is null
        )
      ));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_pickup_mode_shape_check" CHECK ((
        "app"."checkout_snapshots"."fulfilment_mode" <> 'PICKUP'
        or (
          "app"."checkout_snapshots"."serviceability_evaluated_at" is null
          and "app"."checkout_snapshots"."destination_kind" is null
          and "app"."checkout_snapshots"."source_saved_address_id" is null
          and "app"."checkout_snapshots"."recipient_name" is null
          and "app"."checkout_snapshots"."recipient_phone" is null
          and "app"."checkout_snapshots"."address_line_1" is null
          and "app"."checkout_snapshots"."address_line_2" is null
          and "app"."checkout_snapshots"."landmark" is null
          and "app"."checkout_snapshots"."locality" is null
          and "app"."checkout_snapshots"."city" is null
          and "app"."checkout_snapshots"."state_code" is null
          and "app"."checkout_snapshots"."postal_code" is null
          and "app"."checkout_snapshots"."latitude" is null
          and "app"."checkout_snapshots"."longitude" is null
          and "app"."checkout_snapshots"."label" is null
          and "app"."checkout_snapshots"."selected_outlet_id" is not null
          and "app"."checkout_snapshots"."pickup_display_name" is not null
          and "app"."checkout_snapshots"."pickup_address_line_1" is not null
          and "app"."checkout_snapshots"."pickup_city" is not null
          and "app"."checkout_snapshots"."pickup_state_code" is not null
          and "app"."checkout_snapshots"."pickup_postal_code" is not null
          and "app"."checkout_snapshots"."pickup_instructions" is not null
        )
      ));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_destination_kind_check" CHECK ("app"."checkout_snapshots"."destination_kind" is null or "app"."checkout_snapshots"."destination_kind" in ('SAVED_ADDRESS', 'ONE_TIME_ADDRESS'));--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_fulfilment_mode_check" CHECK ("app"."checkouts"."fulfilment_mode" in ('DELIVERY', 'PICKUP'));--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_fulfilment_mode_pickup_outlet_check" CHECK ((
        (
          "app"."checkouts"."fulfilment_mode" = 'DELIVERY'
          and "app"."checkouts"."pickup_outlet_id" is null
        )
        or
        (
          "app"."checkouts"."fulfilment_mode" = 'PICKUP'
        )
      ));