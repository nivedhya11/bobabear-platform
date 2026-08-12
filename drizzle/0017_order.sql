CREATE TABLE "app"."orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"checkout_snapshot_id" uuid NOT NULL,
	"payment_provenance_kind" text NOT NULL,
	"payment_id" uuid,
	"status" text NOT NULL,
	"revision" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_workforce_user_id" text,
	"fulfilled_at" timestamp with time zone,
	"fulfilled_by_workforce_user_id" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_workforce_user_id" text,
	"cancellation_reason_code" text,
	CONSTRAINT "orders_order_number_format_check" CHECK ("app"."orders"."order_number" ~ '^ORD-[0-9A-HJKMNP-TV-Z]{12}$'),
	CONSTRAINT "orders_status_check" CHECK ("app"."orders"."status" in ('PLACED', 'ACCEPTED', 'FULFILLED', 'CANCELLED')),
	CONSTRAINT "orders_revision_positive_check" CHECK ("app"."orders"."revision" > 0),
	CONSTRAINT "orders_payment_provenance_kind_check" CHECK ("app"."orders"."payment_provenance_kind" in ('PAYMENT', 'NO_PAYMENT_REQUIRED')),
	CONSTRAINT "orders_payment_provenance_shape_check" CHECK ((
        ("app"."orders"."payment_provenance_kind" = 'PAYMENT' and "app"."orders"."payment_id" is not null)
        or
        ("app"."orders"."payment_provenance_kind" = 'NO_PAYMENT_REQUIRED' and "app"."orders"."payment_id" is null)
      )),
	CONSTRAINT "orders_cancellation_reason_check" CHECK ("app"."orders"."cancellation_reason_code" is null or "app"."orders"."cancellation_reason_code" in (
        'CUSTOMER_REQUESTED',
        'ITEM_UNAVAILABLE',
        'OUTLET_UNABLE_TO_FULFIL',
        'OPERATIONAL_DISRUPTION',
        'BUSINESS_DECISION'
      )),
	CONSTRAINT "orders_lifecycle_provenance_check" CHECK ((
        (
          "app"."orders"."status" = 'PLACED'
          and "app"."orders"."accepted_at" is null
          and "app"."orders"."accepted_by_workforce_user_id" is null
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'ACCEPTED'
          and "app"."orders"."accepted_at" is not null
          and "app"."orders"."accepted_by_workforce_user_id" is not null
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'FULFILLED'
          and "app"."orders"."accepted_at" is not null
          and "app"."orders"."accepted_by_workforce_user_id" is not null
          and "app"."orders"."fulfilled_at" is not null
          and "app"."orders"."fulfilled_by_workforce_user_id" is not null
          and "app"."orders"."cancelled_at" is null
          and "app"."orders"."cancelled_by_workforce_user_id" is null
          and "app"."orders"."cancellation_reason_code" is null
        )
        or
        (
          "app"."orders"."status" = 'CANCELLED'
          and "app"."orders"."cancelled_at" is not null
          and "app"."orders"."cancelled_by_workforce_user_id" is not null
          and "app"."orders"."cancellation_reason_code" is not null
          and "app"."orders"."fulfilled_at" is null
          and "app"."orders"."fulfilled_by_workforce_user_id" is null
          and (
            (
              "app"."orders"."accepted_at" is null
              and "app"."orders"."accepted_by_workforce_user_id" is null
            )
            or
            (
              "app"."orders"."accepted_at" is not null
              and "app"."orders"."accepted_by_workforce_user_id" is not null
            )
          )
        )
      )),
	CONSTRAINT "orders_accepted_pair_check" CHECK (("app"."orders"."accepted_at" is null) = ("app"."orders"."accepted_by_workforce_user_id" is null)),
	CONSTRAINT "orders_fulfilled_pair_check" CHECK (("app"."orders"."fulfilled_at" is null) = ("app"."orders"."fulfilled_by_workforce_user_id" is null)),
	CONSTRAINT "orders_cancelled_triple_check" CHECK ((
        ("app"."orders"."cancelled_at" is null)
        = ("app"."orders"."cancelled_by_workforce_user_id" is null)
        and ("app"."orders"."cancelled_at" is null) = ("app"."orders"."cancellation_reason_code" is null)
      )),
	CONSTRAINT "orders_updated_at_after_created_at_check" CHECK ("app"."orders"."updated_at" >= "app"."orders"."created_at"),
	CONSTRAINT "orders_accepted_at_after_created_at_check" CHECK ("app"."orders"."accepted_at" is null or "app"."orders"."accepted_at" >= "app"."orders"."created_at"),
	CONSTRAINT "orders_fulfilled_at_after_accepted_at_check" CHECK ("app"."orders"."fulfilled_at" is null or (
        "app"."orders"."accepted_at" is not null and "app"."orders"."fulfilled_at" >= "app"."orders"."accepted_at"
      )),
	CONSTRAINT "orders_cancelled_at_after_accepted_at_check" CHECK ("app"."orders"."cancelled_at" is null or "app"."orders"."accepted_at" is null or "app"."orders"."cancelled_at" >= "app"."orders"."accepted_at"),
	CONSTRAINT "orders_cancelled_at_after_created_at_check" CHECK ("app"."orders"."cancelled_at" is null or "app"."orders"."cancelled_at" >= "app"."orders"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_checkout_snapshot_ownership_fk" FOREIGN KEY ("checkout_snapshot_id","checkout_id") REFERENCES "app"."checkout_snapshots"("id","checkout_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_payment_snapshot_ownership_fk" FOREIGN KEY ("payment_id","checkout_snapshot_id") REFERENCES "app"."payments"("id","checkout_snapshot_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_accepted_by_workforce_user_fk" FOREIGN KEY ("accepted_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_fulfilled_by_workforce_user_fk" FOREIGN KEY ("fulfilled_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_cancelled_by_workforce_user_fk" FOREIGN KEY ("cancelled_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_id_uidx" ON "app"."orders" USING btree ("checkout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_snapshot_id_uidx" ON "app"."orders" USING btree ("checkout_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_id_uidx" ON "app"."orders" USING btree ("payment_id") WHERE "app"."orders"."payment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_uidx" ON "app"."orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "app"."orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_created_at_id_idx" ON "app"."orders" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "app"."orders" USING btree ("order_number");
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('order.read', 'order.read', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('order.accept', 'order.accept', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('order.fulfil', 'order.fulfil', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('order.cancel', 'order.cancel', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'order.read', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'order.accept', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'order.fulfil', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'order.cancel', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'order.read', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'order.accept', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'order.fulfil', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'order.cancel', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'order.read', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'order.accept', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'order.fulfil', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'order.cancel', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'order.read', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'order.accept', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'order.fulfil', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'order.read', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'order.fulfil', 'exact', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'order.read', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'order.cancel', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'order.read', 'descendants', timestamptz '2026-08-10T12:00:00Z');
--> statement-breakpoint
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    -- Historical Orders are never hard-deleted by app runtime.
    REVOKE DELETE ON app.orders FROM boba_bear_app;
    REVOKE TRUNCATE ON app.orders FROM boba_bear_app;
  END IF;
END
$priv$;
