/**
 * Unit tests for customer Menu projection composition (IMP-028B).
 */
import { describe, expect, it } from "vitest";

import { effectiveEntryDisplay } from "../../catalog/menu/reads";

describe("customer menu projection helpers", () => {
  it("effectiveEntryDisplay prefers entry overrides over product fields", () => {
    expect(
      effectiveEntryDisplay(
        { displayName: "Menu Name", displayDescription: "Menu description" },
        { name: "Product Name", description: "Product description" },
      ),
    ).toEqual({ name: "Menu Name", description: "Menu description" });

    expect(
      effectiveEntryDisplay(
        { displayName: null, displayDescription: null },
        { name: "Product Name", description: "Product description" },
      ),
    ).toEqual({ name: "Product Name", description: "Product description" });
  });
});
