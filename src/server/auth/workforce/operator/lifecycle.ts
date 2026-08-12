/**
 * BOBA Bear-owned workforce lifecycle helpers for operator tooling
 * (IMP-010). Updates only columns we own (`password_change_required`,
 * `disabled_at` assertions, existence checks) through IMP-006 persistence —
 * never hashes passwords or constructs credential accounts.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import {
  workforceAuthAccounts,
  workforceAuthSessions,
  workforceAuthUsers,
} from "../../../../platform/database/schema/workforce-auth";
import type { PersistenceQueryContext } from "../../../persistence";

export type WorkforceLifecycleIdentity = Readonly<{
  id: string;
  email: string;
  passwordChangeRequired: boolean;
  twoFactorEnabled: boolean | null;
  disabledAt: Date | null;
}>;

function assertApplicationRole(context: PersistenceQueryContext, operation: string): void {
  if (context.role !== "application") {
    throw new Error(
      `${operation} requires an application-role persistence context, got role "${context.role}".`,
    );
  }
}

export async function findWorkforceUserByEmail(
  context: PersistenceQueryContext,
  email: string,
): Promise<WorkforceLifecycleIdentity | null> {
  assertApplicationRole(context, "findWorkforceUserByEmail");
  const normalized = email.toLowerCase();
  const rows = await context.db
    .select({
      id: workforceAuthUsers.id,
      email: workforceAuthUsers.email,
      passwordChangeRequired: workforceAuthUsers.passwordChangeRequired,
      twoFactorEnabled: workforceAuthUsers.twoFactorEnabled,
      disabledAt: workforceAuthUsers.disabledAt,
    })
    .from(workforceAuthUsers)
    .where(eq(workforceAuthUsers.email, normalized))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordChangeRequired: row.passwordChangeRequired,
    twoFactorEnabled: row.twoFactorEnabled,
    disabledAt: row.disabledAt ?? null,
  };
}

export async function workforceUserHasCredentialAccount(
  context: PersistenceQueryContext,
  userId: string,
): Promise<boolean> {
  assertApplicationRole(context, "workforceUserHasCredentialAccount");
  const rows = await context.db
    .select({ id: workforceAuthAccounts.id })
    .from(workforceAuthAccounts)
    .where(
      and(
        eq(workforceAuthAccounts.userId, userId),
        eq(workforceAuthAccounts.providerId, "credential"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function countWorkforceSessionsForUser(
  context: PersistenceQueryContext,
  userId: string,
): Promise<number> {
  assertApplicationRole(context, "countWorkforceSessionsForUser");
  const rows = await context.db
    .select({ id: workforceAuthSessions.id })
    .from(workforceAuthSessions)
    .where(eq(workforceAuthSessions.userId, userId));
  return rows.length;
}

/**
 * Force BOBA Bear lifecycle defaults after Better Auth creates the user via
 * `signUpEmail` (or before a temporary-password reset completes).
 */
export async function setWorkforceOperatorLifecycleState(
  context: PersistenceQueryContext,
  userId: string,
  state: Readonly<{
    passwordChangeRequired: boolean;
    twoFactorEnabled?: boolean;
    disabledAt?: Date | null;
  }>,
): Promise<void> {
  assertApplicationRole(context, "setWorkforceOperatorLifecycleState");
  await context.db
    .update(workforceAuthUsers)
    .set({
      passwordChangeRequired: state.passwordChangeRequired,
      ...(state.twoFactorEnabled !== undefined
        ? { twoFactorEnabled: state.twoFactorEnabled }
        : {}),
      ...(state.disabledAt !== undefined ? { disabledAt: state.disabledAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workforceAuthUsers.id, userId));
}
