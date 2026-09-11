/**
 * Catalog-scoped consequence preview for deliberate publication (IMP-036F F2).
 *
 * Read/validate only — no persistent review store. Returns the authoritative
 * Brand envelope `expectedContentRevision` that `publishCatalogContentChange`
 * must consume.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { catalogContentRevisionsTable } from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { requireCatalogRead } from "./authorize-catalog";
import { CatalogNotFoundError, CatalogValidationError } from "./errors";
import { assertUuid } from "./lifecycle";
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierGroupOptionContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
  loadEffectiveVariantModifierGroupContent,
} from "./revisions";
import { getCatalogProductGraph } from "./reads";
import { assertProductGraphReady } from "./validation";

export type CatalogPublicationEntityChange = Readonly<{
  entityKind:
    | "product"
    | "variant"
    | "modifier_group"
    | "modifier_option"
    | "modifier_group_option"
    | "variant_modifier_group";
  entityId: string;
  changeType: "content" | "lifecycle_activate" | "lifecycle_retire" | "lifecycle_draft" | "binding";
  summary: string;
}>;

export type PreviewCatalogPublicationConsequenceInput = Readonly<{
  actor: unknown;
  brandId: string;
  productId: string;
}>;

export type PreviewCatalogPublicationConsequenceResult = Readonly<{
  brandId: string;
  productId: string;
  productCode: string;
  expectedContentRevision: string;
  wouldChangeCustomerTruth: boolean;
  validationOk: boolean;
  validationBlockers: readonly string[];
  changes: readonly CatalogPublicationEntityChange[];
  operation: "catalog_content_publish";
}>;

async function readBrandEnvelopeRevision(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<bigint> {
  const rows = await context.db
    .select()
    .from(catalogContentRevisionsTable)
    .where(eq(catalogContentRevisionsTable.brandId, brandId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // Envelope is created on first material draft; absent means no candidate yet.
    return BigInt(0);
  }
  return row.contentRevision;
}

function sameOptionalString(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

/**
 * Bounded Catalog consequence projection for a product-rooted publication.
 */
export async function previewCatalogPublicationConsequence(
  context: PersistenceQueryContext,
  input: PreviewCatalogPublicationConsequenceInput,
): Promise<PreviewCatalogPublicationConsequenceResult> {
  assertApplicationRole(context, "previewCatalogPublicationConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  const productId = assertUuid(input.productId, "productId");
  await requireCatalogRead(context, input.actor, brandId);

  const graph = await getCatalogProductGraph(context, {
    actor: input.actor,
    productId,
  });
  if (graph.product.brandId !== brandId) {
    throw new CatalogNotFoundError("product");
  }

  const expectedContentRevision = await readBrandEnvelopeRevision(context, brandId);
  const changes: CatalogPublicationEntityChange[] = [];

  const effectiveProduct = await loadEffectiveProductContent(context, graph.product);
  if (graph.product.lifecycleStatus === "retired" && graph.product.effectiveContentRevision != null) {
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      changeType: "lifecycle_retire",
      summary: `Product ${graph.product.code} staged RETIRED; customer visibility withdraws on publish.`,
    });
  } else if (
    graph.product.lifecycleStatus === "active" &&
    (effectiveProduct == null ||
      effectiveProduct.name !== graph.product.name ||
      !sameOptionalString(effectiveProduct.description, graph.product.description))
  ) {
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      changeType: effectiveProduct == null ? "lifecycle_activate" : "content",
      summary:
        effectiveProduct == null
          ? `Product ${graph.product.code} first EFFECTIVE publication candidate.`
          : `Product ${graph.product.code} draft content differs from effective customer truth.`,
    });
  } else if (graph.product.lifecycleStatus === "draft" && graph.product.effectiveContentRevision == null) {
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      changeType: "lifecycle_draft",
      summary: `Product ${graph.product.code} remains DRAFT; not customer-visible until activated and published.`,
    });
  }

  for (const variant of graph.variants) {
    const effective = await loadEffectiveVariantContent(context, variant);
    if (variant.lifecycleStatus === "retired" && variant.effectiveContentRevision != null) {
      changes.push({
        entityKind: "variant",
        entityId: variant.id,
        changeType: "lifecycle_retire",
        summary: `Variant ${variant.code} staged RETIRED; customer resolution withdraws on publish.`,
      });
      continue;
    }
    if (variant.lifecycleStatus !== "active") continue;
    const contentDiffers =
      effective == null ||
      effective.name !== variant.name ||
      !sameOptionalString(effective.description, variant.description) ||
      effective.isDefault !== variant.isDefault ||
      effective.isSelectorVisible !== variant.isSelectorVisible;
    if (contentDiffers) {
      changes.push({
        entityKind: "variant",
        entityId: variant.id,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary:
          effective == null
            ? `Variant ${variant.code} first EFFECTIVE publication candidate.`
            : `Variant ${variant.code} draft content/default/selector differs from effective truth.`,
      });
    }
  }

  for (const group of graph.modifierGroups) {
    const effective = await loadEffectiveModifierGroupContent(context, group);
    if (group.lifecycleStatus === "retired" && group.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_group",
        entityId: group.id,
        changeType: "lifecycle_retire",
        summary: `Modifier group ${group.code} staged RETIRED.`,
      });
      continue;
    }
    if (group.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.name !== group.name ||
      !sameOptionalString(effective.description, group.description)
    ) {
      changes.push({
        entityKind: "modifier_group",
        entityId: group.id,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary: `Modifier group ${group.code} draft differs from effective truth.`,
      });
    }
  }

  for (const option of graph.modifierOptions) {
    const effective = await loadEffectiveModifierOptionContent(context, option);
    if (option.lifecycleStatus === "retired" && option.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_option",
        entityId: option.id,
        changeType: "lifecycle_retire",
        summary: `Modifier option ${option.code} staged RETIRED.`,
      });
      continue;
    }
    if (option.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.name !== option.name ||
      !sameOptionalString(effective.description, option.description)
    ) {
      changes.push({
        entityKind: "modifier_option",
        entityId: option.id,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary: `Modifier option ${option.code} draft differs from effective truth.`,
      });
    }
  }

  for (const binding of graph.modifierGroupOptions) {
    const effective = await loadEffectiveModifierGroupOptionContent(context, binding);
    if (binding.lifecycleStatus === "retired" && binding.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_group_option",
        entityId: binding.id,
        changeType: "lifecycle_retire",
        summary: "Group↔Option binding staged RETIRED.",
      });
      continue;
    }
    if (binding.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.minQuantity !== binding.minQuantity ||
      effective.maxQuantity !== binding.maxQuantity ||
      effective.defaultQuantity !== binding.defaultQuantity ||
      effective.position !== binding.position
    ) {
      changes.push({
        entityKind: "modifier_group_option",
        entityId: binding.id,
        changeType: effective == null ? "binding" : "content",
        summary: "Group↔Option cardinality/position draft differs from effective truth.",
      });
    }
  }

  for (const binding of graph.variantModifierGroups) {
    const effective = await loadEffectiveVariantModifierGroupContent(context, binding);
    if (binding.lifecycleStatus === "retired" && binding.effectiveContentRevision != null) {
      changes.push({
        entityKind: "variant_modifier_group",
        entityId: binding.id,
        changeType: "lifecycle_retire",
        summary: "Variant↔ModifierGroup binding staged RETIRED.",
      });
      continue;
    }
    if (binding.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.minTotalQuantity !== binding.minTotalQuantity ||
      effective.maxTotalQuantity !== binding.maxTotalQuantity ||
      effective.position !== binding.position
    ) {
      changes.push({
        entityKind: "variant_modifier_group",
        entityId: binding.id,
        changeType: effective == null ? "binding" : "content",
        summary: "Variant↔ModifierGroup cardinality/position draft differs from effective truth.",
      });
    }
  }

  const materialCustomerChanges = changes.filter(
    (c) => c.changeType !== "lifecycle_draft",
  );
  const wouldChangeCustomerTruth = materialCustomerChanges.length > 0;

  const validationBlockers: string[] = [];
  let validationOk = true;
  try {
    await assertProductGraphReady(context, productId);
  } catch (error) {
    validationOk = false;
    if (error instanceof CatalogValidationError || error instanceof CatalogNotFoundError) {
      validationBlockers.push(error.message);
    } else if (error instanceof Error) {
      validationBlockers.push(error.message);
    } else {
      validationBlockers.push("Catalog publication candidate failed validation.");
    }
  }

  return {
    brandId,
    productId,
    productCode: graph.product.code,
    expectedContentRevision: expectedContentRevision.toString(10),
    wouldChangeCustomerTruth,
    validationOk,
    validationBlockers,
    changes,
    operation: "catalog_content_publish",
  };
}
