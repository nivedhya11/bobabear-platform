/**
 * Customer delivery charge resolver (IMP-036C).
 *
 * BOBA-owned standardized delivery fee from outlet policy or brand price-book fallback.
 * Provider execution cost remains in Delivery domain.
 */

import { and, eq } from "drizzle-orm";

import {
  chargeDefinitionsTable,
  priceBookChargePricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { outletServiceabilityConfigsTable } from "../../platform/database/schema/serviceability";
import {
  geodesicDistanceMeters,
  parseServiceabilityCoordinate,
} from "../../shared/serviceability";
import {
  parseDeliveryFeeBands,
  resolveDeliveryFeeFromBands,
} from "../../shared/pricing/delivery-fee-policy";
import { CHARGE_DEFINITION_DELIVERY_ID } from "../../shared/pricing";
import type { CheckoutDestination } from "../../shared/checkout";
import type { PersistenceQueryContext } from "../persistence/types";

export type ResolvedCustomerDeliveryCharge = Readonly<{
  amountPaise: bigint;
  source: "distance_band_policy" | "price_book_fallback";
}>;

async function loadOutletDeliveryFeePolicy(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<
  Readonly<{
    serviceOriginLatitude: string | null;
    serviceOriginLongitude: string | null;
    bands: readonly { maxDistanceMeters: number; amountPaise: number }[];
    freeDeliverySubtotalThresholdPaise: bigint | null;
  }> | null
> {
  const rows = await context.db
    .select({
      serviceOriginLatitude: outletServiceabilityConfigsTable.serviceOriginLatitude,
      serviceOriginLongitude: outletServiceabilityConfigsTable.serviceOriginLongitude,
      deliveryFeeBands: outletServiceabilityConfigsTable.deliveryFeeBands,
      freeDeliverySubtotalThresholdPaise:
        outletServiceabilityConfigsTable.freeDeliverySubtotalThresholdPaise,
    })
    .from(outletServiceabilityConfigsTable)
    .where(eq(outletServiceabilityConfigsTable.outletId, outletId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return Object.freeze({
    serviceOriginLatitude: row.serviceOriginLatitude ?? null,
    serviceOriginLongitude: row.serviceOriginLongitude ?? null,
    bands: parseDeliveryFeeBands(row.deliveryFeeBands),
    freeDeliverySubtotalThresholdPaise: row.freeDeliverySubtotalThresholdPaise ?? null,
  });
}

async function loadBrandDeliveryFallbackPaise(
  context: PersistenceQueryContext,
  brandId: string,
  at: Date,
): Promise<bigint | null> {
  const books = await context.db
    .select({ id: priceBooksTable.id })
    .from(priceBooksTable)
    .where(
      and(
        eq(priceBooksTable.brandId, brandId),
        eq(priceBooksTable.scopeType, "brand"),
        eq(priceBooksTable.lifecycleStatus, "active"),
        eq(priceBooksTable.salesChannel, "direct"),
      ),
    )
    .limit(5);

  for (const book of books) {
    const rows = await context.db
      .select({
        amountPaise: priceBookChargePricesTable.amountPaise,
      })
      .from(priceBookChargePricesTable)
      .innerJoin(
        chargeDefinitionsTable,
        eq(chargeDefinitionsTable.id, priceBookChargePricesTable.chargeDefinitionId),
      )
      .where(
        and(
          eq(priceBookChargePricesTable.priceBookId, book.id),
          eq(
            priceBookChargePricesTable.chargeDefinitionId,
            CHARGE_DEFINITION_DELIVERY_ID,
          ),
          eq(chargeDefinitionsTable.code, "delivery"),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row) return row.amountPaise;
  }

  void at;
  return null;
}

export async function resolveCustomerDeliveryCharge(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    outletId: string;
    destination: CheckoutDestination;
    at: Date;
    prePromotionSubtotalPaise: bigint;
  }>,
): Promise<ResolvedCustomerDeliveryCharge | null> {
  const policy = await loadOutletDeliveryFeePolicy(context, input.outletId);
  const fallback = await loadBrandDeliveryFallbackPaise(
    context,
    input.brandId,
    input.at,
  );

  if (
    policy?.freeDeliverySubtotalThresholdPaise !== null &&
    policy?.freeDeliverySubtotalThresholdPaise !== undefined &&
    input.prePromotionSubtotalPaise >= policy.freeDeliverySubtotalThresholdPaise
  ) {
    return Object.freeze({
      amountPaise: BigInt(0),
      source: "distance_band_policy",
    });
  }

  const coordinates = input.destination.coordinates;
  if (policy && policy.bands.length > 0 && coordinates) {
    const originLat =
      policy.serviceOriginLatitude !== null
        ? parseServiceabilityCoordinate(policy.serviceOriginLatitude)
        : null;
    const originLng =
      policy.serviceOriginLongitude !== null
        ? parseServiceabilityCoordinate(policy.serviceOriginLongitude)
        : null;
    const pointLat = parseServiceabilityCoordinate(coordinates.latitude);
    const pointLng = parseServiceabilityCoordinate(coordinates.longitude);
    if (
      originLat !== null &&
      originLng !== null &&
      pointLat !== null &&
      pointLng !== null
    ) {
      const distanceMeters = geodesicDistanceMeters({
        originLatitude: originLat,
        originLongitude: originLng,
        pointLatitude: pointLat,
        pointLongitude: pointLng,
      });
      const bandAmount = resolveDeliveryFeeFromBands(distanceMeters, policy.bands);
      if (bandAmount !== null) {
        return Object.freeze({
          amountPaise: bandAmount,
          source: "distance_band_policy",
        });
      }
    }
  }

  if (fallback !== null) {
    return Object.freeze({
      amountPaise: fallback,
      source: "price_book_fallback",
    });
  }

  void CHARGE_DEFINITION_DELIVERY_ID;
  return null;
}
