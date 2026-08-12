/**
 * Operational availability domain tests (IMP-014).
 */
import { describe, expect, it } from "vitest";

import {
  getVariantAvailability,
  resolveModifierOptionAvailability,
  resolveOutletVariantAvailability,
  setModifierOptionAvailability,
  setVariantAvailability,
} from "../../src/server/assortment";
import {
  activateBundleGroup,
  activateBundleOption,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addBundleOption,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createBundleGroup,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  configureAlwaysAcceptingOutlet,
  createActiveStandardVariant,
  includeVariantAtBrand,
  nowInsideAcceptingWindow,
  withAssortmentDomain,
} from "./support";

describe("operational availability", () => {
  it("missing row is available; temp expiry and sold_out behave correctly", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, brandAdminActor, outletManagerActor, kitchenOperatorActor }) => {
        const catalog = await createActiveStandardVariant(
          persistence,
          brandAdminActor,
          tree.brand.id,
          "avail",
        );
        await includeVariantAtBrand(
          persistence,
          brandAdminActor,
          tree.brand.id,
          catalog.variantId,
        );
        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
        const now = nowInsideAcceptingWindow();

        const missing = await persistence.withContext((ctx) =>
          getVariantAvailability(ctx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            now,
          }),
        );
        expect(missing.persistedState).toBeNull();
        expect(missing.effectiveState).toBe("available");

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "temporarily_unavailable",
            unavailableUntil: null,
          }),
        );
        expect(
          (
            await persistence.withContext((ctx) =>
              getVariantAvailability(ctx, {
                actor: kitchenOperatorActor,
                outletId: tree.outletA.id,
                variantId: catalog.variantId,
                now,
              }),
            )
          ).effectiveState,
        ).toBe("temporarily_unavailable");

        const future = new Date(now.getTime() + 60 * 60 * 1000);
        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "temporarily_unavailable",
            unavailableUntil: future,
          }),
        );
        expect(
          (
            await persistence.withContext((ctx) =>
              getVariantAvailability(ctx, {
                actor: kitchenOperatorActor,
                outletId: tree.outletA.id,
                variantId: catalog.variantId,
                now,
              }),
            )
          ).effectiveState,
        ).toBe("temporarily_unavailable");

        const afterExpiry = new Date(future.getTime() + 1000);
        expect(
          (
            await persistence.withContext((ctx) =>
              getVariantAvailability(ctx, {
                actor: kitchenOperatorActor,
                outletId: tree.outletA.id,
                variantId: catalog.variantId,
                now: afterExpiry,
              }),
            )
          ).effectiveState,
        ).toBe("available");

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "sold_out",
          }),
        );
        const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        expect(
          (
            await persistence.withContext((ctx) =>
              getVariantAvailability(ctx, {
                actor: kitchenOperatorActor,
                outletId: tree.outletA.id,
                variantId: catalog.variantId,
                now: farFuture,
              }),
            )
          ).effectiveState,
        ).toBe("sold_out");
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now: farFuture },
            }),
          ),
        ).toEqual({ eligible: false, code: "VARIANT_SOLD_OUT" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "available",
          }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });
      },
    );
  });

  it("required Modifier Group becomes infeasible after filtering; feasible with capacity", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, brandAdminActor, outletManagerActor, kitchenOperatorActor }) => {
        const product = await persistence.transaction((tx) =>
          createProduct(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "mod-p",
            name: "Mod P",
            productKind: "standard",
          }),
        );
        const variant = await persistence.transaction((tx) =>
          createVariant(tx, {
            actor: brandAdminActor,
            productId: product.id,
            code: "default",
            name: "Default",
            isDefault: true,
            isSelectorVisible: false,
          }),
        );
        const group = await persistence.transaction((tx) =>
          createModifierGroup(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "top",
            name: "Top",
          }),
        );
        const optA = await persistence.transaction((tx) =>
          createModifierOption(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "a",
            name: "A",
          }),
        );
        const optB = await persistence.transaction((tx) =>
          createModifierOption(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "b",
            name: "B",
          }),
        );
        const bindA = await persistence.transaction((tx) =>
          addModifierOptionToGroup(tx, {
            actor: brandAdminActor,
            modifierGroupId: group.id,
            modifierOptionId: optA.id,
            minQuantity: 0,
            maxQuantity: 1,
            defaultQuantity: 1,
          }),
        );
        const bindB = await persistence.transaction((tx) =>
          addModifierOptionToGroup(tx, {
            actor: brandAdminActor,
            modifierGroupId: group.id,
            modifierOptionId: optB.id,
            minQuantity: 0,
            maxQuantity: 1,
            defaultQuantity: 0,
          }),
        );
        const vmg = await persistence.transaction((tx) =>
          applyModifierGroupToVariant(tx, {
            actor: brandAdminActor,
            variantId: variant.id,
            modifierGroupId: group.id,
            minTotalQuantity: 1,
            maxTotalQuantity: 2,
          }),
        );
        await persistence.transaction(async (tx) => {
          await activateModifierOption(tx, { actor: brandAdminActor, modifierOptionId: optA.id });
          await activateModifierOption(tx, { actor: brandAdminActor, modifierOptionId: optB.id });
          await activateModifierGroupOption(tx, {
            actor: brandAdminActor,
            modifierGroupOptionId: bindA.id,
          });
          await activateModifierGroupOption(tx, {
            actor: brandAdminActor,
            modifierGroupOptionId: bindB.id,
          });
          await activateModifierGroup(tx, { actor: brandAdminActor, modifierGroupId: group.id });
          await activateVariantModifierGroup(tx, {
            actor: brandAdminActor,
            variantModifierGroupId: vmg.id,
          });
          await activateVariant(tx, { actor: brandAdminActor, variantId: variant.id });
          await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
        });
        await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, variant.id);
        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
        const now = nowInsideAcceptingWindow();

        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction(async (tx) => {
          await setModifierOptionAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            modifierOptionId: optA.id,
            state: "sold_out",
          });
          await setModifierOptionAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            modifierOptionId: optB.id,
            state: "sold_out",
          });
        });

        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: false, code: "MODIFIER_CONFIGURATION_UNAVAILABLE" });

        await persistence.transaction((tx) =>
          setModifierOptionAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            modifierOptionId: optB.id,
            state: "available",
          }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });

        // Option-level resolve: sold_out / temp / available.
        expect(
          await persistence.withContext((ctx) =>
            resolveModifierOptionAvailability(ctx, {
              modifierOptionId: optA.id,
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: false, code: "DENIED" });

        const future = new Date(now.getTime() + 60_000);
        await persistence.transaction((tx) =>
          setModifierOptionAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            modifierOptionId: optA.id,
            state: "temporarily_unavailable",
            unavailableUntil: future,
          }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveModifierOptionAvailability(ctx, {
              modifierOptionId: optA.id,
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: false, code: "DENIED" });
        expect(
          await persistence.withContext((ctx) =>
            resolveModifierOptionAvailability(ctx, {
              modifierOptionId: optA.id,
              variantId: variant.id,
              outletId: tree.outletA.id,
              context: { now: new Date(future.getTime() + 1) },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });
      },
    );
  });

  it("Bundle required component unavailable / min selection impossible / sufficient choices", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, brandAdminActor, outletManagerActor, kitchenOperatorActor }) => {
        async function makeComponent(code: string) {
          const product = await persistence.transaction((tx) =>
            createProduct(tx, {
              actor: brandAdminActor,
              brandId: tree.brand.id,
              code: `${code}-p`,
              name: code,
              productKind: "standard",
            }),
          );
          const variant = await persistence.transaction((tx) =>
            createVariant(tx, {
              actor: brandAdminActor,
              productId: product.id,
              code: "default",
              name: "Default",
              isDefault: true,
              isSelectorVisible: false,
            }),
          );
          await persistence.transaction(async (tx) => {
            await activateVariant(tx, { actor: brandAdminActor, variantId: variant.id });
            await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
          });
          await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, variant.id);
          return variant.id;
        }

        const compA = await makeComponent("ca");
        const compB = await makeComponent("cb");

        const bundleProduct = await persistence.transaction((tx) =>
          createProduct(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "bun-p",
            name: "Bundle",
            productKind: "bundle",
          }),
        );
        const bundleVariant = await persistence.transaction((tx) =>
          createVariant(tx, {
            actor: brandAdminActor,
            productId: bundleProduct.id,
            code: "default",
            name: "Default",
            isDefault: true,
            isSelectorVisible: false,
          }),
        );
        const group = await persistence.transaction((tx) =>
          createBundleGroup(tx, {
            actor: brandAdminActor,
            bundleVariantId: bundleVariant.id,
            code: "pick",
            name: "Pick",
            minSelections: 1,
            maxSelections: 1,
          }),
        );
        const optA = await persistence.transaction((tx) =>
          addBundleOption(tx, {
            actor: brandAdminActor,
            bundleGroupId: group.id,
            componentVariantId: compA,
            quantity: 1,
            isDefault: true,
          }),
        );
        const optB = await persistence.transaction((tx) =>
          addBundleOption(tx, {
            actor: brandAdminActor,
            bundleGroupId: group.id,
            componentVariantId: compB,
            quantity: 1,
            isDefault: false,
          }),
        );
        await persistence.transaction(async (tx) => {
          await activateBundleOption(tx, { actor: brandAdminActor, bundleGroupOptionId: optA.id });
          await activateBundleOption(tx, { actor: brandAdminActor, bundleGroupOptionId: optB.id });
          await activateBundleGroup(tx, { actor: brandAdminActor, bundleGroupId: group.id });
          await activateVariant(tx, { actor: brandAdminActor, variantId: bundleVariant.id });
          await activateProduct(tx, { actor: brandAdminActor, productId: bundleProduct.id });
        });
        await includeVariantAtBrand(
          persistence,
          brandAdminActor,
          tree.brand.id,
          bundleVariant.id,
        );
        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
        const now = nowInsideAcceptingWindow();

        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: bundleVariant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: compA,
            state: "sold_out",
          }),
        );
        // One component remains — still feasible.
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: bundleVariant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: compB,
            state: "sold_out",
          }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: bundleVariant.id,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toEqual({ eligible: false, code: "BUNDLE_COMPONENT_UNAVAILABLE" });
      },
    );
  });
});
