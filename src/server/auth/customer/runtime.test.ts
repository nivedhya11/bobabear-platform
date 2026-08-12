import { describe, expect, it, vi } from "vitest";

// These unit tests exercise this module's own lazy-initialization,
// registry, and shutdown orchestration via injected fake dependencies —
// never the real Better Auth library. Mocked (rather than really imported)
// so the test worker never has to load `better-auth`'s full dependency
// graph, which has been observed to take 70-90+ seconds on this
// environment's WSL/NTFS-backed checkout (see AGENTS.md) — comfortably
// past Vitest's own non-configurable 60s/90s worker-start timeouts.
vi.mock("better-auth", () => ({ betterAuth: vi.fn() }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: vi.fn() }));

import type { WebConfig } from "../../../platform/config";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../customer-auth/pii";
import { createCustomerOtpProvider } from "../../customer-auth/provider";
import type { Persistence } from "../../persistence";
import { AuthRealmMismatchError, AuthRuntimeClosedError } from "../shared/errors";
import type { CustomerAuthConfig, CustomerAuthRuntimeConfig } from "../shared/types";
import {
  getCustomerAuthRuntime,
  type CustomerAuthRuntimeDependencies,
  type CustomerPhoneAuthRuntimeDependencies,
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

function customerAuthConfig(overrides?: Partial<CustomerAuthConfig>): CustomerAuthConfig {
  return Object.freeze({
    realm: "customer",
    secret: "customer-synthetic-secret-32-characters-minimum" as CustomerAuthConfig["secret"],
    baseURL: new URL("http://localhost:3100"),
    basePath: "/api/auth/customer",
    cookiePrefix: "boba-customer",
    environmentType: "test",
    ...overrides,
  }) as CustomerAuthConfig;
}

function runtimeConfig(overrides?: {
  auth?: CustomerAuthConfig;
  persistence?: WebConfig;
}): CustomerAuthRuntimeConfig {
  return Object.freeze({
    auth: overrides?.auth ?? customerAuthConfig(),
    persistence: overrides?.persistence ?? webConfig(),
  });
}

/** A fresh, real (non-mocked) local OTP provider + identity deriver pair —
 * cheap in-process fakes, never a real SMS/network call. Each call returns
 * a distinct object so tests can also exercise the nested
 * config+phoneDependencies registry identity. */
function phoneDependencies(): CustomerPhoneAuthRuntimeDependencies {
  return {
    otpProvider: createCustomerOtpProvider({ kind: "local", environmentType: "test" }),
    identityDeriver: createCustomerTemporaryIdentityDeriver(
      "runtime-test-customer-pii-hash-secret-32-chars-min" as CustomerPiiHashSecret,
    ),
  };
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
  const betterAuth = vi.fn(() => betterAuthResult) as unknown as CustomerAuthRuntimeDependencies["betterAuth"];

  const dependencies: CustomerAuthRuntimeDependencies = {
    getApplicationPersistence: getApplicationPersistence as unknown as CustomerAuthRuntimeDependencies["getApplicationPersistence"],
    createDatabaseAdapter: createDatabaseAdapter as unknown as CustomerAuthRuntimeDependencies["createDatabaseAdapter"],
    betterAuth,
  };

  return { dependencies, getApplicationPersistence, createDatabaseAdapter, betterAuth, persistenceClose, fakePersistence };
}

describe("getCustomerAuthRuntime — lifecycle", () => {
  it("creating the runtime does not touch persistence, the OTP provider, or Better Auth", () => {
    const { dependencies, getApplicationPersistence, createDatabaseAdapter, betterAuth } = createFakeDependencies();
    getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);
    expect(getApplicationPersistence).not.toHaveBeenCalled();
    expect(createDatabaseAdapter).not.toHaveBeenCalled();
    expect(betterAuth).not.toHaveBeenCalled();
  });

  it("first getAuth() call initializes exactly one persistence handle and one Better Auth instance", async () => {
    const { dependencies, getApplicationPersistence, betterAuth } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);

    await runtime.getAuth();
    await runtime.getAuth();

    expect(getApplicationPersistence).toHaveBeenCalledTimes(1);
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("concurrent first use creates exactly one Better Auth instance", async () => {
    const { dependencies, betterAuth } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);

    await Promise.all([runtime.getAuth(), runtime.getAuth(), runtime.getAuth()]);

    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("returns the same runtime handle for the same configuration and phone-dependencies object identity", () => {
    const { dependencies } = createFakeDependencies();
    const config = runtimeConfig();
    const phoneDeps = phoneDependencies();
    expect(getCustomerAuthRuntime(config, phoneDeps, dependencies)).toBe(
      getCustomerAuthRuntime(config, phoneDeps, dependencies),
    );
  });

  it("returns a different runtime handle for a different (structurally identical) configuration object", () => {
    const { dependencies } = createFakeDependencies();
    const phoneDeps = phoneDependencies();
    expect(getCustomerAuthRuntime(runtimeConfig(), phoneDeps, dependencies)).not.toBe(
      getCustomerAuthRuntime(runtimeConfig(), phoneDeps, dependencies),
    );
  });

  it("returns a different runtime handle for the same config but a different phone-dependencies object identity", () => {
    const { dependencies } = createFakeDependencies();
    const config = runtimeConfig();
    expect(getCustomerAuthRuntime(config, phoneDependencies(), dependencies)).not.toBe(
      getCustomerAuthRuntime(config, phoneDependencies(), dependencies),
    );
  });

  it("close() before first use is safe and never touches persistence", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);
    await runtime.close();
    expect(persistenceClose).not.toHaveBeenCalled();
  });

  it("close() after initialization closes the owned persistence handle", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);
    await runtime.getAuth();
    await runtime.close();
    expect(persistenceClose).toHaveBeenCalledTimes(1);
  });

  it("close() is idempotent", async () => {
    const { dependencies, persistenceClose } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);
    await runtime.getAuth();
    await runtime.close();
    await runtime.close();
    expect(persistenceClose).toHaveBeenCalledTimes(1);
  });

  it("getAuth() after close() throws AuthRuntimeClosedError", async () => {
    const { dependencies } = createFakeDependencies();
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDependencies(), dependencies);
    await runtime.close();
    await expect(runtime.getAuth()).rejects.toThrow(AuthRuntimeClosedError);
  });

  it("a fresh handle can be created for the same config+phone-dependencies identity after closing the old registry entry", async () => {
    const { dependencies } = createFakeDependencies();
    const config = runtimeConfig();
    const phoneDeps = phoneDependencies();
    const first = getCustomerAuthRuntime(config, phoneDeps, dependencies);
    await first.close();

    const { dependencies: secondDependencies } = createFakeDependencies();
    const second = getCustomerAuthRuntime(config, phoneDeps, secondDependencies);
    expect(second).not.toBe(first);
    await expect(second.getAuth()).resolves.toBeDefined();
  });

  it("close() never closes the phone-dependencies' OTP provider", async () => {
    const { dependencies } = createFakeDependencies();
    const phoneDeps = phoneDependencies();
    const closeSpy = vi.spyOn(phoneDeps.otpProvider, "close");
    const runtime = getCustomerAuthRuntime(runtimeConfig(), phoneDeps, dependencies);
    await runtime.getAuth();
    await runtime.close();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe("getCustomerAuthRuntime — realm mismatch", () => {
  it("rejects a workforce-realm configuration at runtime", () => {
    const { dependencies } = createFakeDependencies();
    const workforceShapedConfig = runtimeConfig({
      auth: customerAuthConfig({ realm: "workforce" as CustomerAuthConfig["realm"] }),
    });
    expect(() => getCustomerAuthRuntime(workforceShapedConfig, phoneDependencies(), dependencies)).toThrow(
      AuthRealmMismatchError,
    );
  });
});
