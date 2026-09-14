/**
 * Non-authoritative sellability diagnosis (US-IMP-036F-013).
 *
 * DIAGNOSIS_IS_SOURCE_OF_TRUTH = NO
 * NEW_SELLABILITY_DOMAIN = NO
 * NEW_RULE_ENGINE = NO
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { catalogProductsTable, catalogVariantsTable } from "../../../platform/database/schema/catalog";
import { getEffectiveVariantAssortment } from "../../assortment/assortment-reads";
import { loadEffectiveVariantAvailabilityState } from "../../assortment/availability";
import { resolveOutletOperatingState } from "../../assortment/resolve-operating";
import { getBrandMenuInspection, listBrandMenus } from "../../catalog/menu/inspection";
import { loadApplicableAutomaticPromotions } from "../../promotions/load-for-evaluation";
import { PricingResolutionError } from "../../pricing/errors";
import { resolveOutletVariantPrice } from "../../pricing/resolve-price";
import { evaluateServiceability } from "../../serviceability/evaluate";
import type { Persistence } from "../../persistence/types";
import { AdministrationError } from "../errors";
import {
  assertCommercialUuid,
  requireAnyBrandCommercialRead,
  requireOutletInBrand,
  softAuthorizeBrandPermission,
  softAuthorizeOutletPermission,
} from "./soft-auth";
import type { DiagnosisSignal, DiagnosisSignalKey } from "./types";

export type SellabilityDiagnosisResult = Readonly<{
  brandId: string;
  variantId: string;
  productId: string | null;
  outletId: string;
  signals: readonly DiagnosisSignal[];
  diagnosisIsSourceOfTruth: false;
  newSellabilityDomain: false;
  underlyingAuthoritiesRemainAuthoritative: true;
}>;

function signal(partial: DiagnosisSignal): DiagnosisSignal {
  return partial;
}

export async function diagnoseSellability(
  persistence: Persistence,
  input: Readonly<{
    actor: unknown;
    brandId: string;
    variantId: string;
    outletId: string;
    at?: Date;
    customerLocation?: Readonly<{
      latitude: string;
      longitude: string;
    }> | null;
  }>,
): Promise<SellabilityDiagnosisResult> {
  const brandId = assertCommercialUuid(input.brandId, "brandId");
  const variantId = assertCommercialUuid(input.variantId, "variantId");
  const outletId = assertCommercialUuid(input.outletId, "outletId");
  const at = input.at ?? new Date();

  return persistence.withContext(async (context) => {
    const principal = await requireAnyBrandCommercialRead(context, input.actor, brandId);
    const outlet = await requireOutletInBrand(context, brandId, outletId);

    const variantRows = await context.db
      .select({
        id: catalogVariantsTable.id,
        productId: catalogVariantsTable.productId,
        lifecycleStatus: catalogVariantsTable.lifecycleStatus,
        effectiveContentRevision: catalogVariantsTable.effectiveContentRevision,
      })
      .from(catalogVariantsTable)
      .where(and(eq(catalogVariantsTable.id, variantId), eq(catalogVariantsTable.brandId, brandId)))
      .limit(1);
    const variantRow = variantRows[0];
    if (!variantRow) {
      throw new AdministrationError("ADMIN_NOT_FOUND", "Variant not found.");
    }

    const productRows = await context.db
      .select({
        id: catalogProductsTable.id,
        lifecycleStatus: catalogProductsTable.lifecycleStatus,
        effectiveContentRevision: catalogProductsTable.effectiveContentRevision,
      })
      .from(catalogProductsTable)
      .where(
        and(
          eq(catalogProductsTable.id, variantRow.productId),
          eq(catalogProductsTable.brandId, brandId),
        ),
      )
      .limit(1);
    const productRow = productRows[0];
    if (!productRow) {
      throw new AdministrationError("ADMIN_NOT_FOUND", "Variant not found.");
    }

    const subjectBase = {
      brandId,
      variantId,
      productId: productRow.id as string | null,
      outletId,
    };

    const signals: DiagnosisSignal[] = [];

    const canCatalog = await softAuthorizeBrandPermission(
      context,
      principal,
      brandId,
      "catalog.read",
    );
    if (!canCatalog) {
      for (const key of ["CATALOG_LIFECYCLE", "CATALOG_PUBLICATION"] as const) {
        signals.push(
          signal({
            key,
            authority: "catalog",
            subject: { ...subjectBase, productId: null },
            outcome: "unavailable_to_inspect",
            explanation: "Caller lacks catalog.read; Catalog values are not exposed.",
            actionableContext: null,
            authoritative: false,
          }),
        );
      }
    } else {
      const lifecycleBlocked =
        productRow.lifecycleStatus !== "active" || variantRow.lifecycleStatus !== "active";
      signals.push(
        signal({
          key: "CATALOG_LIFECYCLE",
          authority: "catalog",
          subject: subjectBase,
          outcome: lifecycleBlocked ? "block" : "pass",
          explanation: lifecycleBlocked
            ? `Catalog lifecycle blocks sellability (product=${productRow.lifecycleStatus}, variant=${variantRow.lifecycleStatus}). This is not Menu, Assortment, or Availability.`
            : "Catalog Product and Variant are active.",
          actionableContext: lifecycleBlocked
            ? "Activate or correct Catalog lifecycle before expecting customer orderability."
            : null,
          authoritative: true,
        }),
      );
      const publicationBlocked =
        productRow.effectiveContentRevision == null ||
        variantRow.effectiveContentRevision == null;
      signals.push(
        signal({
          key: "CATALOG_PUBLICATION",
          authority: "catalog",
          subject: subjectBase,
          outcome: publicationBlocked ? "block" : "pass",
          explanation: publicationBlocked
            ? "Catalog lacks an effective published content revision for customer truth."
            : "Catalog has effective published content revisions.",
          actionableContext: publicationBlocked
            ? "Publish Catalog content so customer projection can observe it."
            : null,
          authoritative: true,
        }),
      );
    }

    const canMenu = await softAuthorizeBrandPermission(context, principal, brandId, "menu.read");
    if (!canMenu) {
      for (const key of ["MENU_PLACEMENT", "MENU_EFFECTIVE_VISIBILITY"] as const) {
        signals.push(
          signal({
            key,
            authority: "menu",
            subject: subjectBase,
            outcome: "unavailable_to_inspect",
            explanation: "Caller lacks menu.read; Menu values are not exposed.",
            actionableContext: null,
            authoritative: false,
          }),
        );
      }
    } else {
      const menus = await listBrandMenus(context, { actor: principal, brandId });
      const active = menus.find((m) => m.lifecycleStatus === "active");
      if (!active) {
        signals.push(
          signal({
            key: "MENU_PLACEMENT",
            authority: "menu",
            subject: subjectBase,
            outcome: "block",
            explanation: "No active Menu exists for this Brand (Menu signal, not Catalog/Assortment).",
            actionableContext: "Create and publish an active Menu with this Product placement.",
            authoritative: true,
          }),
        );
        signals.push(
          signal({
            key: "MENU_EFFECTIVE_VISIBILITY",
            authority: "menu",
            subject: subjectBase,
            outcome: "block",
            explanation: "Without an active Menu there is no effective customer-visible placement.",
            actionableContext: null,
            authoritative: true,
          }),
        );
      } else {
        const inspection = await getBrandMenuInspection(context, {
          actor: principal,
          brandId,
          menuId: active.id,
        });
        const entry =
          inspection.effective?.entries.find((e) => e.productId === productRow.id) ?? null;
        signals.push(
          signal({
            key: "MENU_PLACEMENT",
            authority: "menu",
            subject: subjectBase,
            outcome: entry ? "pass" : "block",
            explanation: entry
              ? "Product is placed on the effective Menu."
              : "Product is absent from the effective Menu (Menu signal, not Catalog or Assortment).",
            actionableContext: entry
              ? null
              : "Add the Product to the Menu draft and publish the Menu revision.",
            authoritative: true,
          }),
        );
        const visible = entry?.lifecycleStatus === "active";
        signals.push(
          signal({
            key: "MENU_EFFECTIVE_VISIBILITY",
            authority: "menu",
            subject: subjectBase,
            outcome: !entry ? "block" : visible ? "pass" : "block",
            explanation: !entry
              ? "No effective Menu entry to evaluate visibility."
              : visible
                ? "Effective Menu entry is visible (active)."
                : "Effective Menu entry exists but is not active/visible (Menu signal).",
            actionableContext:
              entry && !visible
                ? "Activate the Menu entry (or publish a revision that restores visibility)."
                : null,
            authoritative: true,
          }),
        );
      }
    }

    const canAssortment = await softAuthorizeBrandPermission(
      context,
      principal,
      brandId,
      "assortment.read",
    );
    if (!canAssortment) {
      signals.push(
        signal({
          key: "ASSORTMENT",
          authority: "assortment",
          subject: subjectBase,
          outcome: "unavailable_to_inspect",
          explanation: "Caller lacks assortment.read; Assortment values are not exposed.",
          actionableContext: null,
          authoritative: false,
        }),
      );
    } else {
      const decision = await getEffectiveVariantAssortment(context, {
        actor: principal,
        outletId,
        variantId,
        authorize: false,
      });
      signals.push(
        signal({
          key: "ASSORTMENT",
          authority: "assortment",
          subject: subjectBase,
          outcome: decision.eligible ? "pass" : "block",
          explanation: decision.eligible
            ? "Brand Assortment intends this Variant for the outlet."
            : `Assortment excludes or does not include this Variant (${decision.code}). This is not operational sold-out/Availability.`,
          actionableContext: decision.eligible
            ? null
            : "Include the Variant in Brand Assortment for the intended outlet scope.",
          authoritative: true,
        }),
      );
    }

    const outletResource = {
      brandId: outlet.brandId,
      organizationId: outlet.organizationId,
      territoryId: outlet.territoryId,
      outletId: outlet.id,
    };
    const canAvailability = await softAuthorizeOutletPermission(
      context,
      principal,
      outletResource,
      "availability.read",
    );
    if (!canAvailability) {
      signals.push(
        signal({
          key: "AVAILABILITY",
          authority: "availability",
          subject: subjectBase,
          outcome: "unavailable_to_inspect",
          explanation: "Caller lacks availability.read; Availability values are not exposed.",
          actionableContext: null,
          authoritative: false,
        }),
      );
    } else {
      const state = await loadEffectiveVariantAvailabilityState(context, outletId, variantId, at);
      const blocked = state === "sold_out" || state === "temporarily_unavailable";
      signals.push(
        signal({
          key: "AVAILABILITY",
          authority: "availability",
          subject: subjectBase,
          outcome: blocked ? "block" : "pass",
          explanation: blocked
            ? `Operational Availability is ${state} (Availability only — not Catalog retirement or Assortment exclusion).`
            : "Operational Availability permits selling.",
          actionableContext: blocked
            ? "Restore Availability (clear sold-out / temporary unavailability) at the outlet."
            : null,
          authoritative: true,
        }),
      );
    }

    const canPricing = await softAuthorizeBrandPermission(
      context,
      principal,
      brandId,
      "pricing.read",
    );
    if (!canPricing) {
      signals.push(
        signal({
          key: "PRICING_COMPLETENESS",
          authority: "pricing",
          subject: subjectBase,
          outcome: "unavailable_to_inspect",
          explanation: "Caller lacks pricing.read; Pricing values are not exposed.",
          actionableContext: null,
          authoritative: false,
        }),
      );
    } else {
      try {
        await resolveOutletVariantPrice(context, { variantId, outletId, at });
        signals.push(
          signal({
            key: "PRICING_COMPLETENESS",
            authority: "pricing",
            subject: subjectBase,
            outcome: "pass",
            explanation: "Required effective customer price resolves successfully.",
            actionableContext: null,
            authoritative: true,
          }),
        );
      } catch (error) {
        if (
          error instanceof PricingResolutionError &&
          error.pricingErrorCode === "PRICE_MISSING"
        ) {
          signals.push(
            signal({
              key: "PRICING_COMPLETENESS",
              authority: "pricing",
              subject: subjectBase,
              outcome: "block",
              explanation: "Required effective price is missing (Pricing incompleteness).",
              actionableContext: "Set and activate a baseline Variant price in Pricing.",
              authoritative: true,
            }),
          );
        } else {
          throw error;
        }
      }
    }

    const canPromotions = await softAuthorizeBrandPermission(
      context,
      principal,
      brandId,
      "promotions.read",
    );
    if (!canPromotions) {
      signals.push(
        signal({
          key: "PROMOTION_APPLICABILITY",
          authority: "promotions",
          subject: subjectBase,
          outcome: "unavailable_to_inspect",
          explanation: "Caller lacks promotions.read; Promotion values are not exposed.",
          actionableContext: null,
          authoritative: false,
        }),
      );
    } else {
      const automatic = await loadApplicableAutomaticPromotions(context, {
        brandId,
        territoryId: outlet.territoryId,
        organizationId: outlet.organizationId,
        outletId,
        at,
      });
      signals.push(
        signal({
          key: "PROMOTION_APPLICABILITY",
          authority: "promotions",
          subject: subjectBase,
          outcome: "info",
          explanation:
            automatic.length === 0
              ? "No currently applicable automatic promotions for this outlet context. Promotion non-applicability is not a Pricing incompleteness and is not required for basic sellability."
              : `${automatic.length} automatic promotion(s) are in scope for evaluation; applicability still depends on cart/qualifier evaluation.`,
          actionableContext: null,
          authoritative: true,
        }),
      );
    }

    const canOperating = await softAuthorizeOutletPermission(
      context,
      principal,
      outletResource,
      "outlet.operating_state.read",
    );
    if (!canOperating) {
      for (const key of ["OUTLET_OPERATING_STATE", "OUTLET_HOURS"] as const) {
        signals.push(
          signal({
            key,
            authority: "outlet_operating",
            subject: subjectBase,
            outcome: "unavailable_to_inspect",
            explanation: "Caller lacks outlet.operating_state.read; operating values are not exposed.",
            actionableContext: null,
            authoritative: false,
          }),
        );
      }
    } else {
      const operating = await resolveOutletOperatingState(context, {
        outletId,
        context: { now: at },
      });
      const closed =
        operating.code !== "AVAILABLE" &&
        operating.code !== "ERROR";
      signals.push(
        signal({
          key: "OUTLET_OPERATING_STATE",
          authority: "outlet_operating",
          subject: subjectBase,
          outcome: closed ? "block" : operating.code === "AVAILABLE" ? "pass" : "info",
          explanation: `Outlet operating state code=${operating.code}, effectiveState=${operating.effectiveState} (distinct from Assortment/Availability/Catalog).`,
          actionableContext: closed
            ? "Resume/open the outlet or correct operating configuration."
            : null,
          authoritative: true,
        }),
      );
      signals.push(
        signal({
          key: "OUTLET_HOURS",
          authority: "outlet_operating",
          subject: subjectBase,
          outcome:
            operating.code === "OUTLET_CLOSED_BY_SCHEDULE"
              ? "block"
              : operating.code === "OPERATING_CONFIGURATION_MISSING"
                ? "block"
                : "pass",
          explanation:
            operating.code === "OUTLET_CLOSED_BY_SCHEDULE"
              ? "Outlet is closed by schedule (hours signal)."
              : operating.code === "OPERATING_CONFIGURATION_MISSING"
                ? "Operating hours/configuration are missing."
                : "Hours/schedule do not independently block at the evaluated instant.",
          actionableContext:
            operating.code === "OUTLET_CLOSED_BY_SCHEDULE" ||
            operating.code === "OPERATING_CONFIGURATION_MISSING"
              ? "Update operating schedule/profile for the outlet."
              : null,
          authoritative: true,
        }),
      );
    }

    const canServiceability = await softAuthorizeOutletPermission(
      context,
      principal,
      outletResource,
      "serviceability.read",
    );
    if (!input.customerLocation) {
      signals.push(
        signal({
          key: "SERVICEABILITY",
          authority: "serviceability",
          subject: subjectBase,
          outcome: "insufficient_authorized_context",
          explanation:
            "Customer location was not supplied; Serviceability was not evaluated. Delivery tariff is not Serviceability.",
          actionableContext: "Provide customer coordinates when Serviceability diagnosis is required.",
          authoritative: false,
        }),
      );
    } else if (!canServiceability) {
      signals.push(
        signal({
          key: "SERVICEABILITY",
          authority: "serviceability",
          subject: subjectBase,
          outcome: "unavailable_to_inspect",
          explanation: "Caller lacks serviceability.read; Serviceability values are not exposed.",
          actionableContext: null,
          authoritative: false,
        }),
      );
    } else {
      const decision = await evaluateServiceability(persistence, {
        brandId,
        location: {
          coordinates: {
            latitude: input.customerLocation.latitude,
            longitude: input.customerLocation.longitude,
          },
        },
      });
      const status = decision.status;
      signals.push(
        signal({
          key: "SERVICEABILITY",
          authority: "serviceability",
          subject: subjectBase,
          outcome:
            status === "SERVICEABLE"
              ? "pass"
              : status === "NOT_SERVICEABLE"
                ? "block"
                : "info",
          explanation: `Serviceability status=${status}. This is geographic/operating eligibility — not delivery tariff or provider cost.`,
          actionableContext:
            status === "NOT_SERVICEABLE"
              ? "Adjust service distance policy/origin or choose a serviceable destination."
              : null,
          authoritative: true,
        }),
      );
    }

    // Hide productId when catalog unauthorized to avoid leaking identity fields.
    const safeProductId = canCatalog ? productRow.id : null;
    return {
      brandId,
      variantId,
      productId: safeProductId,
      outletId,
      signals: signals.map((s) =>
        s.subject.productId === productRow.id && !canCatalog
          ? { ...s, subject: { ...s.subject, productId: null } }
          : s,
      ),
      diagnosisIsSourceOfTruth: false,
      newSellabilityDomain: false,
      underlyingAuthoritiesRemainAuthoritative: true,
    };
  });
}

export function diagnosisSignalKeys(): readonly DiagnosisSignalKey[] {
  return [
    "CATALOG_LIFECYCLE",
    "CATALOG_PUBLICATION",
    "MENU_PLACEMENT",
    "MENU_EFFECTIVE_VISIBILITY",
    "ASSORTMENT",
    "AVAILABILITY",
    "PRICING_COMPLETENESS",
    "PROMOTION_APPLICABILITY",
    "OUTLET_OPERATING_STATE",
    "OUTLET_HOURS",
    "SERVICEABILITY",
  ];
}
