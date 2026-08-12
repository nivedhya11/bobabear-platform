/**
 * Promotion target set resolution (IMP-016).
 */
import { PromotionAdminError, PromotionFatalError } from "./errors";
import type {
  MonetaryComponent,
  PrePromotionSnapshot,
  PromotionDefinition,
  PromotionTargetConfig,
  SnapshotLineUnit,
} from "./types";

export function assertNoAmbiguousMerchandiseTargets(
  targets: readonly PromotionTargetConfig[],
  roleLabel: string,
): void {
  const hasAll = targets.some((t) => t.targetType === "all_merchandise");
  const hasExplicitMerchandise = targets.some(
    (t) => t.targetType === "product" || t.targetType === "variant",
  );
  if (hasAll && hasExplicitMerchandise) {
    throw new PromotionAdminError(
      "PROMOTION_TARGET_AMBIGUOUS",
      `${roleLabel}: all_merchandise cannot combine with product/variant targets.`,
    );
  }
}

export function unitMatchesTargets(
  unit: SnapshotLineUnit,
  targets: readonly PromotionTargetConfig[],
): boolean {
  if (targets.some((t) => t.targetType === "all_merchandise")) return true;
  for (const t of targets) {
    if (t.targetType === "product" && t.productId === unit.productId) return true;
    if (t.targetType === "variant" && t.variantId === unit.variantId) return true;
  }
  return false;
}

export function componentMatchesBenefitTargets(
  component: MonetaryComponent,
  targets: readonly PromotionTargetConfig[],
  benefit: PromotionDefinition["benefit"],
): boolean {
  const hasAllMerchandise = targets.some((t) => t.targetType === "all_merchandise");
  const chargeIds = new Set(
    targets.filter((t) => t.targetType === "charge" && t.chargeDefinitionId).map((t) => t.chargeDefinitionId!),
  );
  const productIds = new Set(
    targets.filter((t) => t.targetType === "product" && t.productId).map((t) => t.productId!),
  );
  const variantIds = new Set(
    targets.filter((t) => t.targetType === "variant" && t.variantId).map((t) => t.variantId!),
  );

  if (component.kind === "charge") {
    return (
      component.chargeDefinitionId !== null && chargeIds.has(component.chargeDefinitionId)
    );
  }

  const merchandiseMatch =
    hasAllMerchandise ||
    (component.productId !== null && productIds.has(component.productId)) ||
    (component.variantId !== null && variantIds.has(component.variantId));

  if (!merchandiseMatch) return false;

  if (component.kind === "variant_base") return true;
  if (component.kind === "modifier") {
    return hasAllMerchandise || benefit.includeModifiers;
  }
  if (component.kind === "bundle_delta") {
    return hasAllMerchandise || benefit.includeBundleDeltas;
  }
  return false;
}

export function resolveQualifierUnits(
  snapshot: PrePromotionSnapshot,
  targets: readonly PromotionTargetConfig[],
): SnapshotLineUnit[] {
  const seen = new Set<string>();
  const out: SnapshotLineUnit[] = [];
  for (const unit of snapshot.units) {
    if (!unitMatchesTargets(unit, targets)) continue;
    if (seen.has(unit.unitId)) continue;
    seen.add(unit.unitId);
    out.push(unit);
  }
  return out;
}

export function resolveBenefitComponents(
  snapshot: PrePromotionSnapshot,
  promotion: PromotionDefinition,
): MonetaryComponent[] {
  const seen = new Set<string>();
  const out: MonetaryComponent[] = [];
  for (const component of snapshot.components) {
    if (!componentMatchesBenefitTargets(component, promotion.benefitTargets, promotion.benefit)) {
      continue;
    }
    if (seen.has(component.componentId)) continue;
    seen.add(component.componentId);
    out.push(component);
  }
  return out;
}

export function qualifyingAmountPaise(
  snapshot: PrePromotionSnapshot,
  qualifierTargets: readonly PromotionTargetConfig[],
): bigint {
  const hasAll = qualifierTargets.some((t) => t.targetType === "all_merchandise");
  const productIds = new Set(
    qualifierTargets.filter((t) => t.targetType === "product").map((t) => t.productId!),
  );
  const variantIds = new Set(
    qualifierTargets.filter((t) => t.targetType === "variant").map((t) => t.variantId!),
  );
  const chargeIds = new Set(
    qualifierTargets.filter((t) => t.targetType === "charge").map((t) => t.chargeDefinitionId!),
  );

  let total = BigInt(0);
  const counted = new Set<string>();
  for (const c of snapshot.components) {
    if (counted.has(c.componentId)) continue;
    let match = false;
    if (c.kind === "charge") {
      match = c.chargeDefinitionId !== null && chargeIds.has(c.chargeDefinitionId);
    } else if (
      c.kind === "variant_base" ||
      c.kind === "modifier" ||
      c.kind === "bundle_delta"
    ) {
      match =
        hasAll ||
        (c.productId !== null && productIds.has(c.productId)) ||
        (c.variantId !== null && variantIds.has(c.variantId));
    }
    if (!match) continue;
    counted.add(c.componentId);
    total += c.amountPaise;
  }
  return total;
}

export function assertBogoTargetRelationship(
  qualifierTargets: readonly PromotionTargetConfig[],
  benefitTargets: readonly PromotionTargetConfig[],
  snapshotProductVariantIndex?: ReadonlyMap<string, string>,
): "identical" | "disjoint" {
  // Compare canonical merchandise identity sets via target descriptors.
  const keyOf = (t: PromotionTargetConfig): string => {
    if (t.targetType === "all_merchandise") return "all";
    if (t.targetType === "product") return `p:${t.productId}`;
    if (t.targetType === "variant") return `v:${t.variantId}`;
    if (t.targetType === "charge") return `c:${t.chargeDefinitionId}`;
    return "?";
  };
  const q = new Set(
    qualifierTargets
      .filter((t) => t.targetType !== "charge")
      .map(keyOf)
      .sort(),
  );
  const b = new Set(
    benefitTargets
      .filter((t) => t.targetType !== "charge")
      .map(keyOf)
      .sort(),
  );

  const qList = [...q].sort();
  const bList = [...b].sort();
  const identical =
    qList.length === bList.length && qList.every((v, i) => v === bList[i]);
  if (identical) return "identical";

  // Expand product→variant if index provided for overlap detection on concrete variants.
  if (snapshotProductVariantIndex && snapshotProductVariantIndex.size > 0) {
    const expand = (targets: readonly PromotionTargetConfig[]): Set<string> => {
      const ids = new Set<string>();
      for (const t of targets) {
        if (t.targetType === "all_merchandise") {
          for (const vid of snapshotProductVariantIndex.keys()) ids.add(vid);
        } else if (t.targetType === "variant" && t.variantId) {
          ids.add(t.variantId);
        } else if (t.targetType === "product" && t.productId) {
          for (const [vid, pid] of snapshotProductVariantIndex) {
            if (pid === t.productId) ids.add(vid);
          }
        }
      }
      return ids;
    };
    const qv = expand(qualifierTargets);
    const bv = expand(benefitTargets);
    let overlap = false;
    for (const id of qv) {
      if (bv.has(id)) {
        overlap = true;
        break;
      }
    }
    const same =
      qv.size === bv.size && [...qv].every((id) => bv.has(id));
    if (same) return "identical";
    if (overlap) {
      throw new PromotionAdminError(
        "PROMOTION_BOGO_TARGET_OVERLAP_INVALID",
        "BOGO qualifier and benefit targets partially overlap.",
      );
    }
    return "disjoint";
  }

  // Without expansion: any shared key ⇒ overlap unless identical (already handled)
  for (const k of q) {
    if (b.has(k)) {
      throw new PromotionAdminError(
        "PROMOTION_BOGO_TARGET_OVERLAP_INVALID",
        "BOGO qualifier and benefit targets partially overlap.",
      );
    }
  }
  return "disjoint";
}

export function assertActivePromotionIntegrity(promotion: PromotionDefinition): void {
  if (promotion.status !== "active" && promotion.status !== "retired") {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "Sealed promotion must be active or retired.",
    );
  }
  if (!promotion.benefit) {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "Active promotion missing benefit.",
    );
  }
  if (promotion.qualifierTargets.length < 1 || promotion.benefitTargets.length < 1) {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "Active promotion missing targets.",
    );
  }
  if (
    promotion.benefit.benefitType === "buy_x_get_y" &&
    promotion.stackingPolicy !== "exclusive"
  ) {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "Active BOGO must be exclusive.",
    );
  }
}
