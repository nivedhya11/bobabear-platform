import { afterEach, describe, expect, it, vi } from "vitest";

describe("importing the persistence boundary", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("pg");
  });

  // /mnt/c (WSL bind mount) can exceed Vitest's default 5s just for dynamic import + mock reset.
  it("never constructs a pg.Pool merely by being imported", async () => {
    const PoolSpy = vi.fn();
    vi.doMock("pg", () => ({ Pool: PoolSpy }));

    vi.resetModules();
    await import("./index");

    expect(PoolSpy).not.toHaveBeenCalled();
  }, 60_000);

  it("still does not connect after calling the factories, before any operation runs", async () => {
    const PoolSpy = vi.fn();
    vi.doMock("pg", () => ({ Pool: PoolSpy }));

    vi.resetModules();
    const { getApplicationPersistence } = await import("./application");
    getApplicationPersistence({
      environment: "test",
      processKind: "web",
      publicOrigin: "http://localhost:3000",
      logLevel: "warn",
      release: null,
      allowUnsafeAdapters: true,
      databaseSslMode: "disable",
      port: 3000,
      databaseUrl: "postgresql://app:secret@localhost:5433/boba_bear_local",
    });

    expect(PoolSpy).not.toHaveBeenCalled();
  });
});
