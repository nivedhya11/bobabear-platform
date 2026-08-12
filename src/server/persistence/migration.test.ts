import { describe, expect, it } from "vitest";

import type { MigrationConfig, WebConfig } from "../../platform/config";
import { getApplicationPersistence } from "./application";
import { PersistenceConfigurationError } from "./errors";
import { getMigrationPersistence } from "./migration";

function migrationConfig(overrides?: Partial<MigrationConfig>): MigrationConfig {
  return {
    environment: "test",
    processKind: "migration",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    databaseMigrationUrl: "postgresql://migrator:secret@localhost:5433/boba_bear_local",
    ...overrides,
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

describe("getMigrationPersistence", () => {
  it("accepts a migration configuration", () => {
    const handle = getMigrationPersistence(migrationConfig());
    expect(handle.role).toBe("migration");
  });

  it("returns the same handle for the same configuration object", () => {
    const config = migrationConfig();
    expect(getMigrationPersistence(config)).toBe(getMigrationPersistence(config));
  });

  it("returns a different handle for a different configuration object", () => {
    expect(getMigrationPersistence(migrationConfig())).not.toBe(
      getMigrationPersistence(migrationConfig()),
    );
  });

  it("creates a fresh handle after the shared handle is closed", async () => {
    const config = migrationConfig();
    const first = getMigrationPersistence(config);
    await first.close();
    const second = getMigrationPersistence(config);
    expect(second).not.toBe(first);
  });

  it("rejects a web/application configuration passed by mistake", () => {
    expect(() =>
      getMigrationPersistence(webConfig() as unknown as MigrationConfig),
    ).toThrow(PersistenceConfigurationError);
  });

  it("keeps the application and migration registries independent", () => {
    const appConfig = webConfig();
    const migConfig = migrationConfig();

    const appHandle = getApplicationPersistence(appConfig);
    const migHandle = getMigrationPersistence(migConfig);

    expect(appHandle).not.toBe(migHandle);
    expect(appHandle.role).toBe("application");
    expect(migHandle.role).toBe("migration");
  });
});
