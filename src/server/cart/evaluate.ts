/**
 * Read-only Cart evaluation (IMP-020).
 *
 * Composes Serviceability + Assortment/Availability + Pricing.
 * Never mutates Cart revision, updatedAt, expiresAt, lines, or coupon.
 */

import {
  resolveOutletVariantAvailability,
  resolveModifierOptionAvailability,
} from "../assortment/resolve-eligibility";
import { buildDirectPricingQuote } from "../pricing/quote";
import { evaluateServiceability } from "../serviceability/evaluate";
import {
  CartError,
  assertUuid,
  type Cart,
  type CartEvaluationResult,
  type CartLineProblem,
} from "../../shared/cart";
import type { Persistence } from "../persistence/types";
import type { CartAccess } from "./operations";
import { getActiveCart } from "./operations";
import { systemCartClock, type CartClock } from "./clock";
import {
  catalogModifierGroupOptionsTable,
} from "../../platform/database/schema/catalog";
import { eq } from "drizzle-orm";

export type EvaluateCartInput = Readonly<{
  location?: Readonly<{
    postalCode: string;
    coordinates?: Readonly<{ latitude: string; longitude: string }> | null;
  }> | null;
}>;

export type EvaluateCartOptions = Readonly<{
  clock?: CartClock;
}>;

function parseEvaluateInput(raw: unknown): EvaluateCartInput {
  if (raw === undefined || raw === null) {
    return Object.freeze({});
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new CartError("CART_INVALID_INPUT", "evaluateCart input invalid.");
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key !== "location") {
      throw new CartError(
        "CART_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
      );
    }
  }
  if (obj.location === undefined || obj.location === null) {
    return Object.freeze({ location: null });
  }
  if (typeof obj.location !== "object" || Array.isArray(obj.location)) {
    throw new CartError("CART_INVALID_INPUT", "location must be an object.", {
      field: "location",
    });
  }
  const loc = obj.location as Record<string, unknown>;
  for (const key of Object.keys(loc)) {
    if (key !== "postalCode" && key !== "coordinates") {
      throw new CartError(
        "CART_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
        { field: "location" },
      );
    }
  }
  if (typeof loc.postalCode !== "string") {
    throw new CartError(
      "CART_INVALID_INPUT",
      "postalCode must be a string.",
      { field: "postalCode" },
    );
  }
  let coordinates:
    | Readonly<{ latitude: string; longitude: string }>
    | null
    | undefined;
  if (loc.coordinates !== undefined && loc.coordinates !== null) {
    if (typeof loc.coordinates !== "object" || Array.isArray(loc.coordinates)) {
      throw new CartError(
        "CART_INVALID_INPUT",
        "coordinates must be an object.",
        { field: "coordinates" },
      );
    }
    const c = loc.coordinates as Record<string, unknown>;
    if (typeof c.latitude !== "string" || typeof c.longitude !== "string") {
      throw new CartError(
        "CART_INVALID_INPUT",
        "coordinates require latitude and longitude strings.",
        { field: "coordinates" },
      );
    }
    coordinates = Object.freeze({
      latitude: c.latitude,
      longitude: c.longitude,
    });
  }
  return Object.freeze({
    location: Object.freeze({
      postalCode: loc.postalCode,
      coordinates: coordinates ?? null,
    }),
  });
}

export async function evaluateCart(
  persistence: Persistence,
  access: CartAccess,
  input: unknown = {},
  options: EvaluateCartOptions = {},
): Promise<CartEvaluationResult> {
  assertUuid(access.brandId, "brandId");
  const clock = options.clock ?? systemCartClock;
  const evaluatedAt = clock.now();
  const parsed = parseEvaluateInput(input);

  const cart = await getActiveCart(persistence, access, { clock });
  if (!cart) {
    throw new CartError("CART_NOT_FOUND", "Cart not found.");
  }

  if (!parsed.location) {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "REQUIRES_FULFILMENT_CONTEXT",
    });
  }

  let serviceability;
  try {
    serviceability = await evaluateServiceability(
      persistence,
      {
        brandId: cart.brandId,
        location: parsed.location,
      },
      { clock },
    );
  } catch {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "EVALUATION_INDETERMINATE",
      problems: Object.freeze([]),
    });
  }

  if (serviceability.status === "NOT_SERVICEABLE") {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "SERVICEABILITY_NOT_SERVICEABLE",
    });
  }
  if (serviceability.status === "TEMPORARILY_UNAVAILABLE") {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
    });
  }
  if (serviceability.status === "INDETERMINATE") {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "SERVICEABILITY_INDETERMINATE",
      serviceabilityReason: serviceability.reason,
    });
  }

  const selectedOutletId = serviceability.selectedOutletId;
  const problems: CartLineProblem[] = [];

  try {
    await persistence.withContext(async (ctx) => {
      for (const line of cart.lines) {
        const availability = await resolveOutletVariantAvailability(ctx, {
          variantId: line.variantId,
          outletId: selectedOutletId,
          context: { now: evaluatedAt },
        });
        if (!availability.eligible) {
          const code = String(availability.code);
          problems.push(
            Object.freeze({
              cartLineId: line.id,
              code: code.includes("ASSORTMENT") || code.includes("EXCLUDE")
                ? ("LINE_NOT_IN_ASSORTMENT" as const)
                : ("LINE_VARIANT_UNAVAILABLE" as const),
            }),
          );
          continue;
        }

        for (const mod of line.modifiers) {
          const mgo = await ctx.db
            .select({
              modifierOptionId: catalogModifierGroupOptionsTable.modifierOptionId,
            })
            .from(catalogModifierGroupOptionsTable)
            .where(
              eq(catalogModifierGroupOptionsTable.id, mod.modifierGroupOptionId),
            )
            .limit(1);
          const optionId = mgo[0]?.modifierOptionId;
          if (!optionId) {
            problems.push(
              Object.freeze({
                cartLineId: line.id,
                code: "LINE_CONFIGURATION_INVALID",
              }),
            );
            continue;
          }
          const modAvail = await resolveModifierOptionAvailability(ctx, {
            modifierOptionId: optionId,
            variantId: line.variantId,
            outletId: selectedOutletId,
            context: { now: evaluatedAt },
          });
          if (!modAvail.eligible) {
            problems.push(
              Object.freeze({
                cartLineId: line.id,
                code: "LINE_REQUIRED_SELECTION_UNAVAILABLE",
              }),
            );
          }
        }
      }
    });
  } catch {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "EVALUATION_INDETERMINATE",
      selectedOutletId,
    });
  }

  if (problems.length > 0) {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "CART_INVALID",
      selectedOutletId,
      problems: Object.freeze(problems),
    });
  }

  try {
    const quote = await persistence.withContext((ctx) =>
      buildDirectPricingQuote(ctx, {
        outletId: selectedOutletId,
        at: evaluatedAt,
        customerId:
          access.kind === "customer" ? access.actor.authUserId : null,
        submittedCouponCode: cart.manualCouponCode,
        lines: cart.lines.map((line) => ({
          lineId: line.id,
          variantId: line.variantId,
          quantity: line.quantity,
          modifiers: line.modifiers.map((m) => ({
            variantModifierGroupId: m.variantModifierGroupId,
            modifierGroupOptionId: m.modifierGroupOptionId,
            quantity: m.quantity,
          })),
          bundleOptions: line.bundleSelections.map((b) => ({
            bundleGroupOptionId: b.bundleGroupOptionId,
            quantity: b.quantity,
            modifiers: b.modifiers.map((m) => ({
              variantModifierGroupId: m.variantModifierGroupId,
              modifierGroupOptionId: m.modifierGroupOptionId,
              quantity: m.quantity,
            })),
          })),
        })),
      }),
    );

    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "COMPLETE",
      selectedOutletId,
      quote,
    });
  } catch {
    return Object.freeze({
      cartId: cart.id,
      cartRevision: cart.revision,
      evaluatedAt,
      status: "EVALUATION_INDETERMINATE",
      selectedOutletId,
      problems: Object.freeze([
        Object.freeze({
          cartLineId: cart.lines[0]?.id ?? cart.id,
          code: "PRICE_UNAVAILABLE" as const,
        }),
      ]),
    });
  }
}

/** Exported for tests — proves evaluate never mutates. */
export type { Cart };
