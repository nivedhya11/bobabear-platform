/**
 * IMP-036C required Topping bootstrap + customization UX integration tests.
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { MenuItemCustomizationDialog } from "../../src/components/ordering/MenuItemCustomizationDialog";
import { bootstrapExistingMenuAssortment } from "../../src/server/assortment/bootstrap";
import {
  bootstrapImp028cModifiers,
  validateImp028cModifiersArtifactStructure,
  type Imp028cModifiersArtifact,
} from "../../src/server/catalog/imp028c-modifiers";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import { bootstrapExistingMenuPricing } from "../../src/server/pricing/bootstrap";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  HONG_KONG_MILK_TEA_BASE_PRICE_PAISE,
  HONG_KONG_MILK_TEA_PRODUCT_CODE,
} from "../../src/shared/catalog/imp028c-modifiers/constants";
import {
  adminConnectionInfo,
  applicationConfig,
} from "../assortment-availability/support";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

const projectRoot = process.cwd();
const AT = new Date("2026-08-09T12:00:00.000Z");
const IMP036C_ARTIFACT_PATH = "data/platform/catalog/imp036c-hong-kong-required-topping-v1.json";

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  cleanup();
  await Promise.all(openHandles.splice(0).map((handle) => handle.close()));
});

function loadImp036cArtifact(): Imp028cModifiersArtifact {
  const raw = JSON.parse(
    readFileSync(path.join(projectRoot, IMP036C_ARTIFACT_PATH), "utf8"),
  ) as Record<string, unknown>;
  if (raw.import_id !== "imp036c-hong-kong-required-topping-v1" || raw.version !== 1) {
    throw new Error("Unexpected IMP-036C required Topping artifact identity.");
  }
  return validateImp028cModifiersArtifactStructure({
    ...raw,
    import_id: "imp028c-hong-kong-modifiers-v1",
    version: 1,
  });
}

async function withFreshMenuChain<T>(
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    await runExistingMenuImport({ projectRoot, persistence, apply: true });
    await bootstrapExistingMenuAssortment({ projectRoot, persistence, apply: true });
    await bootstrapExistingMenuPricing({ projectRoot, persistence, apply: true });
    return fn(persistence);
  });
}

async function bootstrapBothModifierGroups(
  persistence: ReturnType<typeof getApplicationPersistence>,
): Promise<{ brandId: string; variantId: string }> {
  const imp028c = await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
  const imp036c = await bootstrapImp028cModifiers({
    projectRoot,
    persistence,
    apply: true,
    artifact: loadImp036cArtifact(),
  });
  expect(imp036c.outcome).toBe("APPLIED");
  return { brandId: imp028c.brandId, variantId: imp028c.variantId };
}

describe("IMP-036C required Topping bootstrap", () => {
  it("dry-run reports seven planned records", async () => {
    await withFreshMenuChain(async (persistence) => {
      await bootstrapImp028cModifiers({ projectRoot, persistence, apply: true });
      const result = await bootstrapImp028cModifiers({
        projectRoot,
        persistence,
        apply: false,
        artifact: loadImp036cArtifact(),
      });
      expect(result.mode).toBe("dry-run");
      expect(result.outcome).toBe("WOULD_CREATE");
      expect(result.counts.created).toBe(7);
      expect(result.counts.conflicts).toBe(0);
    });
  });

  it("rejects paid default selections (D-369)", () => {
    const artifact = loadImp036cArtifact();
    expect(
      artifact.modifier_options.some(
        (entry) => entry.price.price_delta_paise > 0 && entry.binding.default_quantity !== 0,
      ),
    ).toBe(false);
  });

  it("preserves Founder-required Topping semantics", () => {
    const artifact = loadImp036cArtifact();
    expect(artifact.modifier_group.name).toBe("Topping");
    expect(artifact.variant_modifier_group.min_total_quantity).toBe(1);
    expect(artifact.variant_modifier_group.max_total_quantity).toBe(1);
    const extraIce = artifact.modifier_options.find((entry) => entry.option.name === "Extra Ice")!;
    const cheeseFoam = artifact.modifier_options.find((entry) => entry.option.name === "Cheese Foam")!;
    const expressoShot = artifact.modifier_options.find((entry) => entry.option.name === "Expresso Shot")!;
    expect(extraIce.price.price_delta_paise).toBe(0);
    expect(extraIce.binding.default_quantity).toBe(1);
    expect(cheeseFoam.price.price_delta_paise).toBe(2000);
    expect(cheeseFoam.binding.default_quantity).toBe(0);
    expect(expressoShot.price.price_delta_paise).toBe(2000);
    expect(expressoShot.binding.default_quantity).toBe(0);
  });

  it("coexists with IMP-028C optional Toppings & Extras on customer menu projection", async () => {
    await withFreshMenuChain(async (persistence) => {
      const { brandId, variantId } = await bootstrapBothModifierGroups(persistence);
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === variantId)!;
      expect(item.modifierGroups).toHaveLength(2);
      const optional = item.modifierGroups!.find((group) => group.name === "Toppings & Extras")!;
      const required = item.modifierGroups!.find((group) => group.name === "Topping")!;
      expect(optional.required).toBe(false);
      expect(required.required).toBe(true);
      expect(required.minTotalQuantity).toBe(1);
      expect(required.maxTotalQuantity).toBe(1);
      expect(required.options.map((option) => option.name)).toEqual([
        "Extra Ice",
        "Cheese Foam",
        "Expresso Shot",
      ]);
      expect(required.options.find((option) => option.name === "Extra Ice")!.displayPriceDeltaPaise).toBe(0);
      expect(required.options.find((option) => option.name === "Cheese Foam")!.displayPriceDeltaPaise).toBe(2000);
      expect(required.options.find((option) => option.name === "Expresso Shot")!.displayPriceDeltaPaise).toBe(2000);
    });
  });
});

describe("IMP-036C required Topping customization UX", () => {
  it("defaults Extra Ice, replaces single-select choices, and blocks zero-selection submit", async () => {
    const user = userEvent.setup();
    await withFreshMenuChain(async (persistence) => {
      const { brandId, variantId } = await bootstrapBothModifierGroups(persistence);
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === variantId)!;
      render(
        <MenuItemCustomizationDialog
          item={item}
          mode="add"
          pending={false}
          error={null}
          onClose={() => {}}
          onAdd={() => {}}
        />,
      );

      const extraIce = screen.getByRole("checkbox", { name: /extra ice/i });
      const cheeseFoam = screen.getByRole("checkbox", { name: /cheese foam/i });
      const expressoShot = screen.getByRole("checkbox", { name: /expresso shot/i });
      const classicBoba = screen.getByRole("checkbox", { name: /classic boba/i });

      expect(extraIce).toBeChecked();
      expect(cheeseFoam).not.toBeChecked();
      expect(expressoShot).not.toBeChecked();
      expect(classicBoba).toBeChecked();

      await user.click(cheeseFoam);
      expect(extraIce).not.toBeChecked();
      expect(cheeseFoam).toBeChecked();
      expect(screen.getByRole("button", { name: /add to cart · ₹259/i })).toBeEnabled();

      await user.click(expressoShot);
      expect(cheeseFoam).not.toBeChecked();
      expect(expressoShot).toBeChecked();
      expect(screen.getByRole("button", { name: /add to cart · ₹259/i })).toBeEnabled();

      await user.click(expressoShot);
      expect(expressoShot).not.toBeChecked();
      expect(screen.getByRole("button", { name: /add to cart · ₹239/i })).toBeDisabled();
    });
  });

  it("keeps optional Toppings & Extras independent from required Topping selection", async () => {
    const user = userEvent.setup();
    await withFreshMenuChain(async (persistence) => {
      const { brandId, variantId } = await bootstrapBothModifierGroups(persistence);
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === variantId)!;
      render(
        <MenuItemCustomizationDialog
          item={item}
          mode="add"
          pending={false}
          error={null}
          onClose={() => {}}
          onAdd={() => {}}
        />,
      );

      const optionalGroup = screen.getByText(/Toppings & Extras/).closest("fieldset")!;
      const classicBoba = within(optionalGroup).getByRole("checkbox", { name: /classic boba/i });
      const extraBoba = within(optionalGroup).getByRole("checkbox", { name: /extra boba/i });
      expect(classicBoba).toBeChecked();
      expect(extraBoba).not.toBeChecked();

      await user.click(extraBoba);
      expect(classicBoba).toBeChecked();
      expect(extraBoba).toBeChecked();
    });
  });
});

describe("IMP-036C pricing presentation", () => {
  it("keeps Hong Kong Milk Tea base price unchanged with required default", () => {
    expect(HONG_KONG_MILK_TEA_BASE_PRICE_PAISE).toBe(23_900);
    expect(HONG_KONG_MILK_TEA_PRODUCT_CODE).toBe("hong-kong-milk-tea-boba");
  });
});
