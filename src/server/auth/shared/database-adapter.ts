/**
 * Better Auth <-> IMP-006 persistence bridge (IMP-008).
 *
 * The only place a realm runtime obtains a Drizzle executor. Reuses the
 * existing `getApplicationPersistence(...)`-issued {@link Persistence}
 * handle's `withContext` API to retrieve the stable, pool-backed executor
 * once during realm initialization, then hands it to
 * `@better-auth/drizzle-adapter`'s `drizzleAdapter`. Never imports `pg` or
 * `drizzle-orm/node-postgres`, never calls `createDatabaseClient`, and never
 * uses the migration-role factory.
 *
 * The returned executor is retained only inside the realm's Better Auth
 * adapter closure for the runtime handle's lifetime (see
 * `src/server/auth/{customer,workforce}/runtime.ts`) — it is not exported as
 * a general query interface.
 */
import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Persistence } from "../../persistence";

import type { AuthRealm } from "./errors";
import { AuthPersistenceUnavailableError } from "./errors";

export async function createRealmBetterAuthDatabaseAdapter(
  realm: AuthRealm,
  applicationPersistence: Persistence,
  schema: Record<string, unknown>,
): Promise<ReturnType<typeof drizzleAdapter>> {
  let executor: Parameters<typeof drizzleAdapter>[0];
  try {
    executor = await applicationPersistence.withContext(async ({ db }) => db as Parameters<typeof drizzleAdapter>[0]);
  } catch {
    throw new AuthPersistenceUnavailableError({
      realm,
      message: `Failed to obtain the ${realm} realm's application persistence executor.`,
    });
  }
  return drizzleAdapter(executor, { provider: "pg", schema });
}
