/**
 * Drizzle schema for Access Control tables (IMP-011).
 *
 * System catalogs are seeded by migration and runtime-read-only for the
 * application role. Membership and role assignment are separate. Audit is
 * append-only.
 */
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { workforceAuthUsers } from "./workforce-auth";
import { brandsTable, organizationsTable, outletsTable, territoriesTable } from "./organizations";
import { appSchema } from "./index";

export const accessPermissionsTable = appSchema.table(
  "access_permissions",
  {
    key: text("key").primaryKey(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("access_permissions_key_nonempty_check", sql`length(trim(${table.key})) > 0`),
  ],
);

export const accessRolesTable = appSchema.table(
  "access_roles",
  {
    key: text("key").primaryKey(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("access_roles_key_nonempty_check", sql`length(trim(${table.key})) > 0`),
    check("access_roles_display_name_nonempty_check", sql`length(trim(${table.displayName})) > 0`),
  ],
);

export const accessRoleAllowedScopesTable = appSchema.table(
  "access_role_allowed_scopes",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => accessRolesTable.key),
    scopeType: text("scope_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("access_role_allowed_scopes_role_scope_key").on(table.roleKey, table.scopeType),
    check(
      "access_role_allowed_scopes_scope_type_check",
      sql`${table.scopeType} in ('platform', 'brand', 'organization', 'territory', 'outlet')`,
    ),
  ],
);

export const accessRolePermissionsTable = appSchema.table(
  "access_role_permissions",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => accessRolesTable.key),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => accessPermissionsTable.key),
    inheritanceMode: text("inheritance_mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("access_role_permissions_pkey").on(table.roleKey, table.permissionKey),
    check(
      "access_role_permissions_inheritance_mode_check",
      sql`${table.inheritanceMode} in ('exact', 'descendants')`,
    ),
  ],
);

export const accessMembershipsTable = appSchema.table(
  "access_memberships",
  {
    id: uuid("id").primaryKey(),
    workforceUserId: text("workforce_user_id")
      .notNull()
      .references(() => workforceAuthUsers.id),
    scopeType: text("scope_type").notNull(),
    brandId: uuid("brand_id"),
    organizationId: uuid("organization_id"),
    territoryId: uuid("territory_id"),
    outletId: uuid("outlet_id"),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "access_memberships_scope_type_check",
      sql`${table.scopeType} in ('platform', 'brand', 'organization', 'territory', 'outlet')`,
    ),
    check(
      "access_memberships_status_check",
      sql`${table.status} in ('invited', 'active', 'suspended', 'revoked', 'expired')`,
    ),
    check(
      "access_memberships_scope_shape_check",
      sql`(
        (${table.scopeType} = 'platform' and ${table.brandId} is null and ${table.organizationId} is null and ${table.territoryId} is null and ${table.outletId} is null)
        or (${table.scopeType} = 'brand' and ${table.brandId} is not null and ${table.organizationId} is null and ${table.territoryId} is null and ${table.outletId} is null)
        or (${table.scopeType} = 'organization' and ${table.brandId} is not null and ${table.organizationId} is not null and ${table.territoryId} is null and ${table.outletId} is null)
        or (${table.scopeType} = 'territory' and ${table.brandId} is not null and ${table.organizationId} is null and ${table.territoryId} is not null and ${table.outletId} is null)
        or (${table.scopeType} = 'outlet' and ${table.brandId} is not null and ${table.organizationId} is not null and ${table.territoryId} is not null and ${table.outletId} is not null)
      )`,
    ),
    check(
      "access_memberships_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    foreignKey({
      name: "access_memberships_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "access_memberships_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }),
    foreignKey({
      name: "access_memberships_territory_brand_fk",
      columns: [table.territoryId, table.brandId],
      foreignColumns: [territoriesTable.id, territoriesTable.brandId],
    }),
    foreignKey({
      name: "access_memberships_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    // Partial unique indexes — one per scope type — avoid PostgreSQL NULL
    // uniqueness quirks for platform (all resource IDs null).
    uniqueIndex("access_memberships_platform_active_uidx")
      .on(table.workforceUserId)
      .where(sql`${table.scopeType} = 'platform' and ${table.status} in ('invited', 'active', 'suspended')`),
    uniqueIndex("access_memberships_brand_active_uidx")
      .on(table.workforceUserId, table.brandId)
      .where(sql`${table.scopeType} = 'brand' and ${table.status} in ('invited', 'active', 'suspended')`),
    uniqueIndex("access_memberships_organization_active_uidx")
      .on(table.workforceUserId, table.organizationId)
      .where(
        sql`${table.scopeType} = 'organization' and ${table.status} in ('invited', 'active', 'suspended')`,
      ),
    uniqueIndex("access_memberships_territory_active_uidx")
      .on(table.workforceUserId, table.territoryId)
      .where(sql`${table.scopeType} = 'territory' and ${table.status} in ('invited', 'active', 'suspended')`),
    uniqueIndex("access_memberships_outlet_active_uidx")
      .on(table.workforceUserId, table.outletId)
      .where(sql`${table.scopeType} = 'outlet' and ${table.status} in ('invited', 'active', 'suspended')`),
    index("access_memberships_workforce_user_idx").on(table.workforceUserId, table.status),
  ],
);

export const accessRoleAssignmentsTable = appSchema.table(
  "access_role_assignments",
  {
    id: uuid("id").primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => accessMembershipsTable.id),
    roleKey: text("role_key")
      .notNull()
      .references(() => accessRolesTable.key),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    grantedByWorkforceUserId: text("granted_by_workforce_user_id").references(
      () => workforceAuthUsers.id,
    ),
    revokedByWorkforceUserId: text("revoked_by_workforce_user_id").references(
      () => workforceAuthUsers.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "access_role_assignments_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "access_role_assignments_expires_after_starts_check",
      sql`${table.expiresAt} is null or ${table.expiresAt} >= ${table.startsAt}`,
    ),
    index("access_role_assignments_membership_idx").on(table.membershipId, table.roleKey),
    index("access_role_assignments_role_idx").on(table.roleKey, table.revokedAt),
  ],
);

export const accessControlAuditEventsTable = appSchema.table(
  "access_control_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorWorkforceUserId: text("actor_workforce_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    scopeType: text("scope_type"),
    brandId: uuid("brand_id"),
    organizationId: uuid("organization_id"),
    territoryId: uuid("territory_id"),
    outletId: uuid("outlet_id"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    check("access_control_audit_events_action_nonempty_check", sql`length(trim(${table.action})) > 0`),
    index("access_control_audit_events_occurred_at_idx").on(table.occurredAt),
    index("access_control_audit_events_actor_idx").on(table.actorWorkforceUserId, table.occurredAt),
    index("access_control_audit_events_target_idx").on(table.targetType, table.targetId),
  ],
);
