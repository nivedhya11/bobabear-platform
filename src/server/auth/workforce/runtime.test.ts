import { describe, expect, it, vi } from "vitest";

// See customer/runtime.test.ts for why better-auth/@better-auth/drizzle-adapter
// are mocked rather than really imported in this suite.
vi.mock("better-auth", () => ({ betterAuth: vi.fn() }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: vi.fn() }));

import type { WebConfig } from "../../../platform/config";
import type { Persistence } from "../../persistence";
import { AuthRealmMismatchError, AuthRuntimeClosedError } from "../shared/errors";
import type { WorkforceAuthConfig, WorkforceAuthRuntimeConfig } from "../shared/types";
import {
  getWorkforceAuthRuntime,
  type WorkforceAuthRuntimeDependencies,
} from "./runtime";

function webConfig(overrides?: Partial<WebConfig>): WebConfig {
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
    ...overrides,
  };
}

function workforceAuthConfig(overrides?: Partial<WorkforceAuthConfig>): WorkforceAuthConfig {
  return Object.freeze({
    realm: "workforce",
    secret: "workforce-synthetic-secret-32-characters-min" as WorkforceAuthConfig["secret"],
    baseURL: new URL("http://localhost:3100"),
    basePath: "/api/auth/workforce",
    cookiePrefix: "boba-workforce",
    environmentType: "test",
    ...overrides,
  }) as WorkforceAuthConfig;
}

function runtimeConfig(overrides?: {
  auth?: WorkforceAuthConfig;
  persistence?: WebConfig;
}): WorkforceAuthRuntimeConfig {
  return Object.freeze({
    auth: overrides?.auth ?? workforceAuthConfig(),
    persistence: overrides?.persistence ?? webConfig(),
  });
}

function createFakeDependencies(overrides?: {
  persistenceClose?: ReturnType<typeof vi.fn>;
  betterAuthResult?: unknown;
}) {
  const persistenceClose = overrides?.persistenceClose ?? vi.fn().mockResolvedValue(undefined);
  const fakePersistence: Persistence = {
    role: "application",
    withContext: vi.fn(async (fn: (ctx: { role: "application"; db: unknown }) => unknown) =>
      fn({ role: "application", db: {} }),
    ) as Persistence["withContext"],
    transaction: vi.fn() as unknown as Persistence["transaction"],
    checkAvailability: vi.fn() as unknown as Persistence["checkAvailability"],
    close: persistenceClose as unknown as Persistence["close"],
  };

  const getApplicationPersistence = vi.fn(() => fakePersistence);
  const createDatabaseAdapter = vi.fn(async () => ({ fakeAdapter: true }) as never);
  const betterAuthResult = overrides?.betterAuthResult ?? { fakeAuthInstance: true };
  const betterAuth = vi.fn(() => betterAuthResult) as unknown as WorkforceAuthRuntimeDependencies["betterAuth"];

  const dependencies: WorkforceAuthRuntimeDependencies = {
    getApplicationPersistence: getApplicationPersistence as unknown as WorkforceAuthRuntimeDependencies["getApplicationPersistence"],
    createDatabaseAdapter: createDatabaseAdapter as unknown as WorkforceAuthRuntimeDependencies["createDatabaseAdapter"],
    betterAuth,
  };

  return { dependencies, getApplicationPersistence, createDatabaseAdapter, betterAuth, persistenceClose, fakePersistence };
}

describe("getWorkforceAuthRuntime — lifecycle", () => {
  it("creating the runtime does not touch persistence or Better Auth", () => {
    const { dependencies, getApplicationPersistence, createDatabaseAdapter, betterAuth } = createFakeDependencies();
    getWorkforceAuthRuntime(runtimeConfig(), dependencies);
    expect(getApplicationPersistence).not.toHaveBeenCalled();
    expect(createDatabaseAdapter).not.toHaveBeenCalled();
    expect(betterAuth).not.toHaveBeenCalled();
  });

  it("first getAuth() call initializes exactly one persistence handle and one Better Auth instance", async () => {
    const { dependencies, getApplicationPersistence, betterAuth } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);

    await runtime.getAuth();
    await runtime.getAuth();

    expect(getApplicationPersistence).toHaveBeenCalledTimes(1);
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("concurrent first use creates exactly one Better Auth instance", async () => {
    const { dependencies, betterAuth } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);

    await Promise.all([runtime.getAuth(), runtime.getAuth(), runtime.getAuth()]);

    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("returns the same runtime handle for the same configuration object identity", () => {
    const { dependencies } = createFakeDependencies();
    const config = runtimeConfig();
    expect(getWorkforceAuthRuntime(config, dependencies)).toBe(getWorkforceAuthRuntime(config, dependencies));
  });

  it("returns a different runtime handle for a different (structurally identical) configuration object", () => {
    const { dependencies } = createFakeDependencies();
    expect(getWorkforceAuthRuntime(runtimeConfig(), dependencies)).not.toBe(
      getWorkforceAuthRuntime(runtimeConfig(), dependencies),
    );
  });

  it("close() before first use is safe and never touches persistence", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);
    await runtime.close();
    expect(persistenceClose).not.toHaveBeenCalled();
  });

  it("close() after initialization closes the owned persistence handle", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);
    await runtime.getAuth();
    await runtime.close();
    expect(persistenceClose).toHaveBeenCalledTimes(1);
  });

  it("close() is idempotent", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);
    await runtime.getAuth();
    await runtime.close();
    await runtime.close();
    expect(persistenceClose).toHaveBeenCalledTimes(1);
  });

  it("getAuth() after close() throws AuthRuntimeClosedError", async () => {
    const { dependencies } = createFakeDependencies();
    const runtime = getWorkforceAuthRuntime(runtimeConfig(), dependencies);
    await runtime.close();
    await expect(runtime.getAuth()).rejects.toThrow(AuthRuntimeClosedError);
  });

  it("a fresh handle can be created for the same config identity after closing the old registry entry", async () => {
    const { dependencies } = createFakeDependencies();
    const config = runtimeConfig();
    const first = getWorkforceAuthRuntime(config, dependencies);
    await first.close();

    const { dependencies: secondDependencies } = createFakeDependencies();
    const second = getWorkforceAuthRuntime(config, secondDependencies);
    expect(second).not.toBe(first);
    await expect(second.getAuth()).resolves.toBeDefined();
  });
});

describe("getWorkforceAuthRuntime — realm mismatch", () => {
  it("rejects a customer-realm configuration at runtime", () => {
    const { dependencies } = createFakeDependencies();
    const customerShapedConfig = runtimeConfig({
      auth: workforceAuthConfig({ realm: "customer" as WorkforceAuthConfig["realm"] }),
    });
    expect(() => getWorkforceAuthRuntime(customerShapedConfig, dependencies)).toThrow(AuthRealmMismatchError);
  });
});
