/**
 * Resolver decision-code ordering and immediate re-evaluation (IMP-014).
 */
import { describe, expect, it } from "vitest";

import {
  excludeVariantAtScope,
  pauseOutlet,
  resolveOutletVariantAvailability,
  resumeOutlet,
  retireAssortmentRule,
  setVariantAvailability,
  suspendOutlet,
  unsuspendOutlet,
  replaceOutletOperatingSchedule,
  configureOutletOperatingProfile,
} from "../../src/server/assortment";
import {
  configureAlwaysAcceptingOutlet,
  createActiveStandardVariant,
  findInstantForLocalWallClock,
  includeVariantAtBrand,
  nowInsideAcceptingWindow,
  withAssortmentDomain,
} from "./support";

describe("resolver ordering and immediate re-evaluation", () => {
  it("emits explicit decision codes in prompt §86 order for successive failures", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, brandAdminActor, outletManagerActor, kitchenOperatorActor }) => {
        const catalog = await createActiveStandardVariant(
          persistence,
          brandAdminActor,
          tree.brand.id,
          "ord",
        );
        const now = nowInsideAcceptingWindow();

        // 1. No include
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "ASSORTMENT_NOT_INCLUDED" });

        await includeVariantAtBrand(
          persistence,
          brandAdminActor,
          tree.brand.id,
          catalog.variantId,
        );

        // 2. Missing operating config
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OPERATING_CONFIGURATION_MISSING" });

        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);

        // 3. Brand exclusion
        const brandEx = await persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "brand",
            variantId: catalog.variantId,
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
        ).toMatchObject({ code: "ASSORTMENT_EXCLUDED_BRAND" });
        await persistence.transaction((tx) =>
          retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: brandEx.id }),
        );

        // 4. Territory exclusion
        const terrEx = await persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "territory",
            territoryId: tree.terrA.id,
            variantId: catalog.variantId,
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
        ).toMatchObject({ code: "ASSORTMENT_EXCLUDED_TERRITORY" });
        await persistence.transaction((tx) =>
          retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: terrEx.id }),
        );

        // 5. Organization exclusion
        const orgEx = await persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "organization",
            organizationId: tree.orgA.id,
            variantId: catalog.variantId,
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
        ).toMatchObject({ code: "ASSORTMENT_EXCLUDED_ORGANIZATION" });
        await persistence.transaction((tx) =>
          retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: orgEx.id }),
        );

        // 6. Outlet exclusion
        const outEx = await persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "outlet",
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
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
        ).toMatchObject({ code: "ASSORTMENT_EXCLUDED_OUTLET" });
        await persistence.transaction((tx) =>
          retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: outEx.id }),
        );

        // 7. Pause / suspend / schedule / sold out
        await persistence.transaction((tx) =>
          pauseOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_PAUSED" });
        await persistence.transaction((tx) =>
          resumeOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
        );

        await persistence.transaction((tx) =>
          suspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_SUSPENDED" });
        await persistence.transaction((tx) =>
          unsuspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );

        await persistence.transaction(async (tx) => {
          await configureOutletOperatingProfile(tx, {
            actor: outletManagerActor,
            outletId: tree.outletA.id,
            timezone: "Asia/Kolkata",
          });
          await replaceOutletOperatingSchedule(tx, {
            actor: outletManagerActor,
            outletId: tree.outletA.id,
            intervals: [{ dayOfWeek: 2, startMinute: 600, endMinute: 700 }],
          });
        });
        const closedNow = findInstantForLocalWallClock("Asia/Kolkata", 2, 800);
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now: closedNow },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_CLOSED_BY_SCHEDULE" });

        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "temporarily_unavailable",
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
        ).toMatchObject({ code: "VARIANT_TEMPORARILY_UNAVAILABLE" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "sold_out",
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
        ).toMatchObject({ code: "VARIANT_SOLD_OUT" });

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

  it("immediate re-evaluation without restart after mutations", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, brandAdminActor, outletManagerActor, kitchenOperatorActor }) => {
        const catalog = await createActiveStandardVariant(
          persistence,
          brandAdminActor,
          tree.brand.id,
          "reeval",
        );
        await includeVariantAtBrand(
          persistence,
          brandAdminActor,
          tree.brand.id,
          catalog.variantId,
        );
        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
        const now = nowInsideAcceptingWindow();

        const resolve = () =>
          persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now },
            }),
          );

        expect(await resolve()).toEqual({ eligible: true, code: "AVAILABLE" });

        const exclusion = await persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "outlet",
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
          }),
        );
        expect(await resolve()).toMatchObject({ code: "ASSORTMENT_EXCLUDED_OUTLET" });

        await persistence.transaction((tx) =>
          retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: exclusion.id }),
        );
        expect(await resolve()).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "sold_out",
          }),
        );
        expect(await resolve()).toMatchObject({ code: "VARIANT_SOLD_OUT" });

        await persistence.transaction((tx) =>
          setVariantAvailability(tx, {
            actor: kitchenOperatorActor,
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
            state: "available",
          }),
        );
        expect(await resolve()).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          pauseOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
        );
        expect(await resolve()).toMatchObject({ code: "OUTLET_PAUSED" });

        await persistence.transaction((tx) =>
          resumeOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
        );
        expect(await resolve()).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          suspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );
        expect(await resolve()).toMatchObject({ code: "OUTLET_SUSPENDED" });

        await persistence.transaction((tx) =>
          unsuspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );
        expect(await resolve()).toEqual({ eligible: true, code: "AVAILABLE" });

        await persistence.transaction((tx) =>
          replaceOutletOperatingSchedule(tx, {
            actor: outletManagerActor,
            outletId: tree.outletA.id,
            intervals: [{ dayOfWeek: 0, startMinute: 0, endMinute: 1 }],
          }),
        );
        // Most wall-clock times will be closed; use a known outside minute.
        const closed = findInstantForLocalWallClock("Asia/Kolkata", 0, 100);
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletVariantAvailability(ctx, {
              variantId: catalog.variantId,
              outletId: tree.outletA.id,
              context: { now: closed },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_CLOSED_BY_SCHEDULE" });
      },
    );
  });
});
