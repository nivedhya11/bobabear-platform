/**
 * Drizzle schema for the customer Better Auth realm (IMP-008; IMP-009 phone
 * OTP fields).
 *
 * Physical tables for Better Auth 1.6.25's core `user`/`session`/`account`/
 * `verification` models, scoped entirely to the customer realm. Field shapes
 * (columns, nullability, defaults, indexes, cascade behaviour) mirror
 * Better Auth's own generated Drizzle/Postgres contract byte-for-byte —
 * confirmed via `./node_modules/.bin/auth generate --adapter drizzle
 * --dialect postgresql` against `scripts/auth/schema-contract/customer-auth.cli.ts`
 * — only the physical table names and realm-scoped relation names differ.
 * The only custom fields are `phoneNumber`/`phoneNumberVerified`, added by
 * the customer-only `phoneNumber` plugin (`better-auth/plugins/phone-number`,
 * see `src/server/auth/customer/options.ts`) — the workforce realm never
 * enables that plugin and never gets these fields. See `auth:schema:check`
 * (`scripts/auth-schema-check.ts`) for the automated drift check against
 * that same generated contract.
 */
import { relations } from "drizzle-orm";
import { boolean, index, text, timestamp } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const customerAuthUsers = appSchema.table("customer_auth_users", {
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
  // IMP-009: added by the `phoneNumber` plugin. Matches the generated
  // contract exactly — nullable, no default, unique on `phoneNumber` only.
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
});

export const customerAuthSessions = appSchema.table(
  "customer_auth_sessions",
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
      .references(() => customerAuthUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("customer_auth_sessions_user_id_idx").on(table.userId)],
);

export const customerAuthAccounts = appSchema.table(
  "customer_auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => customerAuthUsers.id, { onDelete: "cascade" }),
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
  (table) => [index("customer_auth_accounts_user_id_idx").on(table.userId)],
);

export const customerAuthVerifications = appSchema.table(
  "customer_auth_verifications",
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
  (table) => [index("customer_auth_verifications_identifier_idx").on(table.identifier)],
);

export const customerAuthUsersRelations = relations(customerAuthUsers, ({ many }) => ({
  sessions: many(customerAuthSessions),
  accounts: many(customerAuthAccounts),
}));

export const customerAuthSessionsRelations = relations(customerAuthSessions, ({ one }) => ({
  user: one(customerAuthUsers, {
    fields: [customerAuthSessions.userId],
    references: [customerAuthUsers.id],
  }),
}));

export const customerAuthAccountsRelations = relations(customerAuthAccounts, ({ one }) => ({
  user: one(customerAuthUsers, {
    fields: [customerAuthAccounts.userId],
    references: [customerAuthUsers.id],
  }),
}));

/** Logical-key schema object passed to `drizzleAdapter` for the customer
 * realm. Never pass the whole `appSchema` — Better Auth must only ever see
 * this realm's own tables. */
export const customerBetterAuthSchema = {
  user: customerAuthUsers,
  session: customerAuthSessions,
  account: customerAuthAccounts,
  verification: customerAuthVerifications,
  userRelations: customerAuthUsersRelations,
  sessionRelations: customerAuthSessionsRelations,
  accountRelations: customerAuthAccountsRelations,
};
