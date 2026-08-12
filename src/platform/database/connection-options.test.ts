import { describe, expect, it } from "vitest";

import {
  assertSafeApplicationName,
  createConnectionOptions,
  toSafeConnectionOptionsSummary,
} from "./connection-options";

const SECRET_CONNECTION_STRING =
  "postgresql://boba_bear_app:DO_NOT_LEAK_DATABASE_SECRET_94817@127.0.0.1:5433/boba_bear_local";

describe("createConnectionOptions", () => {
  it('"disable" produces no TLS configuration', () => {
    const options = createConnectionOptions({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "disable",
      applicationName: "boba-bear-test",
    });
    expect(options.ssl).toBeUndefined();
  });

  it('"verify-full" enables full certificate verification', () => {
    const options = createConnectionOptions({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "verify-full",
      applicationName: "boba-bear-test",
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('"verify-full" never sets rejectUnauthorized to false', () => {
    const options = createConnectionOptions({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "verify-full",
      applicationName: "boba-bear-test",
    });
    expect((options.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(true);
  });

  it("applies bounded pool defaults when not overridden", () => {
    const options = createConnectionOptions({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "disable",
      applicationName: "boba-bear-test",
    });
    expect(options.max).toBe(1);
    expect(options.connectionTimeoutMillis).toBe(5000);
    expect(options.idleTimeoutMillis).toBe(1000);
  });

  it("honors explicit pool overrides", () => {
    const options = createConnectionOptions({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "disable",
      applicationName: "boba-bear-test",
      poolSize: 5,
      connectionTimeoutMillis: 9000,
      idleTimeoutMillis: 2000,
    });
    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBe(9000);
    expect(options.idleTimeoutMillis).toBe(2000);
  });

  it("rejects an unsafe application_name", () => {
    expect(() =>
      createConnectionOptions({
        connectionString: SECRET_CONNECTION_STRING,
        sslMode: "disable",
        applicationName: "not safe; has spaces",
      }),
    ).toThrow();
  });
});

describe("assertSafeApplicationName", () => {
  it("accepts short, safe identifiers", () => {
    expect(() => assertSafeApplicationName("boba-bear-migrate")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertSafeApplicationName("")).toThrow();
  });

  it("rejects a value longer than 63 characters", () => {
    expect(() => assertSafeApplicationName("a".repeat(64))).toThrow();
  });
});

describe("toSafeConnectionOptionsSummary", () => {
  it("never includes the raw connection string", () => {
    const summary = toSafeConnectionOptionsSummary({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "verify-full",
      applicationName: "boba-bear-test",
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("DO_NOT_LEAK_DATABASE_SECRET_94817");
    expect(serialized).not.toContain(SECRET_CONNECTION_STRING);
  });

  it("reflects sslEnabled per SSL mode", () => {
    const disabled = toSafeConnectionOptionsSummary({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "disable",
      applicationName: "boba-bear-test",
    });
    const enabled = toSafeConnectionOptionsSummary({
      connectionString: SECRET_CONNECTION_STRING,
      sslMode: "verify-full",
      applicationName: "boba-bear-test",
    });
    expect(disabled.sslEnabled).toBe(false);
    expect(enabled.sslEnabled).toBe(true);
  });
});
