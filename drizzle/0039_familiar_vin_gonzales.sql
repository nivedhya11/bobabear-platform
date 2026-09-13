ALTER TABLE "app"."assortment_rules" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assortment_rules" ADD CONSTRAINT "assortment_rules_revision_positive_check" CHECK ("app"."assortment_rules"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."price_books" ADD CONSTRAINT "price_books_revision_positive_check" CHECK ("app"."price_books"."revision" > 0);