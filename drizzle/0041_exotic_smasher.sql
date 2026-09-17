ALTER TABLE "app"."brands" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."legal_entities" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."territories" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."brands" ADD CONSTRAINT "brands_revision_positive_check" CHECK ("app"."brands"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."legal_entities" ADD CONSTRAINT "legal_entities_revision_positive_check" CHECK ("app"."legal_entities"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD CONSTRAINT "organizations_revision_positive_check" CHECK ("app"."organizations"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD CONSTRAINT "outlets_revision_positive_check" CHECK ("app"."outlets"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."territories" ADD CONSTRAINT "territories_revision_positive_check" CHECK ("app"."territories"."revision" > 0);