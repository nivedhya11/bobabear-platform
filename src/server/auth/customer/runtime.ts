/**
 * Customer realm Better Auth runtime (IMP-008 core; IMP-009 phone OTP).
 *
 * `getCustomerAuthRuntime(config, phoneDependencies)` is the only way to
 * obtain a customer realm Better Auth instance. Creating or importing this
 * module opens no connection and creates no OTP provider; the realm's
 * application persistence handle and Better Auth instance are created
 * lazily on the first `getAuth()` call. The registry key is the combination
 * of the `config` object's identity *and* the `phoneDependencies` object's
 * identity (a nested `WeakMap`) — the same `config` with a different
 * `phoneDependencies` object gets its own runtime handle.
 *
 * `config.persistence` must be a `WebConfig`/`WorkerConfig` object
 * dedicated to this realm runtime — `close()` closes the persistence handle
 * it owns, so passing a config object shared with unrelated application
 * persistence use would tear that down too. `close()` never closes
 * `phoneDependencies.otpProvider` — the calling service owns that
 * dependency's lifecycle, not this runtime.
 */
import "server-only";

import { betterAuth } from "better-auth";

import { customerBetterAuthSchema } from "../../../platform/database/schema/customer-auth";
import { getApplicationPersistence, type Persistence } from "../../persistence";
import { createRealmBetterAuthDatabaseAdapter } from "../shared/database-adapter";
import { CUSTOMER_REALM } from "../shared/constants";
import {
  AuthPersistenceUnavailableError,
  AuthRealmMismatchError,
  AuthRuntimeClosedError,
  AuthRuntimeInitializationError,
} from "../shared/errors";
import type { CustomerAuthRuntimeConfig } from "../shared/types";
import { buildCustomerBetterAuthOptions } from "./options";
import type { CustomerPhoneAuthRuntimeDependencies } from "./options";

export type { CustomerPhoneAuthRuntimeDependencies } from "./options";

export type CustomerBetterAuthInstance = ReturnType<
  typeof betterAuth<ReturnType<typeof buildCustomerBetterAuthOptions>>
>;

export interface CustomerAuthRuntime {
  readonly realm: typeof CUSTOMER_REALM;
  getAuth(): Promise<CustomerBetterAuthInstance>;
  close(): Promise<void>;
}

/** Narrow seam for tests: never exported from the public boundary
 * (`index.ts`). Lets a unit test count Better Auth instance-creation calls,
 * or fake the persistence/adapter layer, without a real PostgreSQL server —
 * mirrors `src/server/persistence/handle.ts`'s `PersistenceHandleDependencies`. */
export interface CustomerAuthRuntimeDependencies {
  readonly getApplicationPersistence: typeof getApplicationPersistence;
  readonly createDatabaseAdapter: typeof createRealmBetterAuthDatabaseAdapter;
  readonly betterAuth: typeof betterAuth;
}

const defaultDependencies: CustomerAuthRuntimeDependencies = {
  getApplicationPersistence,
  createDatabaseAdapter: createRealmBetterAuthDatabaseAdapter,
  betterAuth,
};

const registry = new WeakMap<
  CustomerAuthRuntimeConfig,
  WeakMap<CustomerPhoneAuthRuntimeDependencies, CustomerAuthRuntime>
>();

function assertCustomerRuntimeConfig(config: CustomerAuthRuntimeConfig): void {
  const actualRealm = (config.auth as { realm?: string } | undefined)?.realm;
  if (actualRealm !== CUSTOMER_REALM) {
    throw new AuthRealmMismatchError({
      realm: actualRealm === "workforce" ? "workforce" : "customer",
      expectedRealm: CUSTOMER_REALM,
      message:
        `getCustomerAuthRuntime() requires a "customer" realm configuration, ` +
        `got realm "${actualRealm ?? "unknown"}".`,
    });
  }
}

function createCustomerRuntimeHandle(
  config: CustomerAuthRuntimeConfig,
  phoneDependencies: CustomerPhoneAuthRuntimeDependencies,
  dependencies: CustomerAuthRuntimeDependencies,
): CustomerAuthRuntime {
  let closed = false;
  let persistenceHandle: Persistence | null = null;
  let initPromise: Promise<CustomerBetterAuthInstance> | null = null;

  async function initialize(): Promise<CustomerBetterAuthInstance> {
    const persistence = dependencies.getApplicationPersistence(config.persistence);
    persistenceHandle = persistence;
    const database = await dependencies.createDatabaseAdapter(
      CUSTOMER_REALM,
      persistence,
      customerBetterAuthSchema,
    );
    return dependencies.betterAuth(
      buildCustomerBetterAuthOptions(config.auth, database, phoneDependencies),
    );
  }

  return {
    realm: CUSTOMER_REALM,

    async getAuth(): Promise<CustomerBetterAuthInstance> {
      if (closed) throw new AuthRuntimeClosedError(CUSTOMER_REALM);
      if (!initPromise) {
        initPromise = initialize().catch((error: unknown) => {
          initPromise = null;
          if (error instanceof AuthPersistenceUnavailableError) throw error;
          throw new AuthRuntimeInitializationError({
            realm: CUSTOMER_REALM,
            message: "Failed to initialize the customer realm Better Auth runtime.",
          });
        });
      }
      return initPromise;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      registry.get(config)?.delete(phoneDependencies);
      if (persistenceHandle) {
        await persistenceHandle.close();
      }
    },
  };
}

/**
 * Get (or lazily create) the shared customer realm Better Auth runtime for
 * `config` + `phoneDependencies`. A workforce configuration passed here
 * fails closed with {@link AuthRealmMismatchError} — checked at runtime via
 * `config.auth.realm`, not only by TypeScript's type system.
 */
export function getCustomerAuthRuntime(
  config: CustomerAuthRuntimeConfig,
  phoneDependencies: CustomerPhoneAuthRuntimeDependencies,
  dependencies: CustomerAuthRuntimeDependencies = defaultDependencies,
): CustomerAuthRuntime {
  assertCustomerRuntimeConfig(config);

  let byPhoneDependencies = registry.get(config);
  if (!byPhoneDependencies) {
    byPhoneDependencies = new WeakMap<CustomerPhoneAuthRuntimeDependencies, CustomerAuthRuntime>();
    registry.set(config, byPhoneDependencies);
  }

  const existing = byPhoneDependencies.get(phoneDependencies);
  if (existing) return existing;

  const handle = createCustomerRuntimeHandle(config, phoneDependencies, dependencies);
  byPhoneDependencies.set(phoneDependencies, handle);
  return handle;
}
