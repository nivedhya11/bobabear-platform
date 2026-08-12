import { describe, expect, it } from "vitest";

import { loadConfig } from "./load-config";
import { resolvePublicConfig } from "./public-config";
import { formatSafeSummary, toSafeSummary } from "./summary";
import type { EnvSource } from "./types";

const WEB_SOURCE: EnvSource = {
  BOBA_BEAR_ENV: "local",
  BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
  BOBA_BEAR_DATABASE_URL:
    "postgresql://boba_bear_app:super-secret-app-password@127.0.0.1:5433/boba_bear_local",
};

const MIGRATION_SOURCE: EnvSource = {
  BOBA_BEAR_ENV: "local",
  BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
  BOBA_BEAR_DATABASE_MIGRATION_URL:
    "postgresql://boba_bear_migrator:super-secret-migrator-password@127.0.0.1:5433/boba_bear_local",
};

describe("toSafeSummary / formatSafeSummary — database fields", () => {
  it("reports databaseConfigured=true and the resolved SSL mode for web", () => {
    const config = loadConfig({ processKind: "web", source: WEB_SOURCE });
    const summary = toSafeSummary(config);
    expect(summary.databaseConfigured).toBe(true);
    expect(summary.databaseSslMode).toBe("disable");
  });

  it("reports databaseConfigured=true for migration", () => {
    const config = loadConfig({ processKind: "migration", source: MIGRATION_SOURCE });
    const summary = toSafeSummary(config);
    expect(summary.databaseConfigured).toBe(true);
  });

  it("never includes the connection string, host, port, username, password, or database name", () => {
    const config = loadConfig({ processKind: "web", source: WEB_SOURCE });
    const summary = toSafeSummary(config);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("super-secret-app-password");
    expect(serialized).not.toContain("127.0.0.1");
    expect(serialized).not.toContain("5433");
    expect(serialized).not.toContain("boba_bear_app");
    expect(serialized).not.toContain("boba_bear_local");
    expect(serialized).not.toContain("postgresql://");
  });

  it("the formatted one-line summary never includes the connection string", () => {
    const config = loadConfig({ processKind: "web", source: WEB_SOURCE });
    const line = formatSafeSummary(config);
    expect(line).not.toContain("super-secret-app-password");
    expect(line).not.toContain("postgresql://");
    expect(line).toContain("databaseConfigured=true");
    expect(line).toContain("databaseSslMode=disable");
  });
});

describe("resolvePublicConfig — remains empty", () => {
  it("resolves to {} even with database configuration present", () => {
    const result = resolvePublicConfig(WEB_SOURCE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual({});
    }
  });
});
