INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.read', 'delivery.read', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.dispatch', 'delivery.dispatch', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.book', 'delivery.book', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.assign', 'delivery.assign', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.pickup', 'delivery.pickup', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.complete', 'delivery.complete', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.cancel', 'delivery.cancel', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.fail', 'delivery.fail', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.return', 'delivery.return', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('delivery.cost.record', 'delivery.cost.record', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.read', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.dispatch', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.book', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.assign', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.pickup', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.complete', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.cancel', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.fail', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.return', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'delivery.cost.record', 'descendants', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.read', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.dispatch', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.book', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.assign', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.pickup', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.complete', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.cancel', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.fail', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.return', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'delivery.cost.record', 'exact', timestamptz '2026-08-31T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'delivery.read', 'exact', timestamptz '2026-08-31T00:00:00Z');
