CREATE TABLE "app"."menu_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"display_name" text,
	"display_description" text,
	"image_path" text,
	"position" integer NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "menu_entries_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "menu_entries_display_name_length_check" CHECK ("app"."menu_entries"."display_name" is null or char_length("app"."menu_entries"."display_name") between 1 and 160),
	CONSTRAINT "menu_entries_display_description_length_check" CHECK ("app"."menu_entries"."display_description" is null or char_length("app"."menu_entries"."display_description") <= 2000),
	CONSTRAINT "menu_entries_position_nonnegative_check" CHECK ("app"."menu_entries"."position" >= 0),
	CONSTRAINT "menu_entries_image_path_local_check" CHECK ("app"."menu_entries"."image_path" is null or (
        char_length("app"."menu_entries"."image_path") between 1 and 512
        and "app"."menu_entries"."image_path" like '/%'
        and "app"."menu_entries"."image_path" not like '%..%'
        and "app"."menu_entries"."image_path" not like 'http://%'
        and "app"."menu_entries"."image_path" not like 'https://%'
        and "app"."menu_entries"."image_path" not like 'data:%'
      )),
	CONSTRAINT "menu_entries_updated_at_after_created_at_check" CHECK ("app"."menu_entries"."updated_at" >= "app"."menu_entries"."created_at"),
	CONSTRAINT "menu_entries_lifecycle_status_check" CHECK ("app"."menu_entries"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "menu_entries_draft_state_check" CHECK ("app"."menu_entries"."lifecycle_status" <> 'draft' or ("app"."menu_entries"."activated_at" is null and "app"."menu_entries"."retired_at" is null)),
	CONSTRAINT "menu_entries_active_state_check" CHECK ("app"."menu_entries"."lifecycle_status" <> 'active' or ("app"."menu_entries"."activated_at" is not null and "app"."menu_entries"."retired_at" is null)),
	CONSTRAINT "menu_entries_retired_state_check" CHECK ("app"."menu_entries"."lifecycle_status" <> 'retired' or "app"."menu_entries"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."menu_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"parent_section_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "menu_sections_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "menu_sections_id_brand_menu_key" UNIQUE("id","brand_id","menu_id"),
	CONSTRAINT "menu_sections_name_length_check" CHECK (char_length("app"."menu_sections"."name") between 1 and 160),
	CONSTRAINT "menu_sections_description_length_check" CHECK ("app"."menu_sections"."description" is null or char_length("app"."menu_sections"."description") <= 2000),
	CONSTRAINT "menu_sections_position_nonnegative_check" CHECK ("app"."menu_sections"."position" >= 0),
	CONSTRAINT "menu_sections_no_self_parent_check" CHECK ("app"."menu_sections"."parent_section_id" is null or "app"."menu_sections"."parent_section_id" <> "app"."menu_sections"."id"),
	CONSTRAINT "menu_sections_updated_at_after_created_at_check" CHECK ("app"."menu_sections"."updated_at" >= "app"."menu_sections"."created_at"),
	CONSTRAINT "menu_sections_code_format_check" CHECK ("app"."menu_sections"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."menu_sections"."code") between 1 and 64),
	CONSTRAINT "menu_sections_lifecycle_status_check" CHECK ("app"."menu_sections"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "menu_sections_draft_state_check" CHECK ("app"."menu_sections"."lifecycle_status" <> 'draft' or ("app"."menu_sections"."activated_at" is null and "app"."menu_sections"."retired_at" is null)),
	CONSTRAINT "menu_sections_active_state_check" CHECK ("app"."menu_sections"."lifecycle_status" <> 'active' or ("app"."menu_sections"."activated_at" is not null and "app"."menu_sections"."retired_at" is null)),
	CONSTRAINT "menu_sections_retired_state_check" CHECK ("app"."menu_sections"."lifecycle_status" <> 'retired' or "app"."menu_sections"."retired_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."menus" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"lifecycle_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "menus_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "menus_name_length_check" CHECK (char_length("app"."menus"."name") between 1 and 160),
	CONSTRAINT "menus_updated_at_after_created_at_check" CHECK ("app"."menus"."updated_at" >= "app"."menus"."created_at"),
	CONSTRAINT "menus_code_format_check" CHECK ("app"."menus"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."menus"."code") between 1 and 64),
	CONSTRAINT "menus_lifecycle_status_check" CHECK ("app"."menus"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "menus_draft_state_check" CHECK ("app"."menus"."lifecycle_status" <> 'draft' or ("app"."menus"."activated_at" is null and "app"."menus"."retired_at" is null)),
	CONSTRAINT "menus_active_state_check" CHECK ("app"."menus"."lifecycle_status" <> 'active' or ("app"."menus"."activated_at" is not null and "app"."menus"."retired_at" is null)),
	CONSTRAINT "menus_retired_state_check" CHECK ("app"."menus"."lifecycle_status" <> 'retired' or "app"."menus"."retired_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."menu_entries" ADD CONSTRAINT "menu_entries_menu_brand_fk" FOREIGN KEY ("menu_id","brand_id") REFERENCES "app"."menus"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_entries" ADD CONSTRAINT "menu_entries_section_brand_menu_fk" FOREIGN KEY ("section_id","brand_id","menu_id") REFERENCES "app"."menu_sections"("id","brand_id","menu_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_entries" ADD CONSTRAINT "menu_entries_product_brand_fk" FOREIGN KEY ("product_id","brand_id") REFERENCES "app"."catalog_products"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_sections" ADD CONSTRAINT "menu_sections_menu_brand_fk" FOREIGN KEY ("menu_id","brand_id") REFERENCES "app"."menus"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_sections" ADD CONSTRAINT "menu_sections_parent_brand_menu_fk" FOREIGN KEY ("parent_section_id","brand_id","menu_id") REFERENCES "app"."menu_sections"("id","brand_id","menu_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menus" ADD CONSTRAINT "menus_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_entries_section_product_nonretired_uidx" ON "app"."menu_entries" USING btree ("section_id","product_id") WHERE "app"."menu_entries"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE UNIQUE INDEX "menu_sections_menu_code_uidx" ON "app"."menu_sections" USING btree ("menu_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_brand_code_uidx" ON "app"."menus" USING btree ("brand_id","code");--> statement-breakpoint
-- IMP-013 menu permission seed (append-only; must match src/shared/access-control/catalog.ts)
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('menu.read', 'menu.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('menu.manage', 'menu.manage', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'menu.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'menu.manage', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'menu.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'menu.manage', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
-- Privilege tightening for boba_bear_app when the role exists (Compose).
-- Default privileges already grant DML; REVOKE DELETE/TRUNCATE only. No GRANT hardcoding.
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE DELETE ON
      app.menus,
      app.menu_sections,
      app.menu_entries
    FROM boba_bear_app;
    REVOKE TRUNCATE ON
      app.menus,
      app.menu_sections,
      app.menu_entries
    FROM boba_bear_app;
  END IF;
END
$priv$;
