/**
 * Checkout persistence primitives (IMP-021).
 *
 * Lock order when both Cart and Checkout are locked: Cart then Checkout.
 * Never reverse.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  checkoutDeliveryDestinationsTable,
  checkoutSnapshotChargesTable,
  checkoutSnapshotLineBundleModifierSelectionsTable,
  checkoutSnapshotLineBundleSelectionsTable,
  checkoutSnapshotLineModifierSelectionsTable,
  checkoutSnapshotLinesTable,
  checkoutSnapshotPromotionEffectsTable,
  checkoutSnapshotsTable,
  checkoutSnapshotTaxComponentsTable,
  checkoutsTable,
} from "../../platform/database/schema/checkout";
import type {
  Checkout,
  CheckoutDestination,
  CheckoutSnapshot,
  CheckoutSnapshotBundleSelection,
  CheckoutSnapshotCharge,
  CheckoutSnapshotLine,
  CheckoutSnapshotModifierSelection,
  CheckoutSnapshotPromotionEffect,
  CheckoutSnapshotTaxComponent,
  CheckoutStatus,
} from "../../shared/checkout";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type CheckoutRow = typeof checkoutsTable.$inferSelect;
export type CheckoutDestinationRow =
  typeof checkoutDeliveryDestinationsTable.$inferSelect;
export type CheckoutSnapshotRow = typeof checkoutSnapshotsTable.$inferSelect;

export type SnapshotCommitPayload = Readonly<{
  snapshotId: string;
  checkoutRevision: bigint;
  sourceCartRevision: bigint;
  selectedOutletId: string;
  evaluatedAt: Date;
  serviceabilityEvaluatedAt: Date;
  currency: "INR";
  manualCouponCode: string | null;
  destination: CheckoutDestination;
  basePaise: bigint;
  modifierAdjustmentsPaise: bigint;
  bundleAdjustmentsPaise: bigint;
  chargesPaise: bigint;
  prePromotionSubtotalPaise: bigint;
  promotionDiscountPaise: bigint;
  taxablePaise: bigint;
  taxPaise: bigint;
  grandTotalPaise: bigint;
  taxInclusionMode: "exclusive" | "inclusive";
  createdAt: Date;
  lines: readonly Readonly<{
    id: string;
    sourceCartLineId: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    lineBasePaise: bigint;
    lineModifierAdjustmentsPaise: bigint;
    lineBundleAdjustmentsPaise: bigint;
    lineSubtotalPaise: bigint;
    linePromotionDiscountPaise: bigint;
    lineTaxablePaise: bigint;
    lineTaxPaise: bigint;
    lineTotalPaise: bigint;
    sequence: number;
    modifiers: readonly Readonly<{
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      quantity: number;
      groupName: string;
      optionName: string;
      unitDeltaPaise: bigint;
    }>[];
    bundleSelections: readonly Readonly<{
      id: string;
      bundleGroupOptionId: string;
      selectedVariantId: string;
      quantity: number;
      groupName: string;
      optionName: string;
      variantName: string;
      unitDeltaPaise: bigint;
      modifiers: readonly Readonly<{
        variantModifierGroupId: string;
        modifierGroupOptionId: string;
        quantity: number;
        groupName: string;
        optionName: string;
        unitDeltaPaise: bigint;
      }>[];
    }>[];
  }>[];
  charges: readonly Readonly<{
    id: string;
    chargeDefinitionId: string;
    chargeCode: "packaging" | "delivery";
    calculationMode: "fixed_per_order" | "per_item_quantity";
    amountPaise: bigint;
    name: string;
    sortOrder: number;
  }>[];
  promotionEffects: readonly Readonly<{
    id: string;
    effectKind: "monetary_allocation" | "applied_promotion" | "bogo_reward";
    promotionId: string;
    couponId: string | null;
    promotionCode: string;
    displayName: string;
    triggerType: string | null;
    stackingPolicy: string | null;
    componentId: string | null;
    lineId: string | null;
    amountPaise: bigint | null;
    realizedDiscountPaise: bigint | null;
    rewardVariantId: string | null;
    rewardUnitId: string | null;
    rewardQuantity: number | null;
    rewardBasePaise: bigint | null;
    sortOrder: number;
  }>[];
  taxComponents: readonly Readonly<{
    id: string;
    targetContext: string;
    taxType: string;
    rateBps: number;
    taxableAmountPaise: bigint;
    taxAmountPaise: bigint;
    sortOrder: number;
  }>[];
  expiresAt: Date;
  updatedAt: Date;
}>;

function mapCoordinates(
  latitude: string | null,
  longitude: string | null,
): CheckoutDestination["coordinates"] {
  if (latitude === null || longitude === null) return null;
  return Object.freeze({ latitude, longitude });
}

export function mapDestinationRow(
  row: CheckoutDestinationRow,
): CheckoutDestination {
  return Object.freeze({
    destinationKind: row.destinationKind as CheckoutDestination["destinationKind"],
    sourceSavedAddressId: row.sourceSavedAddressId,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    landmark: row.landmark,
    locality: row.locality,
    city: row.city,
    stateCode: row.stateCode,
    postalCode: row.postalCode,
    coordinates: mapCoordinates(row.latitude, row.longitude),
    label: row.label,
  });
}

function mapDestinationFromSnapshot(
  row: CheckoutSnapshotRow,
): CheckoutDestination {
  return Object.freeze({
    destinationKind: row.destinationKind as CheckoutDestination["destinationKind"],
    sourceSavedAddressId: row.sourceSavedAddressId,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    landmark: row.landmark,
    locality: row.locality,
    city: row.city,
    stateCode: row.stateCode,
    postalCode: row.postalCode,
    coordinates: mapCoordinates(row.latitude, row.longitude),
    label: row.label,
  });
}

export async function lockCheckoutForUpdate(
  context: PersistenceTransactionContext,
  checkoutId: string,
): Promise<CheckoutRow | null> {
  assertTransactionContext(context, "lockCheckoutForUpdate");
  const rows = await context.db
    .select()
    .from(checkoutsTable)
    .where(eq(checkoutsTable.id, checkoutId))
    .for("update");
  return rows[0] ?? null;
}

export async function findCheckoutRowById(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<CheckoutRow | null> {
  assertApplicationRole(context, "findCheckoutRowById");
  const rows = await context.db
    .select()
    .from(checkoutsTable)
    .where(eq(checkoutsTable.id, checkoutId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findActiveNonTerminalForCart(
  context: PersistenceQueryContext,
  cartId: string,
): Promise<CheckoutRow | null> {
  assertApplicationRole(context, "findActiveNonTerminalForCart");
  const rows = await context.db
    .select()
    .from(checkoutsTable)
    .where(
      and(
        eq(checkoutsTable.cartId, cartId),
        inArray(checkoutsTable.status, [
          "DRAFT",
          "READY_FOR_PAYMENT",
          "PAYMENT_PENDING",
        ]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertDraftCheckout(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    customerAuthUserId: string;
    brandId: string;
    cartId: string;
    sourceCartRevision: bigint;
    expiresAt: Date;
    now: Date;
  },
): Promise<CheckoutRow> {
  assertTransactionContext(context, "insertDraftCheckout");
  const rows = await context.db
    .insert(checkoutsTable)
    .values({
      id: input.id,
      customerAuthUserId: input.customerAuthUserId,
      brandId: input.brandId,
      cartId: input.cartId,
      sourceCartRevision: input.sourceCartRevision,
      revision: BigInt(1),
      status: "DRAFT",
      expiresAt: input.expiresAt,
      activeSnapshotId: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  return rows[0]!;
}

export async function markCheckoutExpired(
  context: PersistenceTransactionContext,
  row: CheckoutRow,
  now: Date,
): Promise<CheckoutRow> {
  assertTransactionContext(context, "markCheckoutExpired");
  const rows = await context.db
    .update(checkoutsTable)
    .set({
      status: "EXPIRED",
      activeSnapshotId: null,
      revision: row.revision + BigInt(1),
      updatedAt: now,
    })
    .where(eq(checkoutsTable.id, row.id))
    .returning();
  return rows[0]!;
}

export async function markCheckoutCancelled(
  context: PersistenceTransactionContext,
  row: CheckoutRow,
  now: Date,
): Promise<CheckoutRow> {
  assertTransactionContext(context, "markCheckoutCancelled");
  const rows = await context.db
    .update(checkoutsTable)
    .set({
      status: "CANCELLED",
      activeSnapshotId: null,
      revision: row.revision + BigInt(1),
      updatedAt: now,
    })
    .where(eq(checkoutsTable.id, row.id))
    .returning();
  return rows[0]!;
}

export async function invalidateReadyToDraft(
  context: PersistenceTransactionContext,
  row: CheckoutRow,
  now: Date,
): Promise<CheckoutRow> {
  assertTransactionContext(context, "invalidateReadyToDraft");
  const rows = await context.db
    .update(checkoutsTable)
    .set({
      status: "DRAFT",
      activeSnapshotId: null,
      revision: row.revision + BigInt(1),
      updatedAt: now,
    })
    .where(eq(checkoutsTable.id, row.id))
    .returning();
  return rows[0]!;
}

export async function findDestinationByCheckoutId(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<CheckoutDestinationRow | null> {
  assertApplicationRole(context, "findDestinationByCheckoutId");
  const rows = await context.db
    .select()
    .from(checkoutDeliveryDestinationsTable)
    .where(eq(checkoutDeliveryDestinationsTable.checkoutId, checkoutId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertDestination(
  context: PersistenceTransactionContext,
  checkoutId: string,
  destination: CheckoutDestination,
  now: Date,
): Promise<void> {
  assertTransactionContext(context, "upsertDestination");
  const values = {
    checkoutId,
    destinationKind: destination.destinationKind,
    sourceSavedAddressId: destination.sourceSavedAddressId,
    recipientName: destination.recipientName,
    recipientPhone: destination.recipientPhone,
    addressLine1: destination.addressLine1,
    addressLine2: destination.addressLine2,
    landmark: destination.landmark,
    locality: destination.locality,
    city: destination.city,
    stateCode: destination.stateCode,
    postalCode: destination.postalCode,
    latitude: destination.coordinates?.latitude ?? null,
    longitude: destination.coordinates?.longitude ?? null,
    label: destination.label,
    createdAt: now,
    updatedAt: now,
  };
  await context.db
    .insert(checkoutDeliveryDestinationsTable)
    .values(values)
    .onConflictDoUpdate({
      target: checkoutDeliveryDestinationsTable.checkoutId,
      set: {
        destinationKind: values.destinationKind,
        sourceSavedAddressId: values.sourceSavedAddressId,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        landmark: values.landmark,
        locality: values.locality,
        city: values.city,
        stateCode: values.stateCode,
        postalCode: values.postalCode,
        latitude: values.latitude,
        longitude: values.longitude,
        label: values.label,
        updatedAt: now,
      },
    });
}

export async function clearDestination(
  context: PersistenceTransactionContext,
  checkoutId: string,
): Promise<boolean> {
  assertTransactionContext(context, "clearDestination");
  const deleted = await context.db
    .delete(checkoutDeliveryDestinationsTable)
    .where(eq(checkoutDeliveryDestinationsTable.checkoutId, checkoutId))
    .returning({ checkoutId: checkoutDeliveryDestinationsTable.checkoutId });
  return deleted.length > 0;
}

export async function bumpCheckoutRevisionAfterDestinationChange(
  context: PersistenceTransactionContext,
  row: CheckoutRow,
  now: Date,
  clearReady: boolean,
): Promise<CheckoutRow> {
  assertTransactionContext(context, "bumpCheckoutRevisionAfterDestinationChange");
  const rows = await context.db
    .update(checkoutsTable)
    .set({
      revision: row.revision + BigInt(1),
      updatedAt: now,
      ...(clearReady
        ? { status: "DRAFT" as const, activeSnapshotId: null }
        : {}),
    })
    .where(eq(checkoutsTable.id, row.id))
    .returning();
  return rows[0]!;
}

export async function commitReadySnapshot(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  payload: SnapshotCommitPayload,
): Promise<CheckoutRow> {
  assertTransactionContext(context, "commitReadySnapshot");
  const dest = payload.destination;

  await context.db.insert(checkoutSnapshotsTable).values({
    id: payload.snapshotId,
    checkoutId: checkout.id,
    checkoutRevision: payload.checkoutRevision,
    sourceCartRevision: payload.sourceCartRevision,
    selectedOutletId: payload.selectedOutletId,
    evaluatedAt: payload.evaluatedAt,
    serviceabilityEvaluatedAt: payload.serviceabilityEvaluatedAt,
    currency: payload.currency,
    manualCouponCode: payload.manualCouponCode,
    destinationKind: dest.destinationKind,
    sourceSavedAddressId: dest.sourceSavedAddressId,
    recipientName: dest.recipientName,
    recipientPhone: dest.recipientPhone,
    addressLine1: dest.addressLine1,
    addressLine2: dest.addressLine2,
    landmark: dest.landmark,
    locality: dest.locality,
    city: dest.city,
    stateCode: dest.stateCode,
    postalCode: dest.postalCode,
    latitude: dest.coordinates?.latitude ?? null,
    longitude: dest.coordinates?.longitude ?? null,
    label: dest.label,
    basePaise: payload.basePaise,
    modifierAdjustmentsPaise: payload.modifierAdjustmentsPaise,
    bundleAdjustmentsPaise: payload.bundleAdjustmentsPaise,
    chargesPaise: payload.chargesPaise,
    prePromotionSubtotalPaise: payload.prePromotionSubtotalPaise,
    promotionDiscountPaise: payload.promotionDiscountPaise,
    taxablePaise: payload.taxablePaise,
    taxPaise: payload.taxPaise,
    grandTotalPaise: payload.grandTotalPaise,
    taxInclusionMode: payload.taxInclusionMode,
    createdAt: payload.createdAt,
  });

  for (const line of payload.lines) {
    await context.db.insert(checkoutSnapshotLinesTable).values({
      id: line.id,
      snapshotId: payload.snapshotId,
      sourceCartLineId: line.sourceCartLineId,
      productId: line.productId,
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
      quantity: line.quantity,
      lineBasePaise: line.lineBasePaise,
      lineModifierAdjustmentsPaise: line.lineModifierAdjustmentsPaise,
      lineBundleAdjustmentsPaise: line.lineBundleAdjustmentsPaise,
      lineSubtotalPaise: line.lineSubtotalPaise,
      linePromotionDiscountPaise: line.linePromotionDiscountPaise,
      lineTaxablePaise: line.lineTaxablePaise,
      lineTaxPaise: line.lineTaxPaise,
      lineTotalPaise: line.lineTotalPaise,
      sequence: line.sequence,
    });

    if (line.modifiers.length > 0) {
      await context.db.insert(checkoutSnapshotLineModifierSelectionsTable).values(
        line.modifiers.map((m) => ({
          snapshotLineId: line.id,
          variantModifierGroupId: m.variantModifierGroupId,
          modifierGroupOptionId: m.modifierGroupOptionId,
          quantity: m.quantity,
          groupName: m.groupName,
          optionName: m.optionName,
          unitDeltaPaise: m.unitDeltaPaise,
        })),
      );
    }

    for (const bundle of line.bundleSelections) {
      await context.db.insert(checkoutSnapshotLineBundleSelectionsTable).values({
        id: bundle.id,
        snapshotLineId: line.id,
        bundleGroupOptionId: bundle.bundleGroupOptionId,
        selectedVariantId: bundle.selectedVariantId,
        quantity: bundle.quantity,
        groupName: bundle.groupName,
        optionName: bundle.optionName,
        variantName: bundle.variantName,
        unitDeltaPaise: bundle.unitDeltaPaise,
      });
      if (bundle.modifiers.length > 0) {
        await context.db
          .insert(checkoutSnapshotLineBundleModifierSelectionsTable)
          .values(
            bundle.modifiers.map((m) => ({
              snapshotLineBundleSelectionId: bundle.id,
              variantModifierGroupId: m.variantModifierGroupId,
              modifierGroupOptionId: m.modifierGroupOptionId,
              quantity: m.quantity,
              groupName: m.groupName,
              optionName: m.optionName,
              unitDeltaPaise: m.unitDeltaPaise,
            })),
          );
      }
    }
  }

  if (payload.charges.length > 0) {
    await context.db.insert(checkoutSnapshotChargesTable).values(
      payload.charges.map((c) => ({
        id: c.id,
        snapshotId: payload.snapshotId,
        chargeDefinitionId: c.chargeDefinitionId,
        chargeCode: c.chargeCode,
        calculationMode: c.calculationMode,
        amountPaise: c.amountPaise,
        name: c.name,
        sortOrder: c.sortOrder,
      })),
    );
  }

  if (payload.promotionEffects.length > 0) {
    await context.db.insert(checkoutSnapshotPromotionEffectsTable).values(
      payload.promotionEffects.map((e) => ({
        id: e.id,
        snapshotId: payload.snapshotId,
        effectKind: e.effectKind,
        promotionId: e.promotionId,
        couponId: e.couponId,
        promotionCode: e.promotionCode,
        displayName: e.displayName,
        triggerType: e.triggerType,
        stackingPolicy: e.stackingPolicy,
        componentId: e.componentId,
        lineId: e.lineId,
        amountPaise: e.amountPaise,
        realizedDiscountPaise: e.realizedDiscountPaise,
        rewardVariantId: e.rewardVariantId,
        rewardUnitId: e.rewardUnitId,
        rewardQuantity: e.rewardQuantity,
        rewardBasePaise: e.rewardBasePaise,
        sortOrder: e.sortOrder,
      })),
    );
  }

  if (payload.taxComponents.length > 0) {
    await context.db.insert(checkoutSnapshotTaxComponentsTable).values(
      payload.taxComponents.map((t) => ({
        id: t.id,
        snapshotId: payload.snapshotId,
        targetContext: t.targetContext,
        taxType: t.taxType,
        rateBps: t.rateBps,
        taxableAmountPaise: t.taxableAmountPaise,
        taxAmountPaise: t.taxAmountPaise,
        sortOrder: t.sortOrder,
      })),
    );
  }

  const rows = await context.db
    .update(checkoutsTable)
    .set({
      status: "READY_FOR_PAYMENT",
      activeSnapshotId: payload.snapshotId,
      revision: payload.checkoutRevision,
      sourceCartRevision: payload.sourceCartRevision,
      expiresAt: payload.expiresAt,
      updatedAt: payload.updatedAt,
    })
    .where(eq(checkoutsTable.id, checkout.id))
    .returning();
  return rows[0]!;
}

async function loadSnapshotAggregate(
  context: PersistenceQueryContext,
  snapshotRow: CheckoutSnapshotRow,
): Promise<CheckoutSnapshot> {
  const lineRows = await context.db
    .select()
    .from(checkoutSnapshotLinesTable)
    .where(eq(checkoutSnapshotLinesTable.snapshotId, snapshotRow.id))
    .orderBy(asc(checkoutSnapshotLinesTable.sequence), asc(checkoutSnapshotLinesTable.id));

  const lineIds = lineRows.map((l) => l.id);
  const modifierRows =
    lineIds.length === 0
      ? []
      : await context.db
          .select()
          .from(checkoutSnapshotLineModifierSelectionsTable)
          .where(
            inArray(
              checkoutSnapshotLineModifierSelectionsTable.snapshotLineId,
              lineIds,
            ),
          );
  const bundleRows =
    lineIds.length === 0
      ? []
      : await context.db
          .select()
          .from(checkoutSnapshotLineBundleSelectionsTable)
          .where(
            inArray(checkoutSnapshotLineBundleSelectionsTable.snapshotLineId, lineIds),
          )
          .orderBy(asc(checkoutSnapshotLineBundleSelectionsTable.id));
  const bundleIds = bundleRows.map((b) => b.id);
  const bundleModRows =
    bundleIds.length === 0
      ? []
      : await context.db
          .select()
          .from(checkoutSnapshotLineBundleModifierSelectionsTable)
          .where(
            inArray(
              checkoutSnapshotLineBundleModifierSelectionsTable.snapshotLineBundleSelectionId,
              bundleIds,
            ),
          );

  const modifiersByLine = new Map<string, CheckoutSnapshotModifierSelection[]>();
  for (const m of modifierRows) {
    const list = modifiersByLine.get(m.snapshotLineId) ?? [];
    list.push(
      Object.freeze({
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
        groupName: m.groupName,
        optionName: m.optionName,
        unitDeltaPaise: m.unitDeltaPaise,
      }),
    );
    modifiersByLine.set(m.snapshotLineId, list);
  }

  const bundleModsByBundle = new Map<
    string,
    CheckoutSnapshotBundleSelection["modifiers"][number][]
  >();
  for (const m of bundleModRows) {
    const list = bundleModsByBundle.get(m.snapshotLineBundleSelectionId) ?? [];
    list.push(
      Object.freeze({
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
        groupName: m.groupName,
        optionName: m.optionName,
        unitDeltaPaise: m.unitDeltaPaise,
      }),
    );
    bundleModsByBundle.set(m.snapshotLineBundleSelectionId, list);
  }

  const bundlesByLine = new Map<string, CheckoutSnapshotBundleSelection[]>();
  for (const b of bundleRows) {
    const list = bundlesByLine.get(b.snapshotLineId) ?? [];
    list.push(
      Object.freeze({
        id: b.id,
        bundleGroupOptionId: b.bundleGroupOptionId,
        selectedVariantId: b.selectedVariantId,
        quantity: b.quantity,
        groupName: b.groupName,
        optionName: b.optionName,
        variantName: b.variantName,
        unitDeltaPaise: b.unitDeltaPaise,
        modifiers: Object.freeze(bundleModsByBundle.get(b.id) ?? []),
      }),
    );
    bundlesByLine.set(b.snapshotLineId, list);
  }

  const lines: CheckoutSnapshotLine[] = lineRows.map((l) =>
    Object.freeze({
      id: l.id,
      sourceCartLineId: l.sourceCartLineId,
      productId: l.productId,
      variantId: l.variantId,
      productName: l.productName,
      variantName: l.variantName,
      quantity: l.quantity,
      lineBasePaise: l.lineBasePaise,
      lineModifierAdjustmentsPaise: l.lineModifierAdjustmentsPaise,
      lineBundleAdjustmentsPaise: l.lineBundleAdjustmentsPaise,
      lineSubtotalPaise: l.lineSubtotalPaise,
      linePromotionDiscountPaise: l.linePromotionDiscountPaise,
      lineTaxablePaise: l.lineTaxablePaise,
      lineTaxPaise: l.lineTaxPaise,
      lineTotalPaise: l.lineTotalPaise,
      sequence: l.sequence,
      modifiers: Object.freeze(modifiersByLine.get(l.id) ?? []),
      bundleSelections: Object.freeze(bundlesByLine.get(l.id) ?? []),
    }),
  );

  const chargeRows = await context.db
    .select()
    .from(checkoutSnapshotChargesTable)
    .where(eq(checkoutSnapshotChargesTable.snapshotId, snapshotRow.id))
    .orderBy(asc(checkoutSnapshotChargesTable.sortOrder), asc(checkoutSnapshotChargesTable.id));
  const charges: CheckoutSnapshotCharge[] = chargeRows.map((c) =>
    Object.freeze({
      id: c.id,
      chargeDefinitionId: c.chargeDefinitionId,
      chargeCode: c.chargeCode as CheckoutSnapshotCharge["chargeCode"],
      calculationMode: c.calculationMode as CheckoutSnapshotCharge["calculationMode"],
      amountPaise: c.amountPaise,
      name: c.name,
      sortOrder: c.sortOrder,
    }),
  );

  const effectRows = await context.db
    .select()
    .from(checkoutSnapshotPromotionEffectsTable)
    .where(eq(checkoutSnapshotPromotionEffectsTable.snapshotId, snapshotRow.id))
    .orderBy(
      asc(checkoutSnapshotPromotionEffectsTable.sortOrder),
      asc(checkoutSnapshotPromotionEffectsTable.id),
    );
  const promotionEffects: CheckoutSnapshotPromotionEffect[] = effectRows.map((e) =>
    Object.freeze({
      id: e.id,
      effectKind: e.effectKind as CheckoutSnapshotPromotionEffect["effectKind"],
      promotionId: e.promotionId,
      couponId: e.couponId,
      promotionCode: e.promotionCode,
      displayName: e.displayName,
      triggerType: e.triggerType,
      stackingPolicy: e.stackingPolicy,
      componentId: e.componentId,
      lineId: e.lineId,
      amountPaise: e.amountPaise,
      realizedDiscountPaise: e.realizedDiscountPaise,
      rewardVariantId: e.rewardVariantId,
      rewardUnitId: e.rewardUnitId,
      rewardQuantity: e.rewardQuantity,
      rewardBasePaise: e.rewardBasePaise,
      sortOrder: e.sortOrder,
    }),
  );

  const taxRows = await context.db
    .select()
    .from(checkoutSnapshotTaxComponentsTable)
    .where(eq(checkoutSnapshotTaxComponentsTable.snapshotId, snapshotRow.id))
    .orderBy(
      asc(checkoutSnapshotTaxComponentsTable.sortOrder),
      asc(checkoutSnapshotTaxComponentsTable.id),
    );
  const taxComponents: CheckoutSnapshotTaxComponent[] = taxRows.map((t) =>
    Object.freeze({
      id: t.id,
      targetContext: t.targetContext,
      taxType: t.taxType,
      rateBps: t.rateBps,
      taxableAmountPaise: t.taxableAmountPaise,
      taxAmountPaise: t.taxAmountPaise,
      sortOrder: t.sortOrder,
    }),
  );

  return Object.freeze({
    id: snapshotRow.id,
    checkoutId: snapshotRow.checkoutId,
    checkoutRevision: snapshotRow.checkoutRevision,
    sourceCartRevision: snapshotRow.sourceCartRevision,
    selectedOutletId: snapshotRow.selectedOutletId,
    evaluatedAt: snapshotRow.evaluatedAt,
    serviceabilityEvaluatedAt: snapshotRow.serviceabilityEvaluatedAt,
    currency: "INR",
    manualCouponCode: snapshotRow.manualCouponCode,
    destination: mapDestinationFromSnapshot(snapshotRow),
    basePaise: snapshotRow.basePaise,
    modifierAdjustmentsPaise: snapshotRow.modifierAdjustmentsPaise,
    bundleAdjustmentsPaise: snapshotRow.bundleAdjustmentsPaise,
    chargesPaise: snapshotRow.chargesPaise,
    prePromotionSubtotalPaise: snapshotRow.prePromotionSubtotalPaise,
    promotionDiscountPaise: snapshotRow.promotionDiscountPaise,
    taxablePaise: snapshotRow.taxablePaise,
    taxPaise: snapshotRow.taxPaise,
    grandTotalPaise: snapshotRow.grandTotalPaise,
    taxInclusionMode:
      snapshotRow.taxInclusionMode as CheckoutSnapshot["taxInclusionMode"],
    createdAt: snapshotRow.createdAt,
    lines: Object.freeze(lines),
    charges: Object.freeze(charges),
    promotionEffects: Object.freeze(promotionEffects),
    taxComponents: Object.freeze(taxComponents),
  });
}

export async function loadActiveSnapshot(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<CheckoutSnapshot | null> {
  assertApplicationRole(context, "loadActiveSnapshot");
  const rows = await context.db
    .select()
    .from(checkoutSnapshotsTable)
    .where(eq(checkoutSnapshotsTable.id, snapshotId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return loadSnapshotAggregate(context, row);
}

export async function loadCheckoutAggregate(
  context: PersistenceQueryContext,
  row: CheckoutRow,
): Promise<Checkout> {
  assertApplicationRole(context, "loadCheckoutAggregate");
  const destRow = await findDestinationByCheckoutId(context, row.id);
  const activeSnapshot =
    row.activeSnapshotId === null
      ? null
      : await loadActiveSnapshot(context, row.activeSnapshotId);

  return Object.freeze({
    id: row.id,
    customerAuthUserId: row.customerAuthUserId,
    brandId: row.brandId,
    cartId: row.cartId,
    sourceCartRevision: row.sourceCartRevision,
    revision: row.revision,
    status: row.status as CheckoutStatus,
    expiresAt: row.expiresAt,
    activeSnapshotId: row.activeSnapshotId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    destination: destRow ? mapDestinationRow(destRow) : null,
    activeSnapshot,
  });
}

export function newCheckoutId(): string {
  return randomUUID();
}

export function newSnapshotId(): string {
  return randomUUID();
}
