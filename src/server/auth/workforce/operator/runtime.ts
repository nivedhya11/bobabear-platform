/**
 * Ephemeral Better Auth runtime for workforce operator credential CLIs
 * (IMP-010). Used only from `scripts/workforce/**` tooling — never imported
 * by workforce-auth HTTP routing, never bound to a port, never proxied.
 *
 * Always creates a fresh handle (no shared WeakMap cache): each CLI
 * operation may inject a distinct `sendResetPassword` bridge, and must
 * `close()` explicitly when finished.
 */
import "server-only";

import { betterAuth } from "better-auth";

import { workforceBetterAuthSchema } from "../../../../platform/database/schema/workforce-auth";
import {
  getApplicationPersistence,
  type Persistence,
  type PersistenceQueryContext,
} from "../../../persistence";
import { createRealmBetterAuthDatabaseAdapter } from "../../shared/database-adapter";
import { WORKFORCE_REALM } from "../../shared/constants";
import {
  AuthPersistenceUnavailableError,
  AuthRealmMismatchError,
  AuthRuntimeClosedError,
  AuthRuntimeInitializationError,
} from "../../shared/errors";
import type { WorkforceAuthRuntimeConfig } from "../../shared/types";
import { buildWorkforceOperatorBetterAuthOptions } from "./options";
import type { WorkforceOperatorResetPasswordCallbackInput } from "./reset-token-bridge";

export type WorkforceOperatorBetterAuthInstance = ReturnType<
  typeof betterAuth<ReturnType<typeof buildWorkforceOperatorBetterAuthOptions>>
>;

export type WorkforceOperatorSendResetPassword = (
  data: WorkforceOperatorResetPasswordCallbackInput,
  request?: Request,
) => Promise<void>;

export type WorkforceOperatorAuthRuntimeConfig = WorkforceAuthRuntimeConfig &
  Readonly<{
    /**
     * Optional until a reset operation needs it. Create/disable CLIs may
     * omit this; reset always supplies a single-shot bridge callback.
     */
    sendResetPassword?: WorkforceOperatorSendResetPassword;
  }>;

export interface WorkforceOperatorAuthRuntime {
  readonly realm: typeof WORKFORCE_REALM;
  readonly kind: "workforce-operator";
  getAuth(): Promise<WorkforceOperatorBetterAuthInstance>;
  withContext<T>(
    callback: (context: PersistenceQueryContext) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

export interface WorkforceOperatorAuthRuntimeDependencies {
  readonly getApplicationPersistence: typeof getApplicationPersistence;
  readonly createDatabaseAdapter: typeof createRealmBetterAuthDatabaseAdapter;
  readonly betterAuth: typeof betterAuth;
}

const defaultDependencies: WorkforceOperatorAuthRuntimeDependencies = {
  getApplicationPersistence,
  createDatabaseAdapter: createRealmBetterAuthDatabaseAdapter,
  betterAuth,
};

async function noopSendResetPassword(): Promise<void> {
  throw new Error(
    "Workforce operator auth runtime was not configured with sendResetPassword.",
  );
}

function assertWorkforceOperatorRuntimeConfig(
  config: WorkforceOperatorAuthRuntimeConfig,
): void {
  const actualRealm = (config.auth as { realm?: string } | undefined)?.realm;
  if (actualRealm !== WORKFORCE_REALM) {
    throw new AuthRealmMismatchError({
      realm: actualRealm === "customer" ? "customer" : "workforce",
      expectedRealm: WORKFORCE_REALM,
      message:
        `createWorkforceOperatorAuthRuntime() requires a "workforce" realm configuration, ` +
        `got realm "${actualRealm ?? "unknown"}".`,
    });
  }
}

/**
 * Create a fresh, ephemeral operator Better Auth runtime. Callers must
 * `close()` after the CLI operation. Never registers an HTTP listener.
 */
export function createWorkforceOperatorAuthRuntime(
  config: WorkforceOperatorAuthRuntimeConfig,
  dependencies: WorkforceOperatorAuthRuntimeDependencies = defaultDependencies,
): WorkforceOperatorAuthRuntime {
  assertWorkforceOperatorRuntimeConfig(config);

  let closed = false;
  let persistenceHandle: Persistence | null = null;
  let initPromise: Promise<WorkforceOperatorBetterAuthInstance> | null = null;

  async function initialize(): Promise<WorkforceOperatorBetterAuthInstance> {
    const persistence = dependencies.getApplicationPersistence(config.persistence);
    persistenceHandle = persistence;
    const database = await dependencies.createDatabaseAdapter(
      WORKFORCE_REALM,
      persistence,
      workforceBetterAuthSchema,
    );
    return dependencies.betterAuth(
      buildWorkforceOperatorBetterAuthOptions({
        config: config.auth,
        database,
        sendResetPassword: config.sendResetPassword ?? noopSendResetPassword,
      }),
    );
  }

  return {
    realm: WORKFORCE_REALM,
    kind: "workforce-operator",

    async getAuth(): Promise<WorkforceOperatorBetterAuthInstance> {
      if (closed) throw new AuthRuntimeClosedError(WORKFORCE_REALM);
      if (!initPromise) {
        initPromise = initialize().catch((error: unknown) => {
          initPromise = null;
          if (error instanceof AuthPersistenceUnavailableError) throw error;
          throw new AuthRuntimeInitializationError({
            realm: WORKFORCE_REALM,
            message:
              "Failed to initialize the workforce operator Better Auth runtime.",
          });
        });
      }
      return initPromise;
    },

    async withContext<T>(
      callback: (context: PersistenceQueryContext) => Promise<T>,
    ): Promise<T> {
      if (closed) throw new AuthRuntimeClosedError(WORKFORCE_REALM);
      if (!persistenceHandle) {
        // Ensure the persistence handle exists even before getAuth().
        persistenceHandle = dependencies.getApplicationPersistence(config.persistence);
      }
      return persistenceHandle.withContext(callback);
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      if (persistenceHandle) {
        await persistenceHandle.close();
      }
    },
  };
}
