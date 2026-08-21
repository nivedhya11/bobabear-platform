CREATE TABLE "app"."cart_line_units" (
	"ordinal" bigserial PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"cart_line_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."cart_line_units" ADD CONSTRAINT "cart_line_units_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "app"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cart_line_units" ADD CONSTRAINT "cart_line_units_line_fk" FOREIGN KEY ("cart_line_id") REFERENCES "app"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_line_units_cart_line_idx" ON "app"."cart_line_units" USING btree ("cart_id","cart_line_id");
--> statement-breakpoint
-- Pre-D-371 quantities have no reconstructable per-unit add order. This
-- pre-production rollout rebuilds Cart intent rather than fabricating LIFO.
DELETE FROM "app"."cart_lines";
