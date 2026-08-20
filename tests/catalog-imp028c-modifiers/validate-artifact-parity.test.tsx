/**
 * IMP-028C modifier bootstrap artifact validation parity (Slice 4).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG_QUANTITY_MAX } from "../../src/shared/catalog";
import {
  Imp028cModifiersBootstrapError,
  loadImp028cModifiersArtifact,
  validateImp028cModifiersArtifactStructure,
} from "../../src/server/catalog/imp028c-modifiers";

const projectRoot = process.cwd();

function loadRawArtifact(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      path.join(projectRoot, "data/platform/catalog/imp028c-hong-kong-modifiers-v1.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
}

function cloneArtifact(): Record<string, unknown> {
  return structuredClone(loadRawArtifact());
}

function expectValidationReject(mutator: (artifact: Record<string, unknown>) => void): void {
  const artifact = cloneArtifact();
  mutator(artifact);
  expect(() => validateImp028cModifiersArtifactStructure(artifact)).toThrow(
    Imp028cModifiersBootstrapError,
  );
}

describe("IMP-028C modifier artifact catalog validation parity", () => {
  it("accepts the checked-in artifact", () => {
    const artifact = loadImp028cModifiersArtifact(projectRoot);
    expect(artifact.modifier_options).toHaveLength(3);
  });

  it("A: rejects defaultQuantity below minQuantity", () => {
    expectValidationReject((artifact) => {
      const options = artifact.modifier_options as Array<Record<string, unknown>>;
      const binding = (options[0]!.binding as Record<string, unknown>);
      binding.min_quantity = 2;
      binding.default_quantity = 1;
      binding.max_quantity = 2;
    });
  });

  it("B: rejects maxQuantity above CATALOG_QUANTITY_MAX", () => {
    expectValidationReject((artifact) => {
      const options = artifact.modifier_options as Array<Record<string, unknown>>;
      const binding = (options[0]!.binding as Record<string, unknown>);
      binding.max_quantity = CATALOG_QUANTITY_MAX + 1;
    });
  });

  it("C: rejects defaultQuantity above maxQuantity", () => {
    expectValidationReject((artifact) => {
      const options = artifact.modifier_options as Array<Record<string, unknown>>;
      const binding = (options[0]!.binding as Record<string, unknown>);
      binding.min_quantity = 0;
      binding.max_quantity = 1;
      binding.default_quantity = 2;
    });
  });

  it("D: rejects minQuantity above maxQuantity", () => {
    expectValidationReject((artifact) => {
      const options = artifact.modifier_options as Array<Record<string, unknown>>;
      const binding = (options[0]!.binding as Record<string, unknown>);
      binding.min_quantity = 2;
      binding.max_quantity = 1;
      binding.default_quantity = 1;
    });
  });

  it("E: rejects invalid variant group min/max totals", () => {
    expectValidationReject((artifact) => {
      const vmg = artifact.variant_modifier_group as Record<string, unknown>;
      vmg.min_total_quantity = 5;
      vmg.max_total_quantity = 3;
    });
  });

  it("rejects variant group maxTotalQuantity above CATALOG_QUANTITY_MAX", () => {
    expectValidationReject((artifact) => {
      const vmg = artifact.variant_modifier_group as Record<string, unknown>;
      vmg.max_total_quantity = CATALOG_QUANTITY_MAX + 1;
    });
  });

  it("rejects aggregate default totals outside variant group bounds", () => {
    expectValidationReject((artifact) => {
      const vmg = artifact.variant_modifier_group as Record<string, unknown>;
      vmg.min_total_quantity = 5;
      vmg.max_total_quantity = 10;
    });
  });
});
