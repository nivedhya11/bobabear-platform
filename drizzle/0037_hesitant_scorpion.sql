CREATE TABLE "app"."catalog_content_revisions" (
	"brand_id" uuid PRIMARY KEY NOT NULL,
	"content_revision" bigint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_content_revisions_content_revision_positive_check" CHECK ("app"."catalog_content_revisions"."content_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_group_content_revisions" (
	"modifier_group_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_modifier_group_content_revisions_pk" PRIMARY KEY("modifier_group_id","content_revision"),
	CONSTRAINT "catalog_modifier_group_content_revisions_revision_positive_check" CHECK ("app"."catalog_modifier_group_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_modifier_group_content_revisions_name_length_check" CHECK (char_length("app"."catalog_modifier_group_content_revisions"."name") between 1 and 160),
	CONSTRAINT "catalog_modifier_group_content_revisions_description_length_check" CHECK ("app"."catalog_modifier_group_content_revisions"."description" is null or char_length("app"."catalog_modifier_group_content_revisions"."description") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_group_option_content_revisions" (
	"binding_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer NOT NULL,
	"default_quantity" integer NOT NULL,
	"position" integer NOT NULL,
	"lifecycle_status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_modifier_group_option_content_revisions_pk" PRIMARY KEY("binding_id","content_revision"),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_revision_positive_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_min_quantity_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."min_quantity" >= 0),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_max_quantity_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."max_quantity" >= 1 and "app"."catalog_modifier_group_option_content_revisions"."max_quantity" <= 99),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_quantity_range_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."min_quantity" <= "app"."catalog_modifier_group_option_content_revisions"."max_quantity"),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_default_quantity_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."default_quantity" >= "app"."catalog_modifier_group_option_content_revisions"."min_quantity" and "app"."catalog_modifier_group_option_content_revisions"."default_quantity" <= "app"."catalog_modifier_group_option_content_revisions"."max_quantity"),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_position_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."position" >= 0),
	CONSTRAINT "catalog_modifier_group_option_content_revisions_lifecycle_status_check" CHECK ("app"."catalog_modifier_group_option_content_revisions"."lifecycle_status" in ('draft', 'active', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_modifier_option_content_revisions" (
	"modifier_option_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_modifier_option_content_revisions_pk" PRIMARY KEY("modifier_option_id","content_revision"),
	CONSTRAINT "catalog_modifier_option_content_revisions_revision_positive_check" CHECK ("app"."catalog_modifier_option_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_modifier_option_content_revisions_name_length_check" CHECK (char_length("app"."catalog_modifier_option_content_revisions"."name") between 1 and 160),
	CONSTRAINT "catalog_modifier_option_content_revisions_description_length_check" CHECK ("app"."catalog_modifier_option_content_revisions"."description" is null or char_length("app"."catalog_modifier_option_content_revisions"."description") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_mutation_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"action" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"previous_content_revision" bigint,
	"new_content_revision" bigint,
	"previous_envelope_revision" bigint,
	"new_envelope_revision" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "catalog_mutation_audit_events_action_nonempty_check" CHECK (length(trim("app"."catalog_mutation_audit_events"."action")) > 0),
	CONSTRAINT "catalog_mutation_audit_events_target_type_nonempty_check" CHECK (length(trim("app"."catalog_mutation_audit_events"."target_type")) > 0),
	CONSTRAINT "catalog_mutation_audit_events_previous_content_revision_positive_check" CHECK ("app"."catalog_mutation_audit_events"."previous_content_revision" is null or "app"."catalog_mutation_audit_events"."previous_content_revision" > 0),
	CONSTRAINT "catalog_mutation_audit_events_new_content_revision_positive_check" CHECK ("app"."catalog_mutation_audit_events"."new_content_revision" is null or "app"."catalog_mutation_audit_events"."new_content_revision" > 0),
	CONSTRAINT "catalog_mutation_audit_events_previous_envelope_revision_positive_check" CHECK ("app"."catalog_mutation_audit_events"."previous_envelope_revision" is null or "app"."catalog_mutation_audit_events"."previous_envelope_revision" > 0),
	CONSTRAINT "catalog_mutation_audit_events_new_envelope_revision_positive_check" CHECK ("app"."catalog_mutation_audit_events"."new_envelope_revision" is null or "app"."catalog_mutation_audit_events"."new_envelope_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_product_content_revisions" (
	"product_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_content_revisions_pk" PRIMARY KEY("product_id","content_revision"),
	CONSTRAINT "catalog_product_content_revisions_revision_positive_check" CHECK ("app"."catalog_product_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_product_content_revisions_name_length_check" CHECK (char_length("app"."catalog_product_content_revisions"."name") between 1 and 160),
	CONSTRAINT "catalog_product_content_revisions_description_length_check" CHECK ("app"."catalog_product_content_revisions"."description" is null or char_length("app"."catalog_product_content_revisions"."description") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_variant_content_revisions" (
	"variant_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean NOT NULL,
	"is_selector_visible" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_variant_content_revisions_pk" PRIMARY KEY("variant_id","content_revision"),
	CONSTRAINT "catalog_variant_content_revisions_revision_positive_check" CHECK ("app"."catalog_variant_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_variant_content_revisions_name_length_check" CHECK (char_length("app"."catalog_variant_content_revisions"."name") between 1 and 120),
	CONSTRAINT "catalog_variant_content_revisions_description_length_check" CHECK ("app"."catalog_variant_content_revisions"."description" is null or char_length("app"."catalog_variant_content_revisions"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "app"."catalog_variant_modifier_group_content_revisions" (
	"binding_id" uuid NOT NULL,
	"content_revision" bigint NOT NULL,
	"brand_id" uuid NOT NULL,
	"min_total_quantity" integer NOT NULL,
	"max_total_quantity" integer NOT NULL,
	"position" integer NOT NULL,
	"lifecycle_status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_pk" PRIMARY KEY("binding_id","content_revision"),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_revision_positive_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."content_revision" > 0),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_min_total_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."min_total_quantity" >= 0),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_max_total_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."max_total_quantity" >= 1 and "app"."catalog_variant_modifier_group_content_revisions"."max_total_quantity" <= 99),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_total_range_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."min_total_quantity" <= "app"."catalog_variant_modifier_group_content_revisions"."max_total_quantity"),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_position_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."position" >= 0),
	CONSTRAINT "catalog_variant_modifier_group_content_revisions_lifecycle_status_check" CHECK ("app"."catalog_variant_modifier_group_content_revisions"."lifecycle_status" in ('draft', 'active', 'retired'))
);
--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_groups" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_groups" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_options" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_options" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."catalog_products" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_products" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD COLUMN "effective_content_revision" bigint;--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD COLUMN "draft_content_revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
-- IMP-036F backfill: brand envelopes for brands that own catalog products
INSERT INTO "app"."catalog_content_revisions" ("brand_id", "content_revision", "updated_at")
SELECT DISTINCT p."brand_id", 1, NOW()
FROM "app"."catalog_products" p
ON CONFLICT ("brand_id") DO NOTHING;--> statement-breakpoint
-- Content revision 1 from current primary rows
INSERT INTO "app"."catalog_product_content_revisions" (
  "product_id", "content_revision", "brand_id", "name", "description", "created_at"
)
SELECT p."id", 1, p."brand_id", p."name", p."description", COALESCE(p."activated_at", p."created_at")
FROM "app"."catalog_products" p
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "app"."catalog_variant_content_revisions" (
  "variant_id", "content_revision", "brand_id", "name", "description",
  "is_default", "is_selector_visible", "created_at"
)
SELECT v."id", 1, v."brand_id", v."name", v."description",
  v."is_default", v."is_selector_visible", COALESCE(v."activated_at", v."created_at")
FROM "app"."catalog_variants" v
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "app"."catalog_modifier_group_content_revisions" (
  "modifier_group_id", "content_revision", "brand_id", "name", "description", "created_at"
)
SELECT g."id", 1, g."brand_id", g."name", g."description", COALESCE(g."activated_at", g."created_at")
FROM "app"."catalog_modifier_groups" g
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "app"."catalog_modifier_option_content_revisions" (
  "modifier_option_id", "content_revision", "brand_id", "name", "description", "created_at"
)
SELECT o."id", 1, o."brand_id", o."name", o."description", COALESCE(o."activated_at", o."created_at")
FROM "app"."catalog_modifier_options" o
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "app"."catalog_modifier_group_option_content_revisions" (
  "binding_id", "content_revision", "brand_id",
  "min_quantity", "max_quantity", "default_quantity", "position", "lifecycle_status", "created_at"
)
SELECT b."id", 1, b."brand_id",
  b."min_quantity", b."max_quantity", b."default_quantity", b."position", b."lifecycle_status",
  COALESCE(b."activated_at", b."created_at")
FROM "app"."catalog_modifier_group_options" b
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "app"."catalog_variant_modifier_group_content_revisions" (
  "binding_id", "content_revision", "brand_id",
  "min_total_quantity", "max_total_quantity", "position", "lifecycle_status", "created_at"
)
SELECT b."id", 1, b."brand_id",
  b."min_total_quantity", b."max_total_quantity", b."position", b."lifecycle_status",
  COALESCE(b."activated_at", b."created_at")
FROM "app"."catalog_variant_modifier_groups" b
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Historical effective pointer: set when previously activated (activated_at present)
UPDATE "app"."catalog_products"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_products"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
UPDATE "app"."catalog_variants"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_variants"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
UPDATE "app"."catalog_modifier_groups"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_modifier_groups"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
UPDATE "app"."catalog_modifier_options"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_modifier_options"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
UPDATE "app"."catalog_modifier_group_options"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_modifier_group_options"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
UPDATE "app"."catalog_variant_modifier_groups"
SET "effective_content_revision" = 1, "draft_content_revision" = 1
WHERE "activated_at" IS NOT NULL;--> statement-breakpoint
UPDATE "app"."catalog_variant_modifier_groups"
SET "draft_content_revision" = 1
WHERE "draft_content_revision" IS DISTINCT FROM 1;--> statement-breakpoint
ALTER TABLE "app"."catalog_content_revisions" ADD CONSTRAINT "catalog_content_revisions_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_content_revisions" ADD CONSTRAINT "catalog_modifier_group_content_revisions_group_brand_fk" FOREIGN KEY ("modifier_group_id","brand_id") REFERENCES "app"."catalog_modifier_groups"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_option_content_revisions" ADD CONSTRAINT "catalog_modifier_group_option_content_revisions_binding_brand_fk" FOREIGN KEY ("binding_id","brand_id") REFERENCES "app"."catalog_modifier_group_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_option_content_revisions" ADD CONSTRAINT "catalog_modifier_option_content_revisions_option_brand_fk" FOREIGN KEY ("modifier_option_id","brand_id") REFERENCES "app"."catalog_modifier_options"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_mutation_audit_events" ADD CONSTRAINT "catalog_mutation_audit_events_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_mutation_audit_events" ADD CONSTRAINT "catalog_mutation_audit_events_actor_workforce_user_fk" FOREIGN KEY ("actor_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_product_content_revisions" ADD CONSTRAINT "catalog_product_content_revisions_product_brand_fk" FOREIGN KEY ("product_id","brand_id") REFERENCES "app"."catalog_products"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_content_revisions" ADD CONSTRAINT "catalog_variant_content_revisions_variant_brand_fk" FOREIGN KEY ("variant_id","brand_id") REFERENCES "app"."catalog_variants"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_group_content_revisions" ADD CONSTRAINT "catalog_variant_modifier_group_content_revisions_binding_brand_fk" FOREIGN KEY ("binding_id","brand_id") REFERENCES "app"."catalog_variant_modifier_groups"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_mutation_audit_events_brand_occurred_idx" ON "app"."catalog_mutation_audit_events" USING btree ("brand_id","occurred_at");--> statement-breakpoint
CREATE INDEX "catalog_mutation_audit_events_target_idx" ON "app"."catalog_mutation_audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD CONSTRAINT "catalog_modifier_group_options_draft_content_revision_positive_check" CHECK ("app"."catalog_modifier_group_options"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_group_options" ADD CONSTRAINT "catalog_modifier_group_options_effective_content_revision_positive_check" CHECK ("app"."catalog_modifier_group_options"."effective_content_revision" is null or "app"."catalog_modifier_group_options"."effective_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_groups" ADD CONSTRAINT "catalog_modifier_groups_draft_content_revision_positive_check" CHECK ("app"."catalog_modifier_groups"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_groups" ADD CONSTRAINT "catalog_modifier_groups_effective_content_revision_positive_check" CHECK ("app"."catalog_modifier_groups"."effective_content_revision" is null or "app"."catalog_modifier_groups"."effective_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_options" ADD CONSTRAINT "catalog_modifier_options_draft_content_revision_positive_check" CHECK ("app"."catalog_modifier_options"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_modifier_options" ADD CONSTRAINT "catalog_modifier_options_effective_content_revision_positive_check" CHECK ("app"."catalog_modifier_options"."effective_content_revision" is null or "app"."catalog_modifier_options"."effective_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_products" ADD CONSTRAINT "catalog_products_draft_content_revision_positive_check" CHECK ("app"."catalog_products"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_products" ADD CONSTRAINT "catalog_products_effective_content_revision_positive_check" CHECK ("app"."catalog_products"."effective_content_revision" is null or "app"."catalog_products"."effective_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD CONSTRAINT "catalog_variant_modifier_groups_draft_content_revision_positive_check" CHECK ("app"."catalog_variant_modifier_groups"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_variant_modifier_groups" ADD CONSTRAINT "catalog_variant_modifier_groups_effective_content_revision_positive_check" CHECK ("app"."catalog_variant_modifier_groups"."effective_content_revision" is null or "app"."catalog_variant_modifier_groups"."effective_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD CONSTRAINT "catalog_variants_draft_content_revision_positive_check" CHECK ("app"."catalog_variants"."draft_content_revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."catalog_variants" ADD CONSTRAINT "catalog_variants_effective_content_revision_positive_check" CHECK ("app"."catalog_variants"."effective_content_revision" is null or "app"."catalog_variants"."effective_content_revision" > 0);