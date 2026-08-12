/**
 * Drizzle schema for the workforce Better Auth realm (IMP-008 core;
 * IMP-010 email/password + TOTP MFA fields).
 *
 * See `customer-auth.ts` for the shared rationale — the workforce realm's
 * core tables mirror Better Auth 1.6.25's contract, scoped to entirely
 * separate physical tables with no foreign key crossing into the customer
 * realm. IMP-010 adds Better Auth's `twoFactorEnabled` user field (via the
 * workforce-only `twoFactor` plugin), BOBA Bear lifecycle fields
 * (`passwordChangeRequired`, `disabledAt`), and the separate
 * `workforce_auth_two_factors` table (see relations below).
 */
import { relations } from "drizzle-orm";
import { boolean, index, integer, text, timestamp } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const workforceAuthUsers = appSchema.table("workforce_auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // IMP-010: Better Auth `twoFactor` plugin field (input: false).
  // Matches the 1.6.25 generated contract exactly — `required: false` with
  // `defaultValue: false` (nullable column, default false).
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  // IMP-010: BOBA Bear lifecycle fields (server-controlled; input: false,
  // returned: false in Better Auth options — never client-writable).
  passwordChangeRequired: boolean("password_change_required").default(true).notNull(),
  disabledAt: timestamp("disabled_at"),
});

/**
 * Better Auth 1.6.25 `twoFactor` model for the workforce realm only.
 * Physical table name is realm-scoped; logical model key remains
 * `twoFactor` for the drizzle adapter.
 */
export const workforceAuthTwoFactors = appSchema.table(
  "workforce_auth_two_factors",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => workforceAuthUsers.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until"),
  },
  (table) => [
    index("workforce_auth_two_factors_secret_idx").on(table.secret),
    index("workforce_auth_two_factors_user_id_idx").on(table.userId),
  ],
);

export const workforceAuthSessions = appSchema.table(
  "workforce_auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => workforceAuthUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("workforce_auth_sessions_user_id_idx").on(table.userId)],
);

export const workforceAuthAccounts = appSchema.table(
  "workforce_auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => workforceAuthUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("workforce_auth_accounts_user_id_idx").on(table.userId)],
);

export const workforceAuthVerifications = appSchema.table(
  "workforce_auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("workforce_auth_verifications_identifier_idx").on(table.identifier)],
);

export const workforceAuthUsersRelations = relations(workforceAuthUsers, ({ many }) => ({
  sessions: many(workforceAuthSessions),
  accounts: many(workforceAuthAccounts),
  twofactors: many(workforceAuthTwoFactors),
}));

export const workforceAuthSessionsRelations = relations(workforceAuthSessions, ({ one }) => ({
  user: one(workforceAuthUsers, {
    fields: [workforceAuthSessions.userId],
    references: [workforceAuthUsers.id],
  }),
}));

export const workforceAuthAccountsRelations = relations(workforceAuthAccounts, ({ one }) => ({
  user: one(workforceAuthUsers, {
    fields: [workforceAuthAccounts.userId],
    references: [workforceAuthUsers.id],
  }),
}));

export const workforceAuthTwoFactorsRelations = relations(workforceAuthTwoFactors, ({ one }) => ({
  user: one(workforceAuthUsers, {
    fields: [workforceAuthTwoFactors.userId],
    references: [workforceAuthUsers.id],
  }),
}));

/** Logical-key schema object passed to `drizzleAdapter` for the workforce
 * realm. Never pass the whole `appSchema` — Better Auth must only ever see
 * this realm's own tables. The `twoFactor` key is the Better Auth 1.6.25
 * plugin model name (physical table: `workforce_auth_two_factors`). */
export const workforceBetterAuthSchema = {
  user: workforceAuthUsers,
  session: workforceAuthSessions,
  account: workforceAuthAccounts,
  verification: workforceAuthVerifications,
  twoFactor: workforceAuthTwoFactors,
  userRelations: workforceAuthUsersRelations,
  sessionRelations: workforceAuthSessionsRelations,
  accountRelations: workforceAuthAccountsRelations,
  twoFactorRelations: workforceAuthTwoFactorsRelations,
};
