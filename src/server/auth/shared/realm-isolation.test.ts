import { describe, expect, it, vi } from "vitest";

// See customer/runtime.test.ts for why better-auth/@better-auth/drizzle-adapter
// are mocked rather than really imported in this suite.
vi.mock("better-auth", () => ({ betterAuth: vi.fn() }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: vi.fn() }));

import type { WebConfig } from "../../../platform/config";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../customer-auth/pii";
import { createCustomerOtpProvider } from "../../customer-auth/provider";
import type { Persistence } from "../../persistence";
import {
  getCustomerAuthRuntime,
  type CustomerAuthRuntimeDependencies,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../customer/runtime";
import { getWorkforceAuthRuntime, type WorkforceAuthRuntimeDependencies } from "../workforce/runtime";
import type { CustomerAuthConfig, WorkforceAuthConfig } from "./types";

function customerPhoneDependencies(): CustomerPhoneAuthRuntimeDependencies {
  return {
    otpProvider: createCustomerOtpProvider({ kind: "local", environmentType: "test" }),
    identityDeriver: createCustomerTemporaryIdentityDeriver(
      "realm-isolation-test-customer-pii-hash-secret-32ch" as CustomerPiiHashSecret,
    ),
  };
}

function webConfig(): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl: "postgresql://app:secret@localhost:5433/boba_bear_local",
  };
}

function fakePersistence() {
  const close = vi.fn().mockResolvedValue(undefined);
  const persistence: Persistence = {
    role: "application",
    withContext: vi.fn(async (fn: (ctx: { role: "application"; db: unknown }) => unknown) =>
      fn({ role: "application", db: {} }),
    ) as Persistence["withContext"],
    transaction: vi.fn() as unknown as Persistence["transaction"],
    checkAvailability: vi.fn() as unknown as Persistence["checkAvailability"],
    close,
  };
  return { persistence, close };
}

describe("customer and workforce realm runtimes are fully isolated", () => {
  it("closing the customer runtime does not close the workforce runtime's persistence handle", async () => {
    const customerPersistence = fakePersistence();
    const workforcePersistence = fakePersistence();

    const customerDeps: CustomerAuthRuntimeDependencies = {
      getApplicationPersistence: vi.fn(() => customerPersistence.persistence) as unknown as CustomerAuthRuntimeDependencies["getApplicationPersistence"],
      createDatabaseAdapter: vi.fn(async () => ({}) as never) as unknown as CustomerAuthRuntimeDependencies["createDatabaseAdapter"],
      betterAuth: vi.fn(() => ({ customer: true })) as unknown as CustomerAuthRuntimeDependencies["betterAuth"],
    };
    const workforceDeps: WorkforceAuthRuntimeDependencies = {
      getApplicationPersistence: vi.fn(() => workforcePersistence.persistence) as unknown as WorkforceAuthRuntimeDependencies["getApplicationPersistence"],
      createDatabaseAdapter: vi.fn(async () => ({}) as never) as unknown as WorkforceAuthRuntimeDependencies["createDatabaseAdapter"],
      betterAuth: vi.fn(() => ({ workforce: true })) as unknown as WorkforceAuthRuntimeDependencies["betterAuth"],
    };

    const customerConfig = Object.freeze({
      auth: Object.freeze({
        realm: "customer",
        secret: "customer-synthetic-secret-32-characters-minimum",
        baseURL: new URL("http://localhost:3100"),
        basePath: "/api/auth/customer",
        cookiePrefix: "boba-customer",
        environmentType: "test",
      }) as unknown as CustomerAuthConfig,
      persistence: webConfig(),
    });
    const workforceConfig = Object.freeze({
      auth: Object.freeze({
        realm: "workforce",
        secret: "workforce-synthetic-secret-32-characters-min",
        baseURL: new URL("http://localhost:3100"),
        basePath: "/api/auth/workforce",
        cookiePrefix: "boba-workforce",
        environmentType: "test",
      }) as unknown as WorkforceAuthConfig,
      persistence: webConfig(),
    });

    const customerRuntime = getCustomerAuthRuntime(customerConfig, customerPhoneDependencies(), customerDeps);
    const workforceRuntime = getWorkforceAuthRuntime(workforceConfig, workforceDeps);

    await customerRuntime.getAuth();
    await workforceRuntime.getAuth();

    await customerRuntime.close();

    expect(customerPersistence.close).toHaveBeenCalledTimes(1);
    expect(workforcePersistence.close).not.toHaveBeenCalled();

    // The workforce runtime remains fully usable after the customer runtime closes.
    await expect(workforceRuntime.getAuth()).resolves.toEqual({ workforce: true });
  });
});
