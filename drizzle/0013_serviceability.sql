CREATE TABLE "app"."outlet_serviceability_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"outlet_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_revision" bigint,
	"new_revision" bigint NOT NULL,
	"previous_routing_priority" integer,
	"new_routing_priority" integer,
	"added_postal_codes" text[] NOT NULL,
	"removed_postal_codes" text[] NOT NULL,
	CONSTRAINT "outlet_serviceability_audit_events_outlet_new_revision_key" UNIQUE("outlet_id","new_revision"),
	CONSTRAINT "outlet_serviceability_audit_events_actor_kind_check" CHECK ("app"."outlet_serviceability_audit_events"."actor_kind" = 'workforce'),
	CONSTRAINT "outlet_serviceability_audit_events_actor_id_nonempty_check" CHECK (length(trim("app"."outlet_serviceability_audit_events"."actor_id")) > 0),
	CONSTRAINT "outlet_serviceability_audit_events_action_check" CHECK ("app"."outlet_serviceability_audit_events"."action" in ('serviceability_routing_priority_set', 'serviceability_pins_added', 'serviceability_pins_removed', 'serviceability_pins_replaced')),
	CONSTRAINT "outlet_serviceability_audit_events_new_revision_positive_check" CHECK ("app"."outlet_serviceability_audit_events"."new_revision" > 0),
	CONSTRAINT "outlet_serviceability_audit_events_previous_revision_positive_check" CHECK ("app"."outlet_serviceability_audit_events"."previous_revision" is null or "app"."outlet_serviceability_audit_events"."previous_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_serviceability_configs" (
	"outlet_id" uuid PRIMARY KEY NOT NULL,
	"routing_priority" integer NOT NULL,
	"revision" bigint NOT NULL,
	CONSTRAINT "outlet_serviceability_configs_routing_priority_positive_check" CHECK ("app"."outlet_serviceability_configs"."routing_priority" > 0),
	CONSTRAINT "outlet_serviceability_configs_revision_positive_check" CHECK ("app"."outlet_serviceability_configs"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."outlet_serviceability_pins" (
	"outlet_id" uuid NOT NULL,
	"postal_code" text NOT NULL,
	CONSTRAINT "outlet_serviceability_pins_pk" PRIMARY KEY("outlet_id","postal_code"),
	CONSTRAINT "outlet_serviceability_pins_postal_code_check" CHECK ("app"."outlet_serviceability_pins"."postal_code" ~ '^[1-9][0-9]{5}$')
);
--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_audit_events" ADD CONSTRAINT "outlet_serviceability_audit_events_outlet_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_configs" ADD CONSTRAINT "outlet_serviceability_configs_outlet_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlet_serviceability_pins" ADD CONSTRAINT "outlet_serviceability_pins_config_fk" FOREIGN KEY ("outlet_id") REFERENCES "app"."outlet_serviceability_configs"("outlet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outlet_serviceability_audit_events_outlet_occurred_idx" ON "app"."outlet_serviceability_audit_events" USING btree ("outlet_id","occurred_at");--> statement-breakpoint
CREATE INDEX "outlet_serviceability_audit_events_action_occurred_idx" ON "app"."outlet_serviceability_audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "outlet_serviceability_pins_postal_outlet_idx" ON "app"."outlet_serviceability_pins" USING btree ("postal_code","outlet_id");--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('serviceability.read', 'serviceability.read', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('serviceability.manage', 'serviceability.manage', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'serviceability.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'serviceability.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'serviceability.read', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'serviceability.manage', 'descendants', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'serviceability.read', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'serviceability.manage', 'exact', timestamptz '2026-08-08T12:00:00Z');
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Config rows are never hard-deleted by app runtime (no delete-config op).
    -- PIN memberships may DELETE+INSERT on remove/replace.
    -- Audit is append-only (INSERT + SELECT only).
    REVOKE DELETE ON
      app.outlet_serviceability_configs
    FROM boba_bear_app;
    REVOKE UPDATE ON
      app.outlet_serviceability_audit_events
    FROM boba_bear_app;
    REVOKE DELETE ON
      app.outlet_serviceability_audit_events
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.outlet_serviceability_configs,
      app.outlet_serviceability_pins,
      app.outlet_serviceability_audit_events
    FROM boba_bear_app;
  END IF;
END
$priv$;
