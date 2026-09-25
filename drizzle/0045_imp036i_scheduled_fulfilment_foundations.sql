CREATE TABLE "app"."brand_scheduled_fulfilment_policies" (
	"brand_id" uuid PRIMARY KEY NOT NULL,
	"pickup_cancellation_cutoff_minutes" integer DEFAULT 30 NOT NULL,
	"delivery_cancellation_cutoff_minutes" integer DEFAULT 60 NOT NULL,
	"revision" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_scheduled_fulfilment_policies_pickup_cutoff_check" CHECK ("app"."brand_scheduled_fulfilment_policies"."pickup_cancellation_cutoff_minutes" between 0 and 240),
	CONSTRAINT "brand_scheduled_fulfilment_policies_delivery_cutoff_check" CHECK ("app"."brand_scheduled_fulfilment_policies"."delivery_cancellation_cutoff_minutes" between 0 and 240),
	CONSTRAINT "brand_scheduled_fulfilment_policies_revision_positive_check" CHECK ("app"."brand_scheduled_fulfilment_policies"."revision" > 0),
	CONSTRAINT "brand_scheduled_fulfilment_policies_updated_at_check" CHECK ("app"."brand_scheduled_fulfilment_policies"."updated_at" >= "app"."brand_scheduled_fulfilment_policies"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_operating_date_exceptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outlet_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"exception_kind" text NOT NULL,
	"note" text,
	"revision" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_operating_date_exceptions_kind_check" CHECK ("app"."outlet_operating_date_exceptions"."exception_kind" = 'CLOSED_FULL_DAY'),
	CONSTRAINT "outlet_operating_date_exceptions_revision_positive_check" CHECK ("app"."outlet_operating_date_exceptions"."revision" > 0),
	CONSTRAINT "outlet_operating_date_exceptions_updated_at_check" CHECK ("app"."outlet_operating_date_exceptions"."updated_at" >= "app"."outlet_operating_date_exceptions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_scheduling_profiles" (
	"outlet_id" uuid PRIMARY KEY NOT NULL,
	"pickup_min_lead_minutes" integer NOT NULL,
	"delivery_min_lead_minutes" integer NOT NULL,
	"revision" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlet_scheduling_profiles_pickup_lead_check" CHECK ("app"."outlet_scheduling_profiles"."pickup_min_lead_minutes" > 0),
	CONSTRAINT "outlet_scheduling_profiles_delivery_lead_check" CHECK ("app"."outlet_scheduling_profiles"."delivery_min_lead_minutes" > 0),
	CONSTRAINT "outlet_scheduling_profiles_revision_positive_check" CHECK ("app"."outlet_scheduling_profiles"."revision" > 0),
	CONSTRAINT "outlet_scheduling_profiles_updated_at_check" CHECK ("app"."outlet_scheduling_profiles"."updated_at" >= "app"."outlet_scheduling_profiles"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "fulfilment_timing" text DEFAULT 'ASAP' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "scheduled_window_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "scheduled_window_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "scheduled_timezone" text;--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD COLUMN "scheduled_cancellation_cutoff_minutes" integer;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD COLUMN "fulfilment_timing" text DEFAULT 'ASAP' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD COLUMN "scheduled_window_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD COLUMN "scheduled_window_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."brand_scheduled_fulfilment_policies" ADD CONSTRAINT "brand_scheduled_fulfilment_policies_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_operating_date_exceptions" ADD CONSTRAINT "outlet_operating_date_exceptions_outlet_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_scheduling_profiles" ADD CONSTRAINT "outlet_scheduling_profiles_outlet_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_operating_date_exceptions_outlet_date_uidx" ON "app"."outlet_operating_date_exceptions" USING btree ("outlet_id","local_date");--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_fulfilment_timing_check" CHECK ("app"."checkout_snapshots"."fulfilment_timing" in ('ASAP', 'SCHEDULED'));--> statement-breakpoint
ALTER TABLE "app"."checkout_snapshots" ADD CONSTRAINT "checkout_snapshots_scheduled_timing_shape_check" CHECK ((
        (
          "app"."checkout_snapshots"."fulfilment_timing" = 'ASAP'
          and "app"."checkout_snapshots"."scheduled_window_start_at" is null
          and "app"."checkout_snapshots"."scheduled_window_end_at" is null
          and "app"."checkout_snapshots"."scheduled_timezone" is null
          and "app"."checkout_snapshots"."scheduled_cancellation_cutoff_minutes" is null
        )
        or
        (
          "app"."checkout_snapshots"."fulfilment_timing" = 'SCHEDULED'
          and "app"."checkout_snapshots"."scheduled_window_start_at" is not null
          and "app"."checkout_snapshots"."scheduled_window_end_at" is not null
          and "app"."checkout_snapshots"."scheduled_window_start_at" < "app"."checkout_snapshots"."scheduled_window_end_at"
          and "app"."checkout_snapshots"."scheduled_timezone" is not null
          and length(trim("app"."checkout_snapshots"."scheduled_timezone")) > 0
          and "app"."checkout_snapshots"."scheduled_cancellation_cutoff_minutes" is not null
          and "app"."checkout_snapshots"."scheduled_cancellation_cutoff_minutes" between 0 and 240
        )
      ));--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_fulfilment_timing_check" CHECK ("app"."checkouts"."fulfilment_timing" in ('ASAP', 'SCHEDULED'));--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_scheduled_window_shape_check" CHECK ((
        (
          "app"."checkouts"."fulfilment_timing" = 'ASAP'
          and "app"."checkouts"."scheduled_window_start_at" is null
          and "app"."checkouts"."scheduled_window_end_at" is null
        )
        or
        (
          "app"."checkouts"."fulfilment_timing" = 'SCHEDULED'
          and (
            (
              "app"."checkouts"."scheduled_window_start_at" is null
              and "app"."checkouts"."scheduled_window_end_at" is null
            )
            or
            (
              "app"."checkouts"."scheduled_window_start_at" is not null
              and "app"."checkouts"."scheduled_window_end_at" is not null
              and "app"."checkouts"."scheduled_window_start_at" < "app"."checkouts"."scheduled_window_end_at"
            )
          )
        )
      ));--> statement-breakpoint
ALTER TABLE "app"."checkouts" ADD CONSTRAINT "checkouts_scheduled_ready_window_check" CHECK ((
        "app"."checkouts"."status" not in ('READY_FOR_PAYMENT', 'PAYMENT_PENDING', 'COMPLETED')
        or "app"."checkouts"."fulfilment_timing" <> 'SCHEDULED'
        or (
          "app"."checkouts"."scheduled_window_start_at" is not null
          and "app"."checkouts"."scheduled_window_end_at" is not null
          and "app"."checkouts"."scheduled_window_start_at" < "app"."checkouts"."scheduled_window_end_at"
        )
      ));