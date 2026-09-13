ALTER TABLE "app"."promotion_coupons" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."promotion_coupons" ADD CONSTRAINT "promotion_coupons_revision_positive_check" CHECK ("app"."promotion_coupons"."revision" > 0);--> statement-breakpoint
ALTER TABLE "app"."promotions" ADD CONSTRAINT "promotions_revision_positive_check" CHECK ("app"."promotions"."revision" > 0);