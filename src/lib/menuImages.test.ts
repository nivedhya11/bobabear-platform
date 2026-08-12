import { describe, expect, it } from "vitest";
import { MENU_IMAGES } from "./menuImages";

// The full menu/image-completeness contract (every menu.json item resolves to
// an existing file on disk) is owned by `npm run audit:menu-images` — this
// test only checks the shape and a few representative, stable entries so a
// refactor of menuImages.ts can't silently break the export's contract.
describe("MENU_IMAGES", () => {
  it("is exported as a non-empty object of string → string entries", () => {
    expect(typeof MENU_IMAGES).toBe("object");
    expect(MENU_IMAGES).not.toBeNull();

    const entries = Object.entries(MENU_IMAGES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(typeof key).toBe("string");
      expect(typeof value).toBe("string");
    }
  });

  it("maps every value under the public /assets/menu/ path", () => {
    for (const value of Object.values(MENU_IMAGES)) {
      expect(value.startsWith("/assets/menu/")).toBe(true);
    }
  });

  it("resolves a representative known key to its expected image path", () => {
    expect(MENU_IMAGES["Hong Kong Milk Tea Boba"]).toBe(
      "/assets/menu/Hong_Kong_Milk_Tea_Boba.jpeg",
    );
    expect(MENU_IMAGES["Steamed Veg Momos"]).toBe(
      "/assets/menu/Steamed_Veg_Momos.jpg",
    );
  });

  it("does not map an unknown item (falls back to the Aurora card in MenuCard)", () => {
    expect(MENU_IMAGES["Not A Real Menu Item"]).toBeUndefined();
  });
});
