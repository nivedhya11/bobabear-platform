import { describe, expect, it } from "vitest";

import { PUBLIC_ALLOWLIST, resolvePublicConfig } from "./public-config";

describe("resolvePublicConfig", () => {
  it("has an empty approved allowlist in this slice", () => {
    expect(PUBLIC_ALLOWLIST.size).toBe(0);
  });

  it("resolves to an empty object when no NEXT_PUBLIC_* variable is present", () => {
    const result = resolvePublicConfig({ SOME_OTHER_VAR: "x" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual({});
    }
  });

  it("resolves to an empty object even when legacy pre-existing NEXT_PUBLIC_* variables are present", () => {
    // These predate the config boundary and are documented as an explicit,
    // narrow exception (see LEGACY_NEXT_PUBLIC_KEYS in public-config.ts).
    const result = resolvePublicConfig({
      NEXT_PUBLIC_SITE_URL: "https://thebobabear.in",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-XXXXXXXXXX",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual({});
    }
  });

  it("rejects an undeclared NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", () => {
    const result = resolvePublicConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "must-never-be-public",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.key).toBe("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    }
  });

  it("rejects an undeclared NEXT_PUBLIC_* variable", () => {
    const result = resolvePublicConfig({
      NEXT_PUBLIC_SOMETHING_NEW: "value",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ key: "NEXT_PUBLIC_SOMETHING_NEW" }),
      ]);
    }
  });

  it("does not let a server-only field pass through as public config", () => {
    const result = resolvePublicConfig({
      BOBA_BEAR_PUBLIC_ORIGIN: "https://thebobabear.in",
      BOBA_BEAR_RELEASE: "rel-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.config)).toHaveLength(0);
    }
  });

  it("returns a frozen config object", () => {
    const result = resolvePublicConfig({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.config)).toBe(true);
    }
  });
});
