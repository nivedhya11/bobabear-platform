ALTER TABLE "app"."outlet_serviceability_configs"
  ADD COLUMN "service_origin_latitude" numeric(10, 7),
  ADD COLUMN "service_origin_longitude" numeric(10, 7),
  ADD COLUMN "max_service_distance_meters" integer;
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs"
  ADD CONSTRAINT "outlet_serviceability_configs_origin_pair_check"
  CHECK (
    ("service_origin_latitude" is null) = ("service_origin_longitude" is null)
  );
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs"
  ADD CONSTRAINT "outlet_serviceability_configs_origin_latitude_range_check"
  CHECK (
    "service_origin_latitude" is null
    or ("service_origin_latitude" >= -90 and "service_origin_latitude" <= 90)
  );
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs"
  ADD CONSTRAINT "outlet_serviceability_configs_origin_longitude_range_check"
  CHECK (
    "service_origin_longitude" is null
    or ("service_origin_longitude" >= -180 and "service_origin_longitude" <= 180)
  );
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs"
  ADD CONSTRAINT "outlet_serviceability_configs_max_distance_positive_check"
  CHECK (
    "max_service_distance_meters" is null or "max_service_distance_meters" > 0
  );
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs"
  ADD CONSTRAINT "outlet_serviceability_configs_distance_requires_origin_check"
  CHECK (
    "max_service_distance_meters" is null
    or (
      "service_origin_latitude" is not null
      and "service_origin_longitude" is not null
    )
  );
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_audit_events"
  ADD COLUMN "previous_service_origin_latitude" numeric(10, 7),
  ADD COLUMN "new_service_origin_latitude" numeric(10, 7),
  ADD COLUMN "previous_service_origin_longitude" numeric(10, 7),
  ADD COLUMN "new_service_origin_longitude" numeric(10, 7),
  ADD COLUMN "previous_max_service_distance_meters" integer,
  ADD COLUMN "new_max_service_distance_meters" integer;
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_audit_events"
  DROP CONSTRAINT "outlet_serviceability_audit_events_action_check";
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_audit_events"
  ADD CONSTRAINT "outlet_serviceability_audit_events_action_check"
  CHECK ("app"."outlet_serviceability_audit_events"."action" in (
    'serviceability_routing_priority_set',
    'serviceability_pins_added',
    'serviceability_pins_removed',
    'serviceability_pins_replaced',
    'serviceability_distance_policy_set'
  ));
