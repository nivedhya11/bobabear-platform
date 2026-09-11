CREATE TABLE "app"."menu_entry_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"menu_version_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"display_name" text,
	"display_description" text,
	"image_path" text,
	"position" integer NOT NULL,
	"lifecycle_status" text NOT NULL,
	CONSTRAINT "menu_entry_versions_version_entry_key" UNIQUE("menu_version_id","entry_id"),
	CONSTRAINT "menu_entry_versions_display_name_length_check" CHECK ("app"."menu_entry_versions"."display_name" is null or char_length("app"."menu_entry_versions"."display_name") between 1 and 160),
	CONSTRAINT "menu_entry_versions_display_description_length_check" CHECK ("app"."menu_entry_versions"."display_description" is null or char_length("app"."menu_entry_versions"."display_description") <= 2000),
	CONSTRAINT "menu_entry_versions_position_nonnegative_check" CHECK ("app"."menu_entry_versions"."position" >= 0),
	CONSTRAINT "menu_entry_versions_image_path_local_check" CHECK ("app"."menu_entry_versions"."image_path" is null or (
        char_length("app"."menu_entry_versions"."image_path") between 1 and 512
        and "app"."menu_entry_versions"."image_path" like '/%'
        and "app"."menu_entry_versions"."image_path" not like '%..%'
        and "app"."menu_entry_versions"."image_path" not like 'http://%'
        and "app"."menu_entry_versions"."image_path" not like 'https://%'
        and "app"."menu_entry_versions"."image_path" not like 'data:%'
      )),
	CONSTRAINT "menu_entry_versions_lifecycle_status_check" CHECK ("app"."menu_entry_versions"."lifecycle_status" in ('draft', 'active', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "app"."menu_mutation_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"action" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"menu_id" uuid,
	"menu_version_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"previous_menu_revision" bigint,
	"new_menu_revision" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "menu_mutation_audit_events_action_nonempty_check" CHECK (length(trim("app"."menu_mutation_audit_events"."action")) > 0),
	CONSTRAINT "menu_mutation_audit_events_target_type_nonempty_check" CHECK (length(trim("app"."menu_mutation_audit_events"."target_type")) > 0),
	CONSTRAINT "menu_mutation_audit_events_previous_menu_revision_positive_check" CHECK ("app"."menu_mutation_audit_events"."previous_menu_revision" is null or "app"."menu_mutation_audit_events"."previous_menu_revision" > 0),
	CONSTRAINT "menu_mutation_audit_events_new_menu_revision_positive_check" CHECK ("app"."menu_mutation_audit_events"."new_menu_revision" is null or "app"."menu_mutation_audit_events"."new_menu_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."menu_section_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"menu_version_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"parent_section_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"lifecycle_status" text NOT NULL,
	CONSTRAINT "menu_section_versions_version_section_key" UNIQUE("menu_version_id","section_id"),
	CONSTRAINT "menu_section_versions_name_length_check" CHECK (char_length("app"."menu_section_versions"."name") between 1 and 160),
	CONSTRAINT "menu_section_versions_description_length_check" CHECK ("app"."menu_section_versions"."description" is null or char_length("app"."menu_section_versions"."description") <= 2000),
	CONSTRAINT "menu_section_versions_position_nonnegative_check" CHECK ("app"."menu_section_versions"."position" >= 0),
	CONSTRAINT "menu_section_versions_no_self_parent_check" CHECK ("app"."menu_section_versions"."parent_section_id" is null or "app"."menu_section_versions"."parent_section_id" <> "app"."menu_section_versions"."section_id"),
	CONSTRAINT "menu_section_versions_lifecycle_status_check" CHECK ("app"."menu_section_versions"."lifecycle_status" in ('draft', 'active', 'retired')),
	CONSTRAINT "menu_section_versions_code_format_check" CHECK ("app"."menu_section_versions"."code" ~ '^[a-z0-9][a-z0-9_-]*$' and char_length("app"."menu_section_versions"."code") between 1 and 64)
);
--> statement-breakpoint
CREATE TABLE "app"."menu_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"menu_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"revision" bigint NOT NULL,
	"lifecycle_status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text,
	"effective_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "menu_versions_menu_revision_key" UNIQUE("menu_id","revision"),
	CONSTRAINT "menu_versions_id_menu_id_key" UNIQUE("id","menu_id"),
	CONSTRAINT "menu_versions_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "menu_versions_lifecycle_status_check" CHECK ("app"."menu_versions"."lifecycle_status" in ('DRAFT', 'EFFECTIVE', 'SUPERSEDED')),
	CONSTRAINT "menu_versions_revision_positive_check" CHECK ("app"."menu_versions"."revision" > 0),
	CONSTRAINT "menu_versions_draft_state_check" CHECK ("app"."menu_versions"."lifecycle_status" <> 'DRAFT' or ("app"."menu_versions"."effective_at" is null and "app"."menu_versions"."superseded_at" is null)),
	CONSTRAINT "menu_versions_effective_state_check" CHECK ("app"."menu_versions"."lifecycle_status" <> 'EFFECTIVE' or ("app"."menu_versions"."effective_at" is not null and "app"."menu_versions"."superseded_at" is null)),
	CONSTRAINT "menu_versions_superseded_state_check" CHECK ("app"."menu_versions"."lifecycle_status" <> 'SUPERSEDED' or "app"."menu_versions"."superseded_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."menus" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."menus" ADD COLUMN "effective_menu_version_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."menus" ADD COLUMN "draft_menu_version_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."menu_entry_versions" ADD CONSTRAINT "menu_entry_versions_version_menu_fk" FOREIGN KEY ("menu_version_id","menu_id") REFERENCES "app"."menu_versions"("id","menu_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_entry_versions" ADD CONSTRAINT "menu_entry_versions_menu_brand_fk" FOREIGN KEY ("menu_id","brand_id") REFERENCES "app"."menus"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_entry_versions" ADD CONSTRAINT "menu_entry_versions_product_brand_fk" FOREIGN KEY ("product_id","brand_id") REFERENCES "app"."catalog_products"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_mutation_audit_events" ADD CONSTRAINT "menu_mutation_audit_events_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_mutation_audit_events" ADD CONSTRAINT "menu_mutation_audit_events_actor_workforce_user_fk" FOREIGN KEY ("actor_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_section_versions" ADD CONSTRAINT "menu_section_versions_version_menu_fk" FOREIGN KEY ("menu_version_id","menu_id") REFERENCES "app"."menu_versions"("id","menu_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_section_versions" ADD CONSTRAINT "menu_section_versions_menu_brand_fk" FOREIGN KEY ("menu_id","brand_id") REFERENCES "app"."menus"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_versions" ADD CONSTRAINT "menu_versions_menu_brand_fk" FOREIGN KEY ("menu_id","brand_id") REFERENCES "app"."menus"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."menu_versions" ADD CONSTRAINT "menu_versions_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_entry_versions_version_section_product_nonretired_uidx" ON "app"."menu_entry_versions" USING btree ("menu_version_id","section_id","product_id") WHERE "app"."menu_entry_versions"."lifecycle_status" <> 'retired';--> statement-breakpoint
CREATE INDEX "menu_entry_versions_menu_version_idx" ON "app"."menu_entry_versions" USING btree ("menu_version_id");--> statement-breakpoint
CREATE INDEX "menu_mutation_audit_events_brand_occurred_idx" ON "app"."menu_mutation_audit_events" USING btree ("brand_id","occurred_at");--> statement-breakpoint
CREATE INDEX "menu_mutation_audit_events_menu_occurred_idx" ON "app"."menu_mutation_audit_events" USING btree ("menu_id","occurred_at");--> statement-breakpoint
CREATE INDEX "menu_mutation_audit_events_target_idx" ON "app"."menu_mutation_audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_section_versions_version_code_uidx" ON "app"."menu_section_versions" USING btree ("menu_version_id","code");--> statement-breakpoint
CREATE INDEX "menu_section_versions_menu_version_idx" ON "app"."menu_section_versions" USING btree ("menu_version_id");--> statement-breakpoint
CREATE INDEX "menu_versions_menu_lifecycle_idx" ON "app"."menu_versions" USING btree ("menu_id","lifecycle_status");--> statement-breakpoint
ALTER TABLE "app"."menus" ADD CONSTRAINT "menus_revision_positive_check" CHECK ("app"."menus"."revision" > 0);--> statement-breakpoint
-- IMP-036F F3A backfill: seed MenuVersion graphs from legacy child tables.
-- ACTIVE / historically activated → EFFECTIVE + effective pointer.
-- DRAFT (never activated) → DRAFT + draft pointer only.
-- RETIRED with activated_at → EFFECTIVE pointer retained for forensics (menu not customer-active).
-- RETIRED without activated_at → DRAFT pointer only.
-- Legacy menu_sections / menu_entries retained (no drop).

INSERT INTO "app"."menu_versions" (
  "id", "menu_id", "brand_id", "revision", "lifecycle_status",
  "created_at", "created_by", "effective_at", "superseded_at"
)
SELECT
  (md5(m."id"::text || ':menu_version:1'))::uuid,
  m."id",
  m."brand_id",
  1,
  CASE
    WHEN m."activated_at" IS NOT NULL THEN 'EFFECTIVE'
    ELSE 'DRAFT'
  END,
  COALESCE(m."activated_at", m."created_at"),
  NULL,
  CASE WHEN m."activated_at" IS NOT NULL THEN m."activated_at" ELSE NULL END,
  NULL
FROM "app"."menus" m
WHERE NOT EXISTS (
  SELECT 1 FROM "app"."menu_versions" mv WHERE mv."menu_id" = m."id"
);--> statement-breakpoint

INSERT INTO "app"."menu_section_versions" (
  "id", "menu_version_id", "section_id", "brand_id", "menu_id",
  "parent_section_id", "code", "name", "description", "position", "lifecycle_status"
)
SELECT
  (md5(mv."id"::text || ':' || s."id"::text || ':section_version'))::uuid,
  mv."id",
  s."id",
  s."brand_id",
  s."menu_id",
  s."parent_section_id",
  s."code",
  s."name",
  s."description",
  s."position",
  s."lifecycle_status"
FROM "app"."menu_sections" s
INNER JOIN "app"."menu_versions" mv
  ON mv."menu_id" = s."menu_id" AND mv."revision" = 1
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "app"."menu_entry_versions" (
  "id", "menu_version_id", "entry_id", "brand_id", "menu_id",
  "section_id", "product_id", "display_name", "display_description",
  "image_path", "position", "lifecycle_status"
)
SELECT
  (md5(mv."id"::text || ':' || e."id"::text || ':entry_version'))::uuid,
  mv."id",
  e."id",
  e."brand_id",
  e."menu_id",
  e."section_id",
  e."product_id",
  e."display_name",
  e."display_description",
  e."image_path",
  e."position",
  e."lifecycle_status"
FROM "app"."menu_entries" e
INNER JOIN "app"."menu_versions" mv
  ON mv."menu_id" = e."menu_id" AND mv."revision" = 1
ON CONFLICT DO NOTHING;--> statement-breakpoint

UPDATE "app"."menus" m
SET
  "revision" = 1,
  "effective_menu_version_id" = mv."id",
  "draft_menu_version_id" = NULL
FROM "app"."menu_versions" mv
WHERE mv."menu_id" = m."id"
  AND mv."revision" = 1
  AND mv."lifecycle_status" = 'EFFECTIVE'
  AND m."activated_at" IS NOT NULL;--> statement-breakpoint

UPDATE "app"."menus" m
SET
  "revision" = 1,
  "effective_menu_version_id" = NULL,
  "draft_menu_version_id" = mv."id"
FROM "app"."menu_versions" mv
WHERE mv."menu_id" = m."id"
  AND mv."revision" = 1
  AND mv."lifecycle_status" = 'DRAFT'
  AND m."activated_at" IS NULL;--> statement-breakpoint

ALTER TABLE "app"."menus" ADD CONSTRAINT "menus_effective_menu_version_fk"
  FOREIGN KEY ("effective_menu_version_id", "id")
  REFERENCES "app"."menu_versions"("id", "menu_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "app"."menus" ADD CONSTRAINT "menus_draft_menu_version_fk"
  FOREIGN KEY ("draft_menu_version_id", "id")
  REFERENCES "app"."menu_versions"("id", "menu_id")
  ON DELETE no action ON UPDATE no action;
