/**
 * Unit tests for the pure env-file helpers backing
 * scripts/database/init-local-env.mjs (IMP-004). These tests exercise the
 * shared, dependency-free `.mjs` module directly — no Docker, no real
 * filesystem writes to the developer's actual .env.local.
 */
import { describe, expect, it } from "vitest";

import {
  extractValues,
  generatePassword,
  parseEnvFile,
  upsertEnvValues,
} from "../../../scripts/database/lib/env-file.mjs";

describe("parseEnvFile / extractValues", () => {
  it("extracts declared keys", () => {
    const content = "FOO=bar\nBAZ=qux\n";
    const result = extractValues(parseEnvFile(content));
    expect(result).toEqual({ ok: true, values: { FOO: "bar", BAZ: "qux" } });
  });

  it("ignores comments and blank lines", () => {
    const content = "# a comment\n\nFOO=bar\n  # indented comment\n";
    const result = extractValues(parseEnvFile(content));
    expect(result).toEqual({ ok: true, values: { FOO: "bar" } });
  });

  it("treats a repeated key with the same value as fine", () => {
    const content = "FOO=bar\nFOO=bar\n";
    const result = extractValues(parseEnvFile(content));
    expect(result).toEqual({ ok: true, values: { FOO: "bar" } });
  });

  it("rejects a repeated key with conflicting values (malformed)", () => {
    const content = "FOO=bar\nFOO=different\n";
    const result = extractValues(parseEnvFile(content));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.key).toBe("FOO");
  });
});

describe("upsertEnvValues", () => {
  it("creates required keys when the file is empty", () => {
    const updated = upsertEnvValues("", { FOO: "1", BAR: "2" });
    expect(updated).toContain("FOO=1");
    expect(updated).toContain("BAR=2");
  });

  it("preserves unrelated existing lines exactly (IMP-003 keys stay intact)", () => {
    const content = "# a header comment\nBOBA_BEAR_ENV=local\n";
    const updated = upsertEnvValues(content, { BOBA_BEAR_DATABASE_URL: "value" });
    expect(updated).toContain("# a header comment");
    expect(updated).toContain("BOBA_BEAR_ENV=local");
    expect(updated).toContain("BOBA_BEAR_DATABASE_URL=value");
  });

  it("updates only the targeted key, leaving its position and everything else untouched", () => {
    const content = "A=1\nB=2\nC=3\n";
    const updated = upsertEnvValues(content, { B: "changed" });
    expect(updated).toBe("A=1\nB=changed\nC=3\n");
  });

  it("does not rotate an untouched key across repeated calls with the same updates", () => {
    const content = "SECRET=original-value\n";
    const first = upsertEnvValues(content, { SECRET: "original-value" });
    const second = upsertEnvValues(first, { SECRET: "original-value" });
    expect(second).toBe("SECRET=original-value\n");
  });
});

describe("generatePassword", () => {
  it("produces URL-safe characters only", () => {
    const password = generatePassword(64);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("produces the requested length", () => {
    expect(generatePassword(16)).toHaveLength(16);
    expect(generatePassword(40)).toHaveLength(40);
  });

  it("generates distinct passwords across calls (distinct role credentials)", () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generatePassword(32)));
    expect(passwords.size).toBe(10);
  });
});
