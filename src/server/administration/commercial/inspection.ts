/**
 * Coherent commercial inspection projection (US-IMP-036F-001 / US-014 / US-016).
 *
 * Composes authoritative domain reads. No consolidated commercial truth store.
 * CATALOG != MENU != MONEY; ASSORTMENT != AVAILABILITY; tariff != serviceability.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { catalogVariantsTable } from "../../../platform/database/schema/catalog";
import {
  projectProductInspection,
  projectVariantInspection,
} from "../../catalog/inspection";
import { getBrandCatalogProduct, getBrandCatalogProductGraph } from "../../catalog/reads";
import { findVariantById } from "../../catalog/variants";
import { listBrandMenus, getBrandMenuInspection } from "../../catalog/menu/inspection";
import { inspectBrandVariantAssortment } from "../../assortment/commercial-reads";
import {
  getVariantAvailability,
  loadEffectiveVariantAvailabilityState,
} from "../../assortment/availability";
import { resolveOutletOperatingState } from "../../assortment/resolve-operating";
import { findOutletOperatingProfile, listOutletOperatingIntervals } from "../../assortment/operating";
import { resolveOutletVariantPrice } from "../../pricing/resolve-price";
import { PricingResolutionError } from "../../pricing/errors";
import { readOutletDeliveryTariff } from "../../pricing/delivery-tariff";
import { listBrandPromotions } from "../../promotions/commercial-reads";
import type { PersistenceQueryContext } from "../../persistence/types";
import { AdministrationError } from "../errors";
import {
  assertCommercialUuid,
  requireAnyBrandCommercialRead,
  requireOutletInBrand,
  softAuthorizeBrandPermission,
  softAuthorizeOutletPermission,
  unavailableSection,
} from "./soft-auth";
import type { ComposedSection } from "./types";
import { inspectTaxChargesContext } from "./tax-charges-context";

export type CommercialInspectionResult = Readonly<{
  brandId: string;
  variantId: string;
  productId: string | null;
  outletId: string | null;
  catalog: ComposedSection<Readonly<Record<string, unknown>>>;
  menu: ComposedSection<Readonly<Record<string, unknown>>>;
  assortment: ComposedSection<Readonly<Record<string, unknown>>>;
  availability: ComposedSection<Readonly<Record<string, unknown>>>;
  operating: ComposedSection<Readonly<Record<string, unknown>>>;
  pricing: ComposedSection<Readonly<Record<string, unknown>>>;
  promotions: ComposedSection<Readonly<Record<string, unknown>>>;
  deliveryTariff: ComposedSection<Readonly<Record<string, unknown>>>;
  taxCharges: ComposedSection<Readonly<Record<string, unknown>>>;
  mediaReference: ComposedSection<Readonly<{ imagePath: string | null; source: string }>>;
  authoritiesRemainDistinct: true;
  diagnosisIsSourceOfTruth: false;
}>;

async function loadVariantLocator(
  context: PersistenceQueryContext,
  brandId: string,
  variantId: string,
): Promise<{ productId: string; variantId: string } | null> {
  const rows = await context.db
    .select({
      id: catalogVariantsTable.id,
      productId: catalogVariantsTable.productId,
    })
    .from(catalogVariantsTable)
    .where(and(eq(catalogVariantsTable.id, variantId), eq(catalogVariantsTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  return row ? { productId: row.productId, variantId: row.id } : null;
}

export async function inspectCommercialOffering(
  context: PersistenceQueryContext,
  input: Readonly<{
    actor: unknown;
    brandId: string;
    variantId: string;
    outletId?: string | null;
    at?: Date;
  }>,
): Promise<CommercialInspectionResult> {
  const brandId = assertCommercialUuid(input.brandId, "brandId");
  const variantId = assertCommercialUuid(input.variantId, "variantId");
  const principal = await requireAnyBrandCommercialRead(context, input.actor, brandId);
  const at = input.at ?? new Date();

  const outletIdRaw = input.outletId ?? null;
  const outlet =
    outletIdRaw == null
      ? null
      : await requireOutletInBrand(context, brandId, assertCommercialUuid(outletIdRaw, "outletId"));

  const locator = await loadVariantLocator(context, brandId, variantId);
  if (!locator) {
    throw new AdministrationError("ADMIN_NOT_FOUND", "Variant not found.");
  }

  const canCatalog = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "catalog.read",
  );
  const canMenu = await softAuthorizeBrandPermission(context, principal, brandId, "menu.read");
  const canAssortment = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "assortment.read",
  );
  const canPricing = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "pricing.read",
  );
  const canPromotions = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "promotions.read",
  );

  let catalog: CommercialInspectionResult["catalog"] = unavailableSection("catalog.read");
  if (canCatalog) {
    const product = await getBrandCatalogProduct(context, {
      actor: principal,
      brandId,
      productId: locator.productId,
    });
    const variant = await findVariantById(context, variantId);
    if (!variant || variant.brandId !== brandId) {
      throw new AdministrationError("ADMIN_NOT_FOUND", "Variant not found.");
    }
    const [productInspection, variantInspection, graph] = await Promise.all([
      projectProductInspection(context, product),
      projectVariantInspection(context, variant),
      getBrandCatalogProductGraph(context, {
        actor: principal,
        brandId,
        productId: locator.productId,
      }),
    ]);
    catalog = {
      state: "available",
      permission: "catalog.read",
      explanation: "Catalog Product/Variant inspection from Catalog authority.",
      data: {
        product: productInspection,
        variant: variantInspection,
        modifierAssociationCount: graph.variantModifierGroups.length,
        moneyIsNotFromCatalog: true,
      },
    };
  }

  let menu: CommercialInspectionResult["menu"] = unavailableSection("menu.read");
  let mediaReference: CommercialInspectionResult["mediaReference"] = unavailableSection("menu.read");
  if (canMenu) {
    const menus = await listBrandMenus(context, { actor: principal, brandId });
    const active = menus.find((m) => m.lifecycleStatus === "active") ?? menus[0] ?? null;
    if (!active) {
      menu = {
        state: "available",
        permission: "menu.read",
        explanation: "No Menu exists for this Brand.",
        data: { menus: [], placement: null },
      };
      mediaReference = {
        state: "available",
        permission: "menu.read",
        explanation: "No Menu entry media reference present.",
        data: { imagePath: null, source: "menu_entry.imagePath" },
      };
    } else {
      const inspection = await getBrandMenuInspection(context, {
        actor: principal,
        brandId,
        menuId: active.id,
      });
      const effectiveEntries = inspection.effective?.entries ?? [];
      const draftEntries = inspection.draft?.entries ?? [];
      const effectivePlacement =
        effectiveEntries.find((e) => e.productId === locator.productId) ?? null;
      const draftPlacement = draftEntries.find((e) => e.productId === locator.productId) ?? null;
      const section =
        effectivePlacement && inspection.effective
          ? (inspection.effective.sections.find((s) => s.id === effectivePlacement.sectionId) ??
            null)
          : null;
      menu = {
        state: "available",
        permission: "menu.read",
        explanation: "Menu placement from Menu authority (effective vs draft kept distinct).",
        data: {
          menu: inspection.menu,
          draftDiffersFromEffective: inspection.draftDiffersFromEffective,
          effectivePlacement: effectivePlacement
            ? {
                entryId: effectivePlacement.id,
                sectionId: effectivePlacement.sectionId,
                sectionCode: section?.code ?? null,
                sectionName: section?.name ?? null,
                position: effectivePlacement.position,
                displayName: effectivePlacement.displayName,
                displayDescription: effectivePlacement.displayDescription,
                lifecycleStatus: effectivePlacement.lifecycleStatus,
                visibility: effectivePlacement.lifecycleStatus === "active" ? "visible" : "hidden",
              }
            : null,
          draftPlacement: draftPlacement
            ? {
                entryId: draftPlacement.id,
                sectionId: draftPlacement.sectionId,
                position: draftPlacement.position,
                lifecycleStatus: draftPlacement.lifecycleStatus,
              }
            : null,
        },
      };
      mediaReference = {
        state: "available",
        permission: "menu.read",
        explanation: "Existing Menu-entry imagePath reference (view only; no media mutation).",
        data: {
          imagePath: effectivePlacement?.imagePath ?? draftPlacement?.imagePath ?? null,
          source: "menu_entry.imagePath",
        },
      };
    }
  }

  let assortment: CommercialInspectionResult["assortment"] = unavailableSection("assortment.read");
  if (canAssortment) {
    const inspection = await inspectBrandVariantAssortment(context, {
      actor: principal,
      brandId,
      variantId,
    });
    const outletConsequence =
      outlet == null
        ? null
        : (inspection.outletConsequences.find((c) => c.outletId === outlet.id) ?? null);
    assortment = {
      state: "available",
      permission: "assortment.read",
      explanation: "Brand Assortment intent only — Availability is separate.",
      data: {
        includeRule: inspection.includeRule,
        relatedRuleCount: inspection.relatedRules.length,
        outletConsequence,
        availabilityIsSeparate: true,
      },
    };
  }

  let availability: CommercialInspectionResult["availability"] = outlet
    ? unavailableSection("availability.read")
    : unavailableSection("availability.read", "not_applicable");
  let operating: CommercialInspectionResult["operating"] = outlet
    ? unavailableSection("outlet.operating_state.read")
    : unavailableSection("outlet.operating_state.read", "not_applicable");

  if (outlet) {
    const canAvailability = await softAuthorizeOutletPermission(
      context,
      principal,
      {
        brandId: outlet.brandId,
        organizationId: outlet.organizationId,
        territoryId: outlet.territoryId,
        outletId: outlet.id,
      },
      "availability.read",
    );
    const canOperating = await softAuthorizeOutletPermission(
      context,
      principal,
      {
        brandId: outlet.brandId,
        organizationId: outlet.organizationId,
        territoryId: outlet.territoryId,
        outletId: outlet.id,
      },
      "outlet.operating_state.read",
    );
    const canSchedule = await softAuthorizeOutletPermission(
      context,
      principal,
      {
        brandId: outlet.brandId,
        organizationId: outlet.organizationId,
        territoryId: outlet.territoryId,
        outletId: outlet.id,
      },
      "outlet.operating_schedule.read",
    );

    if (canAvailability) {
      const state = await loadEffectiveVariantAvailabilityState(
        context,
        outlet.id,
        variantId,
        at,
      );
      const record = await getVariantAvailability(context, {
        actor: principal,
        outletId: outlet.id,
        variantId,
      }).catch(() => null);
      availability = {
        state: "available",
        permission: "availability.read",
        explanation: "Operational Availability only — not Assortment intent.",
        data: {
          effectiveState: state,
          record,
          assortmentIsSeparate: true,
        },
      };
    }

    if (canOperating || canSchedule) {
      const operatingState = canOperating
        ? await resolveOutletOperatingState(context, {
            outletId: outlet.id,
            context: { now: at },
          })
        : null;
      const profile = canSchedule
        ? await findOutletOperatingProfile(context, outlet.id)
        : null;
      const intervals = canSchedule
        ? await listOutletOperatingIntervals(context, outlet.id)
        : [];
      operating = {
        state: "available",
        permission: canOperating
          ? "outlet.operating_state.read"
          : "outlet.operating_schedule.read",
        explanation: "Outlet operating context for commercial inspection only.",
        data: {
          operatingState,
          timezone: profile?.timezone ?? null,
          intervalCount: intervals.length,
        },
      };
    }
  }

  let pricing: CommercialInspectionResult["pricing"] = unavailableSection("pricing.read");
  let deliveryTariff: CommercialInspectionResult["deliveryTariff"] = outlet
    ? unavailableSection("pricing.read")
    : unavailableSection("pricing.read", "not_applicable");
  if (canPricing) {
    if (!outlet) {
      pricing = {
        state: "insufficient_authorized_context",
        permission: "pricing.read",
        explanation: "Outlet context is required to resolve customer-effective price.",
        data: null,
      };
    } else {
      try {
        const resolved = await resolveOutletVariantPrice(context, {
          variantId,
          outletId: outlet.id,
          at,
        });
        pricing = {
          state: "available",
          permission: "pricing.read",
          explanation: "Authoritative customer-effective price from Pricing authority.",
          data: {
            amountPaise: resolved.amountPaise.toString(10),
            currency: "INR",
            winningPriceBookId: resolved.winningPriceBookId,
            overrideScope: resolved.overrideScope,
            taxCategoryId: resolved.taxCategoryId,
            completeness: "complete",
            catalogDoesNotOwnMoney: true,
          },
        };
      } catch (error) {
        if (
          error instanceof PricingResolutionError &&
          error.pricingErrorCode === "PRICE_MISSING"
        ) {
          pricing = {
            state: "available",
            permission: "pricing.read",
            explanation: "Required effective price is missing.",
            data: {
              amountPaise: null,
              completeness: "missing",
              code: "PRICE_MISSING",
              catalogDoesNotOwnMoney: true,
            },
          };
        } else {
          throw error;
        }
      }

      try {
        const tariff = await readOutletDeliveryTariff(context, {
          actor: principal,
          outletId: outlet.id,
          pathBrandId: brandId,
        });
        deliveryTariff = {
          state: "available",
          permission: "pricing.read",
          explanation:
            "Pricing-owned delivery tariff. Geographic serviceability and provider cost remain separate.",
          data: {
            expectedTariffConfigRevision: tariff.expectedTariffConfigRevision,
            deliveryFeeBands: tariff.deliveryFeeBands,
            freeDeliverySubtotalThresholdPaise: tariff.freeDeliverySubtotalThresholdPaise,
            serviceabilityIsSeparate: true,
            providerCostIsSeparate: true,
          },
        };
      } catch {
        deliveryTariff = {
          state: "available",
          permission: "pricing.read",
          explanation: "No delivery tariff configuration present for this outlet.",
          data: {
            deliveryFeeBands: [],
            freeDeliverySubtotalThresholdPaise: null,
            serviceabilityIsSeparate: true,
            providerCostIsSeparate: true,
          },
        };
      }
    }
  }

  let promotions: CommercialInspectionResult["promotions"] = unavailableSection("promotions.read");
  if (canPromotions) {
    const listed = await listBrandPromotions(context, { actor: principal, brandId });
    promotions = {
      state: "available",
      permission: "promotions.read",
      explanation:
        "Promotion/coupon identity and lifecycle context only — existence does not imply applicability.",
      data: {
        promotions: listed.promotions.slice(0, 25).map((p) => ({
          id: p.id,
          code: p.code,
          displayName: p.displayName,
          status: p.status,
          triggerType: p.triggerType,
          scopeType: p.scopeType,
        })),
        applicabilityNotImpliedByExistence: true,
      },
    };
  }

  const taxCharges = await inspectTaxChargesContext(context, {
    actor: principal,
    brandId,
    outletId: outlet?.id ?? null,
    at,
  });

  return {
    brandId,
    variantId,
    productId: canCatalog ? locator.productId : null,
    outletId: outlet?.id ?? null,
    catalog,
    menu,
    assortment,
    availability,
    operating,
    pricing,
    promotions,
    deliveryTariff,
    taxCharges,
    mediaReference,
    authoritiesRemainDistinct: true,
    diagnosisIsSourceOfTruth: false,
  };
}
