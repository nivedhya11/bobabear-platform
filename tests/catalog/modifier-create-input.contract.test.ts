/**
 * Generic catalog modifier create inputs must not accept caller-controlled IDs.
 */
import { describe, expect, it } from "vitest";

import type {
  AddModifierOptionToGroupInput,
  ApplyModifierGroupToVariantInput,
  CreateModifierGroupInput,
  CreateModifierOptionInput,
} from "../../src/server/catalog/types";

type WithoutOptionalId<T> = T & { id?: never };

describe("catalog modifier create input contracts", () => {
  it("createModifierGroup input type excludes caller-controlled id", () => {
    type Contract = CreateModifierGroupInput extends WithoutOptionalId<CreateModifierGroupInput>
      ? true
      : false;
    const contract: Contract = true;
    expect(contract).toBe(true);
  });

  it("createModifierOption input type excludes caller-controlled id", () => {
    type Contract = CreateModifierOptionInput extends WithoutOptionalId<CreateModifierOptionInput>
      ? true
      : false;
    const contract: Contract = true;
    expect(contract).toBe(true);
  });

  it("addModifierOptionToGroup input type excludes caller-controlled id", () => {
    type Contract = AddModifierOptionToGroupInput extends WithoutOptionalId<AddModifierOptionToGroupInput>
      ? true
      : false;
    const contract: Contract = true;
    expect(contract).toBe(true);
  });

  it("applyModifierGroupToVariant input type excludes caller-controlled id", () => {
    type Contract = ApplyModifierGroupToVariantInput extends WithoutOptionalId<ApplyModifierGroupToVariantInput>
      ? true
      : false;
    const contract: Contract = true;
    expect(contract).toBe(true);
  });
});
