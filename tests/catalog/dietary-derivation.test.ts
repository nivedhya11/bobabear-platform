import { describe, expect, it } from "vitest";

import { deriveBundleDietaryInputs } from "../../src/shared/catalog";

describe("deriveBundleDietaryInputs", () => {
  it("unions and sorts unique tag ids/codes from components and modifiers", () => {
    const result = deriveBundleDietaryInputs({
      componentVariantTags: [
        { id: "b", code: "dairy" },
        { id: "a", code: "veg" },
      ],
      modifierOptionTags: [
        { id: "a", code: "veg" },
        { id: "c", code: "nuts" },
      ],
    });
    expect(result.tagIds).toEqual(["a", "b", "c"]);
    expect(result.tagCodes).toEqual(["dairy", "nuts", "veg"]);
  });

  it("skips empty refs and does not invent persistence", () => {
    const result = deriveBundleDietaryInputs({
      componentVariantTags: [{ id: "", code: "x" }, { id: "a", code: "" }],
      modifierOptionTags: [],
    });
    expect(result.tagIds).toEqual([]);
    expect(result.tagCodes).toEqual([]);
  });
});
