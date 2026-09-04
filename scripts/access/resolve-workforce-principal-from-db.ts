/**
 * Load a trusted WorkforcePrincipal from authoritative workforce identity rows.
 *
 * Persistent staging / operator scripts must use this path — never
 * `principalFor` fixtures that forge MFA / password-change flags.
 */
import { eq } from "drizzle-orm";

import { workforceAuthUsers } from "../../src/platform/database/schema/workforce-auth";
import {
  createWorkforcePrincipalFromTrustedIdentity,
  type WorkforcePrincipal,
} from "../../src/server/access-control";
import type { Persistence } from "../../src/server/persistence/types";

export async function resolveWorkforcePrincipalFromDatabase(
  persistence: Persistence,
  workforceUserId: string,
): Promise<WorkforcePrincipal> {
  if (typeof workforceUserId !== "string" || workforceUserId.length === 0) {
    throw new Error("workforceUserId must be a non-empty string.");
  }

  const rows = await persistence.withContext(async (ctx) =>
    ctx.db
      .select({
        id: workforceAuthUsers.id,
        disabledAt: workforceAuthUsers.disabledAt,
        passwordChangeRequired: workforceAuthUsers.passwordChangeRequired,
        twoFactorEnabled: workforceAuthUsers.twoFactorEnabled,
      })
      .from(workforceAuthUsers)
      .where(eq(workforceAuthUsers.id, workforceUserId))
      .limit(1),
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Workforce user not found.");
  }

  return createWorkforcePrincipalFromTrustedIdentity({
    workforceUserId: row.id,
    disabledAt: row.disabledAt,
    passwordChangeRequired: row.passwordChangeRequired,
    twoFactorEnabled: row.twoFactorEnabled,
  });
}
