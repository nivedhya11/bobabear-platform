import { describe, expect, it } from "vitest";

import { loadConfig } from "./load-config";
import { ConfigurationError } from "./config-error";
import type { EnvSource } from "./types";

function source(overrides: Record<string, string | undefined>): EnvSource {
  return overrides;
}

const LOCAL_WEB_BASE = {
  BOBA_BEAR_ENV: "local",
  BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
  BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
  BOBA_BEAR_DATABASE_MIGRATION_URL:
    "postgresql://boba_bear_migrator@127.0.0.1:5433/boba_bear_local",
};

function issuesOf(fn: () => unknown): { key: string; message: string }[] {
  try {
    fn();
    throw new Error("Expected loadConfig to throw a ConfigurationError.");
  } catch (error) {
    if (!(error instanceof ConfigurationError)) throw error;
    return error.issues.map((issue) => ({ ...issue }));
  }
}

describe("loadConfig — environments", () => {
  it.each(["local", "test", "ci", "staging", "production"])(
    "accepts the valid environment %s (with environment-appropriate origin/release/adapters)",
    (environment) => {
      const isProdLike = environment === "staging" || environment === "production";
      const config = loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: environment,
          BOBA_BEAR_PUBLIC_ORIGIN: isProdLike
            ? "https://thebobabear.in"
            : "http://localhost:3000",
          BOBA_BEAR_RELEASE: isProdLike ? "rel-1" : undefined,
          NODE_ENV: isProdLike ? "production" : undefined,
          BOBA_BEAR_DATABASE_URL: isProdLike
            ? "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear"
            : "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
          BOBA_BEAR_DATABASE_SSL_MODE: isProdLike ? "verify-full" : undefined,
        }),
      });
      expect(config.environment).toBe(environment);
    },
  );

  it("fails when BOBA_BEAR_ENV is missing", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({ BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000" }),
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({ key: "BOBA_BEAR_ENV" }),
    ]);
  });

  it.each(["dev", "prod", "stage", "testing"])(
    "rejects the alias %s",
    (alias) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({
            BOBA_BEAR_ENV: alias,
            BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
          }),
        }),
      );
      expect(issues[0].key).toBe("BOBA_BEAR_ENV");
    },
  );
});

describe("loadConfig — BOBA_BEAR_PUBLIC_ORIGIN", () => {
  it("accepts a valid local HTTP origin", () => {
    const config = loadConfig({
      processKind: "web",
      source: source(LOCAL_WEB_BASE),
    });
    expect(config.publicOrigin).toBe("http://localhost:3000");
  });

  it("accepts a valid production HTTPS origin", () => {
    const config = loadConfig({
      processKind: "web",
      source: source({
        BOBA_BEAR_ENV: "production",
        NODE_ENV: "production",
        BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
        BOBA_BEAR_RELEASE: "rel-1",
        BOBA_BEAR_DATABASE_URL: "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear",
        BOBA_BEAR_DATABASE_SSL_MODE: "verify-full",
      }),
    });
    expect(config.publicOrigin).toBe("https://thebobabear.in");
  });

  it("rejects HTTP in production", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });

  it("rejects localhost in production", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://localhost:3000",
          BOBA_BEAR_RELEASE: "rel-1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });

  it("rejects credentials in the origin", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://user:pass@localhost:3000",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });

  it("rejects a non-root path", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000/app",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });

  it("rejects a query string", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000/?x=1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });

  it("rejects a fragment", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000/#top",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_PUBLIC_ORIGIN")).toBe(true);
  });
});

describe("loadConfig — BOBA_BEAR_LOG_LEVEL", () => {
  it.each([
    ["local", "debug"],
    ["test", "warn"],
    ["ci", "info"],
    ["staging", "info"],
    ["production", "info"],
  ] as const)("defaults to %s -> %s when omitted", (environment, expected) => {
    const isProdLike = environment === "staging" || environment === "production";
    const config = loadConfig({
      processKind: "web",
      source: source({
        BOBA_BEAR_ENV: environment,
        BOBA_BEAR_PUBLIC_ORIGIN: isProdLike
          ? "https://thebobabear.in"
          : "http://localhost:3000",
        BOBA_BEAR_RELEASE: isProdLike ? "rel-1" : undefined,
        NODE_ENV: isProdLike ? "production" : undefined,
        BOBA_BEAR_DATABASE_URL: isProdLike
          ? "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear"
          : "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
        BOBA_BEAR_DATABASE_SSL_MODE: isProdLike ? "verify-full" : undefined,
      }),
    });
    expect(config.logLevel).toBe(expected);
  });

  it("an explicit valid value overrides the default", () => {
    const config = loadConfig({
      processKind: "web",
      source: source({ ...LOCAL_WEB_BASE, BOBA_BEAR_LOG_LEVEL: "error" }),
    });
    expect(config.logLevel).toBe("error");
  });

  it("rejects an invalid log level", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({ ...LOCAL_WEB_BASE, BOBA_BEAR_LOG_LEVEL: "verbose" }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_LOG_LEVEL")).toBe(true);
  });
});

describe("loadConfig — BOBA_BEAR_RELEASE", () => {
  it("is optional locally", () => {
    const config = loadConfig({
      processKind: "web",
      source: source(LOCAL_WEB_BASE),
    });
    expect(config.release).toBeNull();
  });

  it("is required in staging", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "staging",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://staging.thebobabear.in",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_RELEASE")).toBe(true);
  });

  it("is required in production", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_RELEASE")).toBe(true);
  });

  it("rejects a release value containing whitespace", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({ ...LOCAL_WEB_BASE, BOBA_BEAR_RELEASE: "has space" }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_RELEASE")).toBe(true);
  });

  it("rejects a release value longer than 128 characters", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({ ...LOCAL_WEB_BASE, BOBA_BEAR_RELEASE: "a".repeat(129) }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_RELEASE")).toBe(true);
  });
});

describe("loadConfig — BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS", () => {
  it.each([
    ["local", true],
    ["test", true],
    ["ci", false],
  ] as const)("defaults to %s -> %s when omitted", (environment, expected) => {
    const config = loadConfig({
      processKind: "web",
      source: source({
        BOBA_BEAR_ENV: environment,
        BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
      }),
    });
    expect(config.allowUnsafeAdapters).toBe(expected);
  });

  it("defaults to false in staging and production", () => {
    for (const environment of ["staging", "production"] as const) {
      const config = loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: environment,
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
          BOBA_BEAR_DATABASE_URL:
            "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear",
          BOBA_BEAR_DATABASE_SSL_MODE: "verify-full",
        }),
      });
      expect(config.allowUnsafeAdapters).toBe(false);
    }
  });

  it("rejects an explicit true in staging", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "staging",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://staging.thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
          BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS")).toBe(true);
  });

  it("rejects an explicit true in production", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
          BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS")).toBe(true);
  });

  it.each(["1", "0", "yes", "no", "on", "off", "TRUE"])(
    "rejects non-strict boolean value %s",
    (value) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({
            ...LOCAL_WEB_BASE,
            BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: value,
          }),
        }),
      );
      expect(issues.some((i) => i.key === "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS")).toBe(true);
    },
  );
});

describe("loadConfig — PORT (web only)", () => {
  it("accepts a valid port", () => {
    const config = loadConfig({
      processKind: "web",
      source: source({ ...LOCAL_WEB_BASE, PORT: "4000" }),
    });
    expect(config.port).toBe(4000);
  });

  it("defaults to 3000 when omitted", () => {
    const config = loadConfig({
      processKind: "web",
      source: source(LOCAL_WEB_BASE),
    });
    expect(config.port).toBe(3000);
  });

  it.each(["0", "65536", "abc", "-1", "3000.5"])(
    "rejects invalid port %s",
    (port) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({ ...LOCAL_WEB_BASE, PORT: port }),
        }),
      );
      expect(issues.some((i) => i.key === "PORT")).toBe(true);
    },
  );

  it("does not expose a port field on worker config", () => {
    const config = loadConfig({
      processKind: "worker",
      source: source(LOCAL_WEB_BASE),
    });
    expect("port" in config).toBe(false);
  });

  it("does not expose a port field on migration config", () => {
    const config = loadConfig({
      processKind: "migration",
      source: source(LOCAL_WEB_BASE),
    });
    expect("port" in config).toBe(false);
  });
});

describe("loadConfig — unknown/unapproved variables", () => {
  it("rejects an unknown BOBA_BEAR_* variable", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_ENVIROMENT: "production",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_ENVIROMENT")).toBe(true);
  });

  it("ignores unknown generic environment variables", () => {
    const config = loadConfig({
      processKind: "web",
      source: source({
        ...LOCAL_WEB_BASE,
        PATH: "/usr/bin",
        HOME: "/home/example",
        CI: "true",
        GITHUB_SHA: "abc123",
      }),
    });
    expect(config.environment).toBe("local");
  });
});

describe("loadConfig — NODE_ENV consistency", () => {
  it("fails when production BOBA_BEAR_ENV has a mismatched NODE_ENV", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "development",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "NODE_ENV")).toBe(true);
  });

  it("fails when staging BOBA_BEAR_ENV has a mismatched NODE_ENV", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "staging",
          NODE_ENV: "test",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://staging.thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "NODE_ENV")).toBe(true);
  });

  it("allows a local build with NODE_ENV=production", () => {
    const config = loadConfig({
      processKind: "web",
      source: source({ ...LOCAL_WEB_BASE, NODE_ENV: "production" }),
    });
    expect(config.environment).toBe("local");
  });
});

describe("loadConfig — immutability", () => {
  it("returns a runtime-frozen configuration object", () => {
    const config = loadConfig({
      processKind: "web",
      source: source(LOCAL_WEB_BASE),
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(() => {
      (config as { port: number }).port = 9999;
    }).toThrow();
    expect(config.port).toBe(3000);
  });
});

describe("loadConfig — BOBA_BEAR_DATABASE_URL / BOBA_BEAR_DATABASE_MIGRATION_URL", () => {
  it("accepts a valid local application database URL (web)", () => {
    const config = loadConfig({
      processKind: "web",
      source: source(LOCAL_WEB_BASE),
    });
    expect(config.databaseUrl).toBe(
      "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    );
  });

  it("accepts a valid local migration database URL (migration)", () => {
    const config = loadConfig({
      processKind: "migration",
      source: source(LOCAL_WEB_BASE),
    });
    expect(config.databaseMigrationUrl).toBe(
      "postgresql://boba_bear_migrator@127.0.0.1:5433/boba_bear_local",
    );
  });

  it("web config does not expose a migration URL field", () => {
    const config = loadConfig({ processKind: "web", source: source(LOCAL_WEB_BASE) });
    expect("databaseMigrationUrl" in config).toBe(false);
  });

  it("worker config does not expose a migration URL field", () => {
    const config = loadConfig({ processKind: "worker", source: source(LOCAL_WEB_BASE) });
    expect("databaseMigrationUrl" in config).toBe(false);
  });

  it("migration config does not expose an application URL field", () => {
    const config = loadConfig({ processKind: "migration", source: source(LOCAL_WEB_BASE) });
    expect("databaseUrl" in config).toBe(false);
  });

  it("rejects a missing database URL for web", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a missing migration URL for migration", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "migration",
        source: source({
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_MIGRATION_URL")).toBe(true);
  });

  it('rejects the "postgres:" scheme (must be exactly "postgresql:")', () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "postgres://boba_bear_app@127.0.0.1:5433/boba_bear_local",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects http(s) schemes", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "https://boba_bear_app@127.0.0.1:5433/boba_bear_local",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a missing username", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "postgresql://127.0.0.1:5433/boba_bear_local",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a missing hostname", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@/boba_bear_local",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a missing database name", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects more than one path component", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL:
            "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local/extra",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a query string", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL:
            "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local?x=1",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects an embedded sslmode query parameter", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL:
            "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local?sslmode=require",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects a fragment", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL:
            "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local#top",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("rejects whitespace", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba bear",
        }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
  });

  it("never includes the raw URL in the issue message", () => {
    const SECRET_HOST = "do-not-leak-this-host.internal";
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({
          ...LOCAL_WEB_BASE,
          BOBA_BEAR_DATABASE_URL: `postgres://user:pw@${SECRET_HOST}/db`,
        }),
      }),
    );
    for (const issue of issues) {
      expect(issue.message).not.toContain(SECRET_HOST);
      expect(issue.message).not.toContain("pw");
    }
  });

  it.each(["local", "test", "ci"] as const)(
    "defaults BOBA_BEAR_DATABASE_SSL_MODE to disable in %s",
    (environment) => {
      const config = loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: environment,
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
          BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
        }),
      });
      expect(config.databaseSslMode).toBe("disable");
    },
  );

  it.each(["staging", "production"] as const)(
    "defaults BOBA_BEAR_DATABASE_SSL_MODE to verify-full in %s",
    (environment) => {
      const config = loadConfig({
        processKind: "web",
        source: source({
          BOBA_BEAR_ENV: environment,
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
          BOBA_BEAR_RELEASE: "rel-1",
          BOBA_BEAR_DATABASE_URL:
            "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear",
        }),
      });
      expect(config.databaseSslMode).toBe("verify-full");
    },
  );

  it.each(["staging", "production"] as const)(
    "rejects disable SSL mode in %s",
    (environment) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({
            BOBA_BEAR_ENV: environment,
            NODE_ENV: "production",
            BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
            BOBA_BEAR_RELEASE: "rel-1",
            BOBA_BEAR_DATABASE_URL:
              "postgresql://app_user:s3cret-pw@db.internal.example.com/boba_bear",
            BOBA_BEAR_DATABASE_SSL_MODE: "disable",
          }),
        }),
      );
      expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_SSL_MODE")).toBe(true);
    },
  );

  it.each(["staging", "production"] as const)(
    "rejects a loopback database host in %s",
    (environment) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({
            BOBA_BEAR_ENV: environment,
            NODE_ENV: "production",
            BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
            BOBA_BEAR_RELEASE: "rel-1",
            BOBA_BEAR_DATABASE_URL: "postgresql://app_user:s3cret-pw@127.0.0.1:5432/boba_bear",
            BOBA_BEAR_DATABASE_SSL_MODE: "verify-full",
          }),
        }),
      );
      expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
    },
  );

  it.each(["staging", "production"] as const)(
    "requires a password in %s",
    (environment) => {
      const issues = issuesOf(() =>
        loadConfig({
          processKind: "web",
          source: source({
            BOBA_BEAR_ENV: environment,
            NODE_ENV: "production",
            BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
            BOBA_BEAR_RELEASE: "rel-1",
            BOBA_BEAR_DATABASE_URL:
              "postgresql://app_user@db.internal.example.com/boba_bear",
            BOBA_BEAR_DATABASE_SSL_MODE: "verify-full",
          }),
        }),
      );
      expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_URL")).toBe(true);
    },
  );

  it("rejects an invalid SSL mode value", () => {
    const issues = issuesOf(() =>
      loadConfig({
        processKind: "web",
        source: source({ ...LOCAL_WEB_BASE, BOBA_BEAR_DATABASE_SSL_MODE: "require" }),
      }),
    );
    expect(issues.some((i) => i.key === "BOBA_BEAR_DATABASE_SSL_MODE")).toBe(true);
  });
});
