/**
 * Assortment / availability adapter for Checkout (IMP-021).
 */

import {
  resolveModifierOptionAvailability,
  resolveOutletVariantAvailability,
} from "../../assortment/resolve-eligibility";
import { catalogModifierGroupOptionsTable } from "../../../platform/database/schema/catalog";
import { eq } from "drizzle-orm";
import type { Cart } from "../../../shared/cart";
import type { CheckoutMerchandiseProblem } from "../../../shared/checkout";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../assert-role";

function mapAvailabilityCode(
  code: string,
): CheckoutMerchandiseProblem["code"] {
  if (code.includes("ASSORTMENT") || code.includes("EXCLUDE")) {
    return "CHECKOUT_NOT_ASSORTED";
  }
  if (code === "VARIANT_SOLD_OUT") return "CHECKOUT_SOLD_OUT";
  if (code === "VARIANT_TEMPORARILY_UNAVAILABLE") {
    return "CHECKOUT_TEMPORARILY_UNAVAILABLE";
  }
  if (code.includes("MODIFIER") || code.includes("BUNDLE")) {
    return code.includes("MODIFIER")
      ? "CHECKOUT_MODIFIER_INVALID"
      : "CHECKOUT_BUNDLE_INVALID";
  }
  return "CHECKOUT_VARIANT_INVALID";
}

function isCurrentScheduleDenial(code: string): boolean {
  return code === "OUTLET_PAUSED" || code === "OUTLET_CLOSED_BY_SCHEDULE";
}

export async function collectAssortmentAvailabilityProblems(
  context: PersistenceQueryContext,
  cart: Cart,
  outletId: string,
  now: Date,
  options: Readonly<{ ignoreCurrentScheduleDenial?: boolean }> = {},
): Promise<CheckoutMerchandiseProblem[]> {
  assertApplicationRole(context, "collectAssortmentAvailabilityProblems");
  const problems: CheckoutMerchandiseProblem[] = [];
  const ignoreCurrentScheduleDenial = options.ignoreCurrentScheduleDenial === true;

  for (const line of cart.lines) {
    const availability = await resolveOutletVariantAvailability(context, {
      variantId: line.variantId,
      outletId,
      context: { now },
      ignoreCurrentScheduleDenial,
    });
    if (!availability.eligible) {
      if (
        ignoreCurrentScheduleDenial &&
        isCurrentScheduleDenial(String(availability.code))
      ) {
        continue;
      }
      problems.push(
        Object.freeze({
          cartLineId: line.id,
          code: mapAvailabilityCode(String(availability.code)),
        }),
      );
      continue;
    }

    for (const mod of line.modifiers) {
      const mgo = await context.db
        .select({
          modifierOptionId: catalogModifierGroupOptionsTable.modifierOptionId,
        })
        .from(catalogModifierGroupOptionsTable)
        .where(eq(catalogModifierGroupOptionsTable.id, mod.modifierGroupOptionId))
        .limit(1);
      const optionId = mgo[0]?.modifierOptionId;
      if (!optionId) {
        problems.push(
          Object.freeze({
            cartLineId: line.id,
            code: "CHECKOUT_MODIFIER_INVALID",
          }),
        );
        continue;
      }
      const modAvail = await resolveModifierOptionAvailability(context, {
        modifierOptionId: optionId,
        variantId: line.variantId,
        outletId,
        context: { now },
        ignoreCurrentScheduleDenial,
      });
      if (!modAvail.eligible) {
        if (
          ignoreCurrentScheduleDenial &&
          isCurrentScheduleDenial(String(modAvail.code))
        ) {
          continue;
        }
        problems.push(
          Object.freeze({
            cartLineId: line.id,
            code: mapAvailabilityCode(String(modAvail.code)),
          }),
        );
      }
    }
  }

  return problems;
}
