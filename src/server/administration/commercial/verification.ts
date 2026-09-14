/**
 * Authoritative customer verification composition (US-IMP-036F-012).
 *
 * WORKFORCE_MUTATION → authoritative domain → existing customer read/evaluation
 * SECOND_CUSTOMER_COMMERCIAL_PROJECTION = NO
 * REALTIME_PUSH_GUARANTEE = NO
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { catalogVariantsTable } from "../../../platform/database/schema/catalog";
import { projectCustomerMenu } from "../../customer-commerce/menu/project-customer-menu";
import { CustomerMenuError } from "../../../shared/customer-menu/errors";
import { parseNonNegativePaiseIntegerString } from "../../../shared/pricing/delivery-fee-policy";
import { loadApplicableAutomaticPromotions } from "../../promotions/load-for-evaluation";
import { PricingResolutionError } from "../../pricing/errors";
import { resolveOutletVariantPrice } from "../../pricing/resolve-price";
import { resolveCustomerDeliveryCharge } from "../../pricing/resolve-delivery-charge";
import type { Persistence } from "../../persistence/types";
import { AdministrationError } from "../errors";
import {
  assertCommercialUuid,
  requireAnyBrandCommercialRead,
  requireOutletInBrand,
  softAuthorizeBrandPermission,
} from "./soft-auth";
import type { VerificationOutcome } from "./types";

export type CustomerVerificationResult = Readonly<{
  brandId: string;
  variantId: string;
  outletId: string;
  outcome: VerificationOutcome;
  explanation: string;
  customerMenu: Readonly<{
    state: "observed" | "unavailable" | "error";
    present: boolean | null;
    item: Readonly<{
      productId: string;
      variantId: string;
      name: string;
      displayPricePaise: number;
      imagePath: string | null;
      availability: string | null;
    }> | null;
    draftNotUsed: true;
  }>;
  pricing: Readonly<{
    state: "observed" | "missing" | "unavailable" | "error";
    amountPaise: string | null;
    matchesMenuDisplayPrice: boolean | null;
  }>;
  promotions: Readonly<{
    state: "observed" | "unavailable" | "insufficient_context";
    applicableAutomaticCount: number | null;
    note: string;
  }>;
  deliveryTariff: Readonly<{
    state: "observed" | "insufficient_context" | "unavailable" | "error";
    amountPaise: string | null;
    source: string | null;
  }>;
  realtimePushRequired: false;
  formStateTrusted: false;
  subsequentReadValid: true;
}>;

function parseSuppliedOrderSubtotalPaise(value: unknown): bigint {
  const parsed = parseNonNegativePaiseIntegerString(value);
  if (!parsed.ok) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "orderSubtotalPaise must be a non-negative integer string.",
      { field: "orderSubtotalPaise" },
    );
  }
  return parsed.paise;
}

export async function verifyCustomerCommercialTruth(
  persistence: Persistence,
  input: Readonly<{
    actor: unknown;
    brandId: string;
    variantId: string;
    outletId: string;
    at?: Date;
    destinationCoordinates?: Readonly<{
      latitude: string;
      longitude: string;
    }> | null;
    orderSubtotalPaise?: string | null;
  }>,
): Promise<CustomerVerificationResult> {
  const brandId = assertCommercialUuid(input.brandId, "brandId");
  const variantId = assertCommercialUuid(input.variantId, "variantId");
  const outletId = assertCommercialUuid(input.outletId, "outletId");
  const at = input.at ?? new Date();

  // Supplied (non-null) subtotal is validated before destination context branching.
  const suppliedSubtotalPaise =
    input.orderSubtotalPaise === undefined || input.orderSubtotalPaise === null
      ? null
      : parseSuppliedOrderSubtotalPaise(input.orderSubtotalPaise);

  return persistence.withContext(async (context) => {
    const principal = await requireAnyBrandCommercialRead(context, input.actor, brandId);
    const outlet = await requireOutletInBrand(context, brandId, outletId);

    const variantRows = await context.db
      .select({
        id: catalogVariantsTable.id,
        productId: catalogVariantsTable.productId,
      })
      .from(catalogVariantsTable)
      .where(and(eq(catalogVariantsTable.id, variantId), eq(catalogVariantsTable.brandId, brandId)))
      .limit(1);
    const variant = variantRows[0];
    if (!variant) {
      throw new AdministrationError("ADMIN_NOT_FOUND", "Variant not found.");
    }

    // Verification reuses customer projection authority; workforce must hold menu.read
    // (or broader commercial read already gated) — do not invent a second customer Menu.
    const canMenu = await softAuthorizeBrandPermission(context, principal, brandId, "menu.read");
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

    let customerMenu: CustomerVerificationResult["customerMenu"] = {
      state: "unavailable",
      present: null,
      item: null,
      draftNotUsed: true,
    };
    let menuDisplayPrice: number | null = null;
    let exactVariantUnobservableViaDefaultProjection = false;

    if (canMenu) {
      try {
        const projection = await projectCustomerMenu(context, {
          brandId,
          outletId,
          at,
        });
        const exactItem =
          projection.items.find((i) => i.variantId === variantId) ?? null;
        // productId is classification-only — never substitute a sibling as exact evidence.
        const sameProductItem =
          exactItem == null
            ? (projection.items.find((i) => i.productId === variant.productId) ?? null)
            : null;

        if (exactItem != null) {
          menuDisplayPrice = exactItem.displayPricePaise;
          customerMenu = {
            state: "observed",
            present: true,
            item: {
              productId: exactItem.productId,
              variantId: exactItem.variantId,
              name: exactItem.name,
              displayPricePaise: exactItem.displayPricePaise,
              imagePath: exactItem.imagePath,
              availability: exactItem.availability ?? null,
            },
            draftNotUsed: true,
          };
        } else if (sameProductItem != null) {
          // Default-only customer projection observed the Product via another Variant.
          // That proves non-observation of the requested Variant, not authoritative absence.
          exactVariantUnobservableViaDefaultProjection = true;
          customerMenu = {
            state: "observed",
            present: null,
            item: null,
            draftNotUsed: true,
          };
        } else {
          customerMenu = {
            state: "observed",
            present: false,
            item: null,
            draftNotUsed: true,
          };
        }
      } catch (error) {
        if (error instanceof CustomerMenuError) {
          customerMenu = {
            state: "error",
            present: false,
            item: null,
            draftNotUsed: true,
          };
        } else {
          throw error;
        }
      }
    }

    let pricing: CustomerVerificationResult["pricing"] = {
      state: "unavailable",
      amountPaise: null,
      matchesMenuDisplayPrice: null,
    };
    if (canPricing) {
      try {
        const resolved = await resolveOutletVariantPrice(context, {
          variantId,
          outletId,
          at,
        });
        const amount = resolved.amountPaise.toString(10);
        pricing = {
          state: "observed",
          amountPaise: amount,
          matchesMenuDisplayPrice:
            menuDisplayPrice == null
              ? null
              : Number(resolved.amountPaise) === menuDisplayPrice,
        };
      } catch (error) {
        if (
          error instanceof PricingResolutionError &&
          error.pricingErrorCode === "PRICE_MISSING"
        ) {
          pricing = {
            state: "missing",
            amountPaise: null,
            matchesMenuDisplayPrice:
              menuDisplayPrice == null ? null : menuDisplayPrice === 0 ? true : false,
          };
        } else {
          throw error;
        }
      }
    }

    let promotions: CustomerVerificationResult["promotions"] = {
      state: "unavailable",
      applicableAutomaticCount: null,
      note: "Promotion evaluation unavailable to inspect.",
    };
    if (canPromotions) {
      const automatic = await loadApplicableAutomaticPromotions(context, {
        brandId,
        territoryId: outlet.territoryId,
        organizationId: outlet.organizationId,
        outletId,
        at,
      });
      promotions = {
        state: "observed",
        applicableAutomaticCount: automatic.length,
        note:
          "Automatic promotions loaded via existing Promotions evaluation path; cart-level qualifier outcomes may still differ.",
      };
    }

    let deliveryTariff: CustomerVerificationResult["deliveryTariff"] = {
      state: "insufficient_context",
      amountPaise: null,
      source: null,
    };
    if (!canPricing) {
      deliveryTariff = {
        state: "unavailable",
        amountPaise: null,
        source: null,
      };
    } else if (!input.destinationCoordinates || suppliedSubtotalPaise === null) {
      deliveryTariff = {
        state: "insufficient_context",
        amountPaise: null,
        source: null,
      };
    } else {
      try {
        const charge = await resolveCustomerDeliveryCharge(context, {
          brandId,
          outletId,
          at,
          destination: {
            destinationKind: "ONE_TIME_ADDRESS",
            sourceSavedAddressId: null,
            recipientName: "verification",
            recipientPhone: "0000000000",
            addressLine1: "verification",
            addressLine2: null,
            landmark: null,
            locality: null,
            city: "verification",
            stateCode: "KA",
            postalCode: "560001",
            coordinates: {
              latitude: input.destinationCoordinates.latitude,
              longitude: input.destinationCoordinates.longitude,
            },
            label: null,
          },
          prePromotionSubtotalPaise: suppliedSubtotalPaise,
        });
        if (!charge) {
          deliveryTariff = {
            state: "error",
            amountPaise: null,
            source: null,
          };
        } else {
          deliveryTariff = {
            state: "observed",
            amountPaise: charge.amountPaise.toString(10),
            source: charge.source,
          };
        }
      } catch {
        deliveryTariff = {
          state: "error",
          amountPaise: null,
          source: null,
        };
      }
    }

    let outcome: VerificationOutcome = "PARTIAL_VERIFICATION";
    let explanation = "Partial verification from authorized customer authorities.";

    const observedMenu = customerMenu.state === "observed";
    const observedPrice = pricing.state === "observed";
    const missingCriticalContext = !canMenu && !canPricing;

    if (missingCriticalContext) {
      outcome = "INSUFFICIENT_CONTEXT";
      explanation = "Insufficient authorized context to verify customer commercial truth.";
    } else if (exactVariantUnobservableViaDefaultProjection) {
      outcome = "PARTIAL_VERIFICATION";
      explanation =
        "Customer Menu projection observes this Product via a different Variant; the exact requested Variant is not observable through the default-Variant customer projection.";
    } else if (
      observedMenu &&
      customerMenu.present === true &&
      observedPrice &&
      (pricing.matchesMenuDisplayPrice === true || pricing.matchesMenuDisplayPrice === null)
    ) {
      outcome = "VERIFIED_MATCH";
      explanation =
        "Authoritative customer Menu projection and Pricing resolution observe a coherent offering.";
    } else if (
      observedMenu &&
      customerMenu.present === false &&
      (observedPrice || pricing.state === "missing")
    ) {
      outcome = "VERIFIED_MISMATCH";
      explanation =
        "Customer Menu projection does not present this Variant/Product while workforce expected presence.";
    } else if (
      observedMenu &&
      observedPrice &&
      pricing.matchesMenuDisplayPrice === false
    ) {
      outcome = "VERIFIED_MISMATCH";
      explanation = "Customer Menu display price does not match authoritative Pricing resolution.";
    } else if (customerMenu.state === "error" || pricing.state === "missing") {
      outcome = "PARTIAL_VERIFICATION";
      explanation = "Customer verification completed with partial/unavailable downstream truth.";
    } else if (
      deliveryTariff.state === "insufficient_context" ||
      promotions.state === "unavailable" ||
      !observedMenu ||
      !observedPrice
    ) {
      outcome = "PARTIAL_VERIFICATION";
      explanation =
        "Verification used authoritative reads where authorized; some facets remain partial.";
    }

    return {
      brandId,
      variantId,
      outletId,
      outcome,
      explanation,
      customerMenu,
      pricing,
      promotions,
      deliveryTariff,
      realtimePushRequired: false,
      formStateTrusted: false,
      subsequentReadValid: true,
    };
  });
}
