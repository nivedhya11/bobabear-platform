CREATE TABLE "app"."access_control_audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_workforce_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"scope_type" text,
	"brand_id" uuid,
	"organization_id" uuid,
	"territory_id" uuid,
	"outlet_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "access_control_audit_events_action_nonempty_check" CHECK (length(trim("app"."access_control_audit_events"."action")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."access_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workforce_user_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"brand_id" uuid,
	"organization_id" uuid,
	"territory_id" uuid,
	"outlet_id" uuid,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_memberships_scope_type_check" CHECK ("app"."access_memberships"."scope_type" in ('platform', 'brand', 'organization', 'territory', 'outlet')),
	CONSTRAINT "access_memberships_status_check" CHECK ("app"."access_memberships"."status" in ('invited', 'active', 'suspended', 'revoked', 'expired')),
	CONSTRAINT "access_memberships_scope_shape_check" CHECK ((
        ("app"."access_memberships"."scope_type" = 'platform' and "app"."access_memberships"."brand_id" is null and "app"."access_memberships"."organization_id" is null and "app"."access_memberships"."territory_id" is null and "app"."access_memberships"."outlet_id" is null)
        or ("app"."access_memberships"."scope_type" = 'brand' and "app"."access_memberships"."brand_id" is not null and "app"."access_memberships"."organization_id" is null and "app"."access_memberships"."territory_id" is null and "app"."access_memberships"."outlet_id" is null)
        or ("app"."access_memberships"."scope_type" = 'organization' and "app"."access_memberships"."brand_id" is not null and "app"."access_memberships"."organization_id" is not null and "app"."access_memberships"."territory_id" is null and "app"."access_memberships"."outlet_id" is null)
        or ("app"."access_memberships"."scope_type" = 'territory' and "app"."access_memberships"."brand_id" is not null and "app"."access_memberships"."organization_id" is null and "app"."access_memberships"."territory_id" is not null and "app"."access_memberships"."outlet_id" is null)
        or ("app"."access_memberships"."scope_type" = 'outlet' and "app"."access_memberships"."brand_id" is not null and "app"."access_memberships"."organization_id" is not null and "app"."access_memberships"."territory_id" is not null and "app"."access_memberships"."outlet_id" is not null)
      )),
	CONSTRAINT "access_memberships_updated_at_after_created_at_check" CHECK ("app"."access_memberships"."updated_at" >= "app"."access_memberships"."created_at")
);
--> statement-breakpoint
CREATE TABLE "app"."access_permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_permissions_key_nonempty_check" CHECK (length(trim("app"."access_permissions"."key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."access_role_allowed_scopes" (
	"role_key" text NOT NULL,
	"scope_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_role_allowed_scopes_role_scope_key" UNIQUE("role_key","scope_type"),
	CONSTRAINT "access_role_allowed_scopes_scope_type_check" CHECK ("app"."access_role_allowed_scopes"."scope_type" in ('platform', 'brand', 'organization', 'territory', 'outlet'))
);
--> statement-breakpoint
CREATE TABLE "app"."access_role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"granted_by_workforce_user_id" text,
	"revoked_by_workforce_user_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_role_assignments_updated_at_after_created_at_check" CHECK ("app"."access_role_assignments"."updated_at" >= "app"."access_role_assignments"."created_at"),
	CONSTRAINT "access_role_assignments_expires_after_starts_check" CHECK ("app"."access_role_assignments"."expires_at" is null or "app"."access_role_assignments"."expires_at" >= "app"."access_role_assignments"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "app"."access_role_permissions" (
	"role_key" text NOT NULL,
	"permission_key" text NOT NULL,
	"inheritance_mode" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_role_permissions_pkey" UNIQUE("role_key","permission_key"),
	CONSTRAINT "access_role_permissions_inheritance_mode_check" CHECK ("app"."access_role_permissions"."inheritance_mode" in ('exact', 'descendants'))
);
--> statement-breakpoint
CREATE TABLE "app"."access_roles" (
	"key" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_roles_key_nonempty_check" CHECK (length(trim("app"."access_roles"."key")) > 0),
	CONSTRAINT "access_roles_display_name_nonempty_check" CHECK (length(trim("app"."access_roles"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."brands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "brands_status_check" CHECK ("app"."brands"."status" in ('active', 'inactive')),
	CONSTRAINT "brands_updated_at_after_created_at_check" CHECK ("app"."brands"."updated_at" >= "app"."brands"."created_at"),
	CONSTRAINT "brands_code_nonempty_check" CHECK (length(trim("app"."brands"."code")) > 0),
	CONSTRAINT "brands_name_nonempty_check" CHECK (length(trim("app"."brands"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."legal_entities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "legal_entities_id_brand_org_key" UNIQUE("id","brand_id","organization_id"),
	CONSTRAINT "legal_entities_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "legal_entities_status_check" CHECK ("app"."legal_entities"."status" in ('active', 'inactive')),
	CONSTRAINT "legal_entities_updated_at_after_created_at_check" CHECK ("app"."legal_entities"."updated_at" >= "app"."legal_entities"."created_at"),
	CONSTRAINT "legal_entities_code_nonempty_check" CHECK (length(trim("app"."legal_entities"."code")) > 0),
	CONSTRAINT "legal_entities_name_nonempty_check" CHECK (length(trim("app"."legal_entities"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "organizations_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "organizations_status_check" CHECK ("app"."organizations"."status" in ('active', 'inactive')),
	CONSTRAINT "organizations_updated_at_after_created_at_check" CHECK ("app"."organizations"."updated_at" >= "app"."organizations"."created_at"),
	CONSTRAINT "organizations_code_nonempty_check" CHECK (length(trim("app"."organizations"."code")) > 0),
	CONSTRAINT "organizations_name_nonempty_check" CHECK (length(trim("app"."organizations"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."outlets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"territory_id" uuid NOT NULL,
	"legal_entity_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "outlets_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "outlets_id_scope_ancestry_key" UNIQUE("id","brand_id","organization_id","territory_id"),
	CONSTRAINT "outlets_id_full_ancestry_key" UNIQUE("id","brand_id","organization_id","territory_id","legal_entity_id"),
	CONSTRAINT "outlets_status_check" CHECK ("app"."outlets"."status" in ('active', 'inactive')),
	CONSTRAINT "outlets_updated_at_after_created_at_check" CHECK ("app"."outlets"."updated_at" >= "app"."outlets"."created_at"),
	CONSTRAINT "outlets_code_nonempty_check" CHECK (length(trim("app"."outlets"."code")) > 0),
	CONSTRAINT "outlets_name_nonempty_check" CHECK (length(trim("app"."outlets"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."territories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "territories_id_brand_id_key" UNIQUE("id","brand_id"),
	CONSTRAINT "territories_status_check" CHECK ("app"."territories"."status" in ('active', 'inactive')),
	CONSTRAINT "territories_updated_at_after_created_at_check" CHECK ("app"."territories"."updated_at" >= "app"."territories"."created_at"),
	CONSTRAINT "territories_code_nonempty_check" CHECK (length(trim("app"."territories"."code")) > 0),
	CONSTRAINT "territories_name_nonempty_check" CHECK (length(trim("app"."territories"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."access_memberships" ADD CONSTRAINT "access_memberships_workforce_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_memberships" ADD CONSTRAINT "access_memberships_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_memberships" ADD CONSTRAINT "access_memberships_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_memberships" ADD CONSTRAINT "access_memberships_territory_brand_fk" FOREIGN KEY ("territory_id","brand_id") REFERENCES "app"."territories"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_memberships" ADD CONSTRAINT "access_memberships_outlet_ancestry_fk" FOREIGN KEY ("outlet_id","brand_id","organization_id","territory_id") REFERENCES "app"."outlets"("id","brand_id","organization_id","territory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_allowed_scopes" ADD CONSTRAINT "access_role_allowed_scopes_role_key_access_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "app"."access_roles"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_assignments" ADD CONSTRAINT "access_role_assignments_membership_id_access_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "app"."access_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_assignments" ADD CONSTRAINT "access_role_assignments_role_key_access_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "app"."access_roles"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_assignments" ADD CONSTRAINT "access_role_assignments_granted_by_workforce_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("granted_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_assignments" ADD CONSTRAINT "access_role_assignments_revoked_by_workforce_user_id_workforce_auth_users_id_fk" FOREIGN KEY ("revoked_by_workforce_user_id") REFERENCES "app"."workforce_auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_permissions" ADD CONSTRAINT "access_role_permissions_role_key_access_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "app"."access_roles"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."access_role_permissions" ADD CONSTRAINT "access_role_permissions_permission_key_access_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "app"."access_permissions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."legal_entities" ADD CONSTRAINT "legal_entities_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD CONSTRAINT "organizations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD CONSTRAINT "outlets_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD CONSTRAINT "outlets_organization_brand_fk" FOREIGN KEY ("organization_id","brand_id") REFERENCES "app"."organizations"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD CONSTRAINT "outlets_territory_brand_fk" FOREIGN KEY ("territory_id","brand_id") REFERENCES "app"."territories"("id","brand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outlets" ADD CONSTRAINT "outlets_legal_entity_brand_org_fk" FOREIGN KEY ("legal_entity_id","brand_id","organization_id") REFERENCES "app"."legal_entities"("id","brand_id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."territories" ADD CONSTRAINT "territories_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "app"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_control_audit_events_occurred_at_idx" ON "app"."access_control_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "access_control_audit_events_actor_idx" ON "app"."access_control_audit_events" USING btree ("actor_workforce_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "access_control_audit_events_target_idx" ON "app"."access_control_audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "access_memberships_platform_active_uidx" ON "app"."access_memberships" USING btree ("workforce_user_id") WHERE "app"."access_memberships"."scope_type" = 'platform' and "app"."access_memberships"."status" in ('invited', 'active', 'suspended');--> statement-breakpoint
CREATE UNIQUE INDEX "access_memberships_brand_active_uidx" ON "app"."access_memberships" USING btree ("workforce_user_id","brand_id") WHERE "app"."access_memberships"."scope_type" = 'brand' and "app"."access_memberships"."status" in ('invited', 'active', 'suspended');--> statement-breakpoint
CREATE UNIQUE INDEX "access_memberships_organization_active_uidx" ON "app"."access_memberships" USING btree ("workforce_user_id","organization_id") WHERE "app"."access_memberships"."scope_type" = 'organization' and "app"."access_memberships"."status" in ('invited', 'active', 'suspended');--> statement-breakpoint
CREATE UNIQUE INDEX "access_memberships_territory_active_uidx" ON "app"."access_memberships" USING btree ("workforce_user_id","territory_id") WHERE "app"."access_memberships"."scope_type" = 'territory' and "app"."access_memberships"."status" in ('invited', 'active', 'suspended');--> statement-breakpoint
CREATE UNIQUE INDEX "access_memberships_outlet_active_uidx" ON "app"."access_memberships" USING btree ("workforce_user_id","outlet_id") WHERE "app"."access_memberships"."scope_type" = 'outlet' and "app"."access_memberships"."status" in ('invited', 'active', 'suspended');--> statement-breakpoint
CREATE INDEX "access_memberships_workforce_user_idx" ON "app"."access_memberships" USING btree ("workforce_user_id","status");--> statement-breakpoint
CREATE INDEX "access_role_assignments_membership_idx" ON "app"."access_role_assignments" USING btree ("membership_id","role_key");--> statement-breakpoint
CREATE INDEX "access_role_assignments_role_idx" ON "app"."access_role_assignments" USING btree ("role_key","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_code_uidx" ON "app"."brands" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_entities_organization_code_uidx" ON "app"."legal_entities" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_brand_code_uidx" ON "app"."organizations" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_brand_code_uidx" ON "app"."outlets" USING btree ("brand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "territories_brand_code_uidx" ON "app"."territories" USING btree ("brand_id","code");
--> statement-breakpoint
-- IMP-011 system catalog seed (must match src/shared/access-control/catalog.ts)
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('brand.create', 'brand.create', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('brand.read', 'brand.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('brand.update', 'brand.update', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('organization.create', 'organization.create', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('organization.read', 'organization.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('organization.update', 'organization.update', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('territory.create', 'territory.create', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('territory.read', 'territory.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('territory.update', 'territory.update', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('legal_entity.create', 'legal_entity.create', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('legal_entity.read', 'legal_entity.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('legal_entity.update', 'legal_entity.update', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.create', 'outlet.create', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.read', 'outlet.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('outlet.update', 'outlet.update', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.membership.read', 'access.membership.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.membership.manage', 'access.membership.manage', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.role_assignment.read', 'access.role_assignment.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.role_assignment.grant', 'access.role_assignment.grant', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.role_assignment.revoke', 'access.role_assignment.revoke', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.effective_permissions.read', 'access.effective_permissions.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_permissions" ("key", "description", "created_at") VALUES ('access.audit.read', 'access.audit.read', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('platform_super_admin', 'Platform Super Admin', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('brand_admin', 'Brand Admin', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('outlet_manager', 'Outlet Manager', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('kitchen_operator', 'Kitchen Operator', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('delivery_coordinator', 'Delivery Coordinator', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('support_refund_operator', 'Support/Refund Operator', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_roles" ("key", "display_name", "created_at") VALUES ('finance_viewer', 'Finance Viewer', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('platform_super_admin', 'platform', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('brand_admin', 'brand', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('outlet_manager', 'outlet', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('kitchen_operator', 'outlet', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('delivery_coordinator', 'outlet', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('support_refund_operator', 'brand', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('support_refund_operator', 'organization', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('support_refund_operator', 'territory', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('support_refund_operator', 'outlet', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('finance_viewer', 'brand', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_allowed_scopes" ("role_key", "scope_type", "created_at") VALUES ('finance_viewer', 'organization', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'brand.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'brand.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'brand.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'organization.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'organization.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'organization.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'territory.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'territory.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'territory.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'legal_entity.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'legal_entity.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'legal_entity.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'outlet.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.membership.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.membership.manage', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.role_assignment.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.role_assignment.grant', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.role_assignment.revoke', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.effective_permissions.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('platform_super_admin', 'access.audit.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'brand.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'brand.update', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'organization.create', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'organization.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'organization.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'territory.create', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'territory.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'territory.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'legal_entity.create', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'legal_entity.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'legal_entity.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.create', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'outlet.update', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.membership.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.membership.manage', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.role_assignment.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.role_assignment.grant', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.role_assignment.revoke', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.effective_permissions.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('brand_admin', 'access.audit.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'outlet.update', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.membership.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.membership.manage', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.role_assignment.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.role_assignment.grant', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.role_assignment.revoke', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.effective_permissions.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('outlet_manager', 'access.audit.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('kitchen_operator', 'outlet.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('delivery_coordinator', 'outlet.read', 'exact', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'brand.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'organization.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'territory.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('support_refund_operator', 'outlet.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'brand.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'organization.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'territory.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'legal_entity.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
INSERT INTO "app"."access_role_permissions" ("role_key", "permission_key", "inheritance_mode", "created_at") VALUES ('finance_viewer', 'outlet.read', 'descendants', timestamptz '2026-08-07T00:00:00Z');
--> statement-breakpoint
-- Privilege tightening for boba_bear_app when the role exists (Compose).
-- Default privileges already grant DML; REVOKE only. No GRANT hardcoding.
DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'boba_bear_app') THEN
    REVOKE INSERT, UPDATE, DELETE ON
      app.access_permissions,
      app.access_roles,
      app.access_role_allowed_scopes,
      app.access_role_permissions
    FROM boba_bear_app;
    REVOKE UPDATE, DELETE ON app.access_control_audit_events FROM boba_bear_app;
    REVOKE DELETE ON
      app.brands,
      app.organizations,
      app.territories,
      app.legal_entities,
      app.outlets,
      app.access_memberships,
      app.access_role_assignments
    FROM boba_bear_app;
  END IF;
END
$priv$;
