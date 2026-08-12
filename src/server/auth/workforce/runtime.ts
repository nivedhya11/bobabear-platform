/**
 * Workforce realm Better Auth runtime (IMP-008). Mirrors
 * `customer/runtime.ts` with a separate `WeakMap` registry, a separate
 * realm-owned persistence handle, and the workforce schema/options — see
 * that file for the full lifecycle rationale.
 */
import "server-only";

import { betterAuth } from "better-auth";

import { workforceBetterAuthSchema } from "../../../platform/database/schema/workforce-auth";
import { getApplicationPersistence, type Persistence } from "../../persistence";
import { createRealmBetterAuthDatabaseAdapter } from "../shared/database-adapter";
import { WORKFORCE_REALM } from "../shared/constants";
import {
  AuthPersistenceUnavailableError,
  AuthRealmMismatchError,
  AuthRuntimeClosedError,
  AuthRuntimeInitializationError,
} from "../shared/errors";
import type { WorkforceAuthRuntimeConfig } from "../shared/types";
import { buildWorkforceBetterAuthOptions } from "./options";

export type WorkforceBetterAuthInstance = ReturnType<
  typeof betterAuth<ReturnType<typeof buildWorkforceBetterAuthOptions>>
>;

export interface WorkforceAuthRuntime {
  readonly realm: typeof WORKFORCE_REALM;
  getAuth(): Promise<WorkforceBetterAuthInstance>;
  close(): Promise<void>;
}

/** Narrow seam for tests: never exported from the public boundary
 * (`index.ts`). See `customer/runtime.ts`'s equivalent. */
export interface WorkforceAuthRuntimeDependencies {
  readonly getApplicationPersistence: typeof getApplicationPersistence;
  readonly createDatabaseAdapter: typeof createRealmBetterAuthDatabaseAdapter;
  readonly betterAuth: typeof betterAuth;
}

const defaultDependencies: WorkforceAuthRuntimeDependencies = {
  getApplicationPersistence,
  createDatabaseAdapter: createRealmBetterAuthDatabaseAdapter,
  betterAuth,
};

const registry = new WeakMap<WorkforceAuthRuntimeConfig, WorkforceAuthRuntime>();

function assertWorkforceRuntimeConfig(config: WorkforceAuthRuntimeConfig): void {
  const actualRealm = (config.auth as { realm?: string } | undefined)?.realm;
  if (actualRealm !== WORKFORCE_REALM) {
    throw new AuthRealmMismatchError({
      realm: actualRealm === "customer" ? "customer" : "workforce",
      expectedRealm: WORKFORCE_REALM,
      message:
        `getWorkforceAuthRuntime() requires a "workforce" realm configuration, ` +
        `got realm "${actualRealm ?? "unknown"}".`,
    });
  }
}

function createWorkforceRuntimeHandle(
  config: WorkforceAuthRuntimeConfig,
  dependencies: WorkforceAuthRuntimeDependencies,
): WorkforceAuthRuntime {
  let closed = false;
  let persistenceHandle: Persistence | null = null;
  let initPromise: Promise<WorkforceBetterAuthInstance> | null = null;

  async function initialize(): Promise<WorkforceBetterAuthInstance> {
    const persistence = dependencies.getApplicationPersistence(config.persistence);
    persistenceHandle = persistence;
    const database = await dependencies.createDatabaseAdapter(
      WORKFORCE_REALM,
      persistence,
      workforceBetterAuthSchema,
    );
    return dependencies.betterAuth(buildWorkforceBetterAuthOptions(config.auth, database));
  }

  return {
    realm: WORKFORCE_REALM,

    async getAuth(): Promise<WorkforceBetterAuthInstance> {
      if (closed) throw new AuthRuntimeClosedError(WORKFORCE_REALM);
      if (!initPromise) {
        initPromise = initialize().catch((error: unknown) => {
          initPromise = null;
          if (error instanceof AuthPersistenceUnavailableError) throw error;
          throw new AuthRuntimeInitializationError({
            realm: WORKFORCE_REALM,
            message: "Failed to initialize the workforce realm Better Auth runtime.",
          });
        });
      }
      return initPromise;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      registry.delete(config);
      if (persistenceHandle) {
        await persistenceHandle.close();
      }
    },
  };
}

/**
 * Get (or lazily create) the shared workforce realm Better Auth runtime for
 * `config`. A customer configuration passed here fails closed with
 * {@link AuthRealmMismatchError} — checked at runtime via `config.auth.realm`,
 * not only by TypeScript's type system.
 */
export function getWorkforceAuthRuntime(
  config: WorkforceAuthRuntimeConfig,
  dependencies: WorkforceAuthRuntimeDependencies = defaultDependencies,
): WorkforceAuthRuntime {
  assertWorkforceRuntimeConfig(config);

  const existing = registry.get(config);
  if (existing) return existing;

  const handle = createWorkforceRuntimeHandle(config, dependencies);
  registry.set(config, handle);
  return handle;
}
