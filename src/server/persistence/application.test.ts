import { describe, expect, it } from "vitest";

import type { MigrationConfig, WebConfig, WorkerConfig } from "../../platform/config";
import { getApplicationPersistence } from "./application";
import { PersistenceConfigurationError } from "./errors";

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

function workerConfig(overrides?: Partial<WorkerConfig>): WorkerConfig {
  return {
    environment: "test",
    processKind: "worker",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    databaseUrl: "postgresql://app:secret@localhost:5433/boba_bear_local",
    ...overrides,
  };
}

function migrationConfig(): MigrationConfig {
  return {
    environment: "test",
    processKind: "migration",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    databaseMigrationUrl: "postgresql://migrator:secret@localhost:5433/boba_bear_local",
  };
}

describe("getApplicationPersistence", () => {
  it("accepts a web configuration", () => {
    const handle = getApplicationPersistence(webConfig());
    expect(handle.role).toBe("application");
  });

  it("accepts a worker configuration", () => {
    const handle = getApplicationPersistence(workerConfig());
    expect(handle.role).toBe("application");
  });

  it("returns the same handle for the same configuration object", () => {
    const config = webConfig();
    expect(getApplicationPersistence(config)).toBe(getApplicationPersistence(config));
  });

  it("returns a different handle for a different (structurally identical) configuration object", () => {
    expect(getApplicationPersistence(webConfig())).not.toBe(getApplicationPersistence(webConfig()));
  });

  it("creates a fresh handle after the shared handle is closed", async () => {
    const config = webConfig();
    const first = getApplicationPersistence(config);
    await first.close();
    const second = getApplicationPersistence(config);
    expect(second).not.toBe(first);
  });

  it("rejects a migration configuration passed by mistake", () => {
    expect(() =>
      getApplicationPersistence(migrationConfig() as unknown as WebConfig),
    ).toThrow(PersistenceConfigurationError);
  });

  it("rejects an admin/bootstrap-shaped configuration", () => {
    const bootstrapLike = { ...webConfig(), processKind: "admin" } as unknown as WebConfig;
    expect(() => getApplicationPersistence(bootstrapLike)).toThrow(PersistenceConfigurationError);
  });
});
