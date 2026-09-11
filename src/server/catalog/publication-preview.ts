/**
 * Catalog-scoped consequence preview for deliberate publication (IMP-036F F2).
 *
 * Read/validate only — no persistent review store. Locks the Brand content
 * envelope before candidate reads so returned `expectedContentRevision` is
 * inseparable from the reviewed candidate. Concurrent material drafts either
 * wait or invalidate the returned token via CAS.
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  catalogModifierGroupOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";
import { requireCatalogManage } from "./authorize-catalog";
import {
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
import { assertUuid } from "./lifecycle";
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierGroupOptionContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
  loadEffectiveVariantModifierGroupContent,
  lockBrandEnvelope,
} from "./revisions";
import { getBrandCatalogProductGraph } from "./reads";
import { assertProductGraphReady } from "./validation";

export type CatalogPublicationChangedField = Readonly<{
  field: string;
  effectiveValue: unknown;
  proposedValue: unknown;
}>;

export type CatalogPublicationAffectedScope = Readonly<{
  productId: string;
  productCode: string;
  variantId?: string;
  variantCode?: string;
  relationship:
    | "root_product"
    | "shared_modifier_group"
    | "shared_modifier_option"
    | "shared_modifier_group_option"
    | "shared_variant_modifier_group";
  customerTruthAffected: boolean;
}>;

export type CatalogPublicationEntityChange = Readonly<{
  entityKind:
    | "product"
    | "variant"
    | "modifier_group"
    | "modifier_option"
    | "modifier_group_option"
    | "variant_modifier_group";
  entityId: string;
  entityCode?: string;
  changeType: "content" | "lifecycle_activate" | "lifecycle_retire" | "lifecycle_draft" | "binding";
  summary: string;
  draftDiffersFromEffective: boolean;
  changedFields?: readonly CatalogPublicationChangedField[];
  affectedScope?: readonly CatalogPublicationAffectedScope[];
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

function sameOptionalString(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

function pushFieldDiff(
  fields: CatalogPublicationChangedField[],
  field: string,
  effectiveValue: unknown,
  proposedValue: unknown,
): void {
  if (Object.is(effectiveValue, proposedValue)) return;
  if (
    (effectiveValue === null || effectiveValue === undefined) &&
    (proposedValue === null || proposedValue === undefined)
  ) {
    return;
  }
  fields.push({ field, effectiveValue, proposedValue });
}

type SharedConsumer = Readonly<{
  productId: string;
  productCode: string;
  variantId: string;
  variantCode: string;
  productEffectiveContentRevision: bigint | null;
  variantEffectiveContentRevision: bigint | null;
  bindingId: string;
  bindingEffectiveContentRevision: bigint | null;
  bindingMinTotalQuantity: number;
  bindingMaxTotalQuantity: number;
  bindingPosition: number;
  bindingLifecycleStatus: string;
}>;

async function loadSharedModifierGroupConsumers(
  context: PersistenceQueryContext,
  brandId: string,
  modifierGroupId: string,
): Promise<readonly SharedConsumer[]> {
  const rows = await context.db
    .select({
      productId: catalogProductsTable.id,
      productCode: catalogProductsTable.code,
      variantId: catalogVariantsTable.id,
      variantCode: catalogVariantsTable.code,
      productEffectiveContentRevision: catalogProductsTable.effectiveContentRevision,
      variantEffectiveContentRevision: catalogVariantsTable.effectiveContentRevision,
      bindingId: catalogVariantModifierGroupsTable.id,
      bindingEffectiveContentRevision: catalogVariantModifierGroupsTable.effectiveContentRevision,
      bindingMinTotalQuantity: catalogVariantModifierGroupsTable.minTotalQuantity,
      bindingMaxTotalQuantity: catalogVariantModifierGroupsTable.maxTotalQuantity,
      bindingPosition: catalogVariantModifierGroupsTable.position,
      bindingLifecycleStatus: catalogVariantModifierGroupsTable.lifecycleStatus,
    })
    .from(catalogVariantModifierGroupsTable)
    .innerJoin(
      catalogVariantsTable,
      eq(catalogVariantsTable.id, catalogVariantModifierGroupsTable.variantId),
    )
    .innerJoin(catalogProductsTable, eq(catalogProductsTable.id, catalogVariantsTable.productId))
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        eq(catalogVariantModifierGroupsTable.modifierGroupId, modifierGroupId),
      ),
    );
  return rows;
}

async function loadSharedModifierOptionConsumers(
  context: PersistenceQueryContext,
  brandId: string,
  modifierOptionId: string,
): Promise<readonly SharedConsumer[]> {
  const groupRows = await context.db
    .select({
      modifierGroupId: catalogModifierGroupOptionsTable.modifierGroupId,
    })
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.brandId, brandId),
        eq(catalogModifierGroupOptionsTable.modifierOptionId, modifierOptionId),
      ),
    );
  const groupIds = [...new Set(groupRows.map((r) => r.modifierGroupId))];
  if (groupIds.length === 0) return [];

  const rows = await context.db
    .select({
      productId: catalogProductsTable.id,
      productCode: catalogProductsTable.code,
      variantId: catalogVariantsTable.id,
      variantCode: catalogVariantsTable.code,
      productEffectiveContentRevision: catalogProductsTable.effectiveContentRevision,
      variantEffectiveContentRevision: catalogVariantsTable.effectiveContentRevision,
      bindingId: catalogVariantModifierGroupsTable.id,
      bindingEffectiveContentRevision: catalogVariantModifierGroupsTable.effectiveContentRevision,
      bindingMinTotalQuantity: catalogVariantModifierGroupsTable.minTotalQuantity,
      bindingMaxTotalQuantity: catalogVariantModifierGroupsTable.maxTotalQuantity,
      bindingPosition: catalogVariantModifierGroupsTable.position,
      bindingLifecycleStatus: catalogVariantModifierGroupsTable.lifecycleStatus,
    })
    .from(catalogVariantModifierGroupsTable)
    .innerJoin(
      catalogVariantsTable,
      eq(catalogVariantsTable.id, catalogVariantModifierGroupsTable.variantId),
    )
    .innerJoin(catalogProductsTable, eq(catalogProductsTable.id, catalogVariantsTable.productId))
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        inArray(catalogVariantModifierGroupsTable.modifierGroupId, groupIds),
      ),
    );
  return rows;
}

/**
 * Customer visibility uses EFFECTIVE published relationships only.
 * Staged primary lifecycle (e.g. unpublished RETIRED) must not hide consumers
 * that still resolve the shared modifier under effective truth.
 */
async function isEffectiveCustomerConsumer(
  context: PersistenceQueryContext,
  consumer: SharedConsumer,
): Promise<boolean> {
  if (
    consumer.productEffectiveContentRevision == null ||
    consumer.variantEffectiveContentRevision == null
  ) {
    return false;
  }
  const bindingEffective = await loadEffectiveVariantModifierGroupContent(context, {
    id: consumer.bindingId,
    minTotalQuantity: consumer.bindingMinTotalQuantity,
    maxTotalQuantity: consumer.bindingMaxTotalQuantity,
    position: consumer.bindingPosition,
    lifecycleStatus: consumer.bindingLifecycleStatus,
    effectiveContentRevision: consumer.bindingEffectiveContentRevision,
  });
  return bindingEffective != null && bindingEffective.lifecycleStatus === "active";
}

async function toAffectedScope(
  context: PersistenceQueryContext,
  consumers: readonly SharedConsumer[],
  relationship: CatalogPublicationAffectedScope["relationship"],
  customerTruthChange: boolean,
): Promise<CatalogPublicationAffectedScope[]> {
  const byKey = new Map<string, CatalogPublicationAffectedScope>();
  for (const c of consumers) {
    const key = `${c.productId}:${c.variantId}`;
    const otherCustomerVisible = await isEffectiveCustomerConsumer(context, c);
    byKey.set(key, {
      productId: c.productId,
      productCode: c.productCode,
      variantId: c.variantId,
      variantCode: c.variantCode,
      relationship,
      customerTruthAffected: customerTruthChange && otherCustomerVisible,
    });
  }
  return [...byKey.values()];
}

/**
 * Bounded Catalog consequence projection for a product-rooted publication.
 *
 * Ordering (architecture-conforming):
 * authorize path Brand → lock Brand envelope → brand-constrained candidate read.
 */
export async function previewCatalogPublicationConsequence(
  context: PersistenceTransactionContext,
  input: PreviewCatalogPublicationConsequenceInput,
): Promise<PreviewCatalogPublicationConsequenceResult> {
  assertApplicationRole(context, "previewCatalogPublicationConsequence");
  assertTransactionContext(context, "previewCatalogPublicationConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  const productId = assertUuid(input.productId, "productId");
  await requireCatalogManage(context, input.actor, brandId);

  // R1: lock envelope before candidate reads so PREVIEW_CONTENT is bound to
  // the returned expectedContentRevision under READ COMMITTED.
  const envelope = await lockBrandEnvelope(context, brandId);

  // R4: brand-constrained graph — foreign product IDs are indistinguishable.
  const graph = await getBrandCatalogProductGraph(context, {
    actor: input.actor,
    brandId,
    productId,
  });

  const changes: CatalogPublicationEntityChange[] = [];
  const expectedContentRevision = envelope.contentRevision;

  const rootScope: CatalogPublicationAffectedScope = {
    productId: graph.product.id,
    productCode: graph.product.code,
    relationship: "root_product",
    customerTruthAffected: true,
  };

  const effectiveProduct = await loadEffectiveProductContent(context, graph.product);
  if (graph.product.lifecycleStatus === "retired" && graph.product.effectiveContentRevision != null) {
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      entityCode: graph.product.code,
      changeType: "lifecycle_retire",
      summary: `Product ${graph.product.code} staged RETIRED; customer visibility withdraws on publish.`,
      draftDiffersFromEffective: true,
      changedFields: [
        {
          field: "lifecycleStatus",
          effectiveValue: "active",
          proposedValue: "retired",
        },
      ],
      affectedScope: [rootScope],
    });
  } else if (
    graph.product.lifecycleStatus === "active" &&
    (effectiveProduct == null ||
      effectiveProduct.name !== graph.product.name ||
      !sameOptionalString(effectiveProduct.description, graph.product.description))
  ) {
    const changedFields: CatalogPublicationChangedField[] = [];
    if (effectiveProduct == null) {
      pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
      pushFieldDiff(changedFields, "name", null, graph.product.name);
      pushFieldDiff(changedFields, "description", null, graph.product.description);
    } else {
      pushFieldDiff(changedFields, "name", effectiveProduct.name, graph.product.name);
      pushFieldDiff(
        changedFields,
        "description",
        effectiveProduct.description,
        graph.product.description,
      );
    }
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      entityCode: graph.product.code,
      changeType: effectiveProduct == null ? "lifecycle_activate" : "content",
      summary:
        effectiveProduct == null
          ? `Product ${graph.product.code} first EFFECTIVE publication candidate.`
          : `Product ${graph.product.code} draft content differs from effective customer truth.`,
      draftDiffersFromEffective: true,
      changedFields,
      affectedScope: [rootScope],
    });
  } else if (graph.product.lifecycleStatus === "draft" && graph.product.effectiveContentRevision == null) {
    changes.push({
      entityKind: "product",
      entityId: graph.product.id,
      entityCode: graph.product.code,
      changeType: "lifecycle_draft",
      summary: `Product ${graph.product.code} remains DRAFT; not customer-visible until activated and published.`,
      draftDiffersFromEffective: false,
      changedFields: [
        {
          field: "lifecycleStatus",
          effectiveValue: null,
          proposedValue: "draft",
        },
      ],
      affectedScope: [rootScope],
    });
  }

  for (const variant of graph.variants) {
    const effective = await loadEffectiveVariantContent(context, variant);
    const variantScope: CatalogPublicationAffectedScope = {
      productId: graph.product.id,
      productCode: graph.product.code,
      variantId: variant.id,
      variantCode: variant.code,
      relationship: "root_product",
      customerTruthAffected: true,
    };
    if (variant.lifecycleStatus === "retired" && variant.effectiveContentRevision != null) {
      changes.push({
        entityKind: "variant",
        entityId: variant.id,
        entityCode: variant.code,
        changeType: "lifecycle_retire",
        summary: `Variant ${variant.code} staged RETIRED; customer resolution withdraws on publish.`,
        draftDiffersFromEffective: true,
        changedFields: [
          {
            field: "lifecycleStatus",
            effectiveValue: "active",
            proposedValue: "retired",
          },
        ],
        affectedScope: [variantScope],
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
      const changedFields: CatalogPublicationChangedField[] = [];
      if (effective == null) {
        pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
        pushFieldDiff(changedFields, "name", null, variant.name);
        pushFieldDiff(changedFields, "description", null, variant.description);
        pushFieldDiff(changedFields, "isDefault", null, variant.isDefault);
        pushFieldDiff(changedFields, "isSelectorVisible", null, variant.isSelectorVisible);
      } else {
        pushFieldDiff(changedFields, "name", effective.name, variant.name);
        pushFieldDiff(changedFields, "description", effective.description, variant.description);
        pushFieldDiff(changedFields, "isDefault", effective.isDefault, variant.isDefault);
        pushFieldDiff(
          changedFields,
          "isSelectorVisible",
          effective.isSelectorVisible,
          variant.isSelectorVisible,
        );
      }
      changes.push({
        entityKind: "variant",
        entityId: variant.id,
        entityCode: variant.code,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary:
          effective == null
            ? `Variant ${variant.code} first EFFECTIVE publication candidate.`
            : `Variant ${variant.code} draft content/default/selector differs from effective truth.`,
        draftDiffersFromEffective: true,
        changedFields,
        affectedScope: [variantScope],
      });
    }
  }

  for (const group of graph.modifierGroups) {
    const effective = await loadEffectiveModifierGroupContent(context, group);
    const consumers = await loadSharedModifierGroupConsumers(context, brandId, group.id);
    const customerTruthChange =
      group.lifecycleStatus === "retired" ||
      group.lifecycleStatus === "active";
    const affectedScope = await toAffectedScope(
      context,
      consumers,
      "shared_modifier_group",
      customerTruthChange,
    );

    if (group.lifecycleStatus === "retired" && group.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_group",
        entityId: group.id,
        entityCode: group.code,
        changeType: "lifecycle_retire",
        summary: `Modifier group ${group.code} staged RETIRED.`,
        draftDiffersFromEffective: true,
        changedFields: [
          {
            field: "lifecycleStatus",
            effectiveValue: "active",
            proposedValue: "retired",
          },
        ],
        affectedScope,
      });
      continue;
    }
    if (group.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.name !== group.name ||
      !sameOptionalString(effective.description, group.description)
    ) {
      const changedFields: CatalogPublicationChangedField[] = [];
      if (effective == null) {
        pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
        pushFieldDiff(changedFields, "name", null, group.name);
        pushFieldDiff(changedFields, "description", null, group.description);
      } else {
        pushFieldDiff(changedFields, "name", effective.name, group.name);
        pushFieldDiff(changedFields, "description", effective.description, group.description);
      }
      changes.push({
        entityKind: "modifier_group",
        entityId: group.id,
        entityCode: group.code,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary: `Modifier group ${group.code} draft differs from effective truth.`,
        draftDiffersFromEffective: true,
        changedFields,
        affectedScope,
      });
    }
  }

  for (const option of graph.modifierOptions) {
    const effective = await loadEffectiveModifierOptionContent(context, option);
    const consumers = await loadSharedModifierOptionConsumers(context, brandId, option.id);
    const customerTruthChange =
      option.lifecycleStatus === "retired" || option.lifecycleStatus === "active";
    const affectedScope = await toAffectedScope(
      context,
      consumers,
      "shared_modifier_option",
      customerTruthChange,
    );

    if (option.lifecycleStatus === "retired" && option.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_option",
        entityId: option.id,
        entityCode: option.code,
        changeType: "lifecycle_retire",
        summary: `Modifier option ${option.code} staged RETIRED.`,
        draftDiffersFromEffective: true,
        changedFields: [
          {
            field: "lifecycleStatus",
            effectiveValue: "active",
            proposedValue: "retired",
          },
        ],
        affectedScope,
      });
      continue;
    }
    if (option.lifecycleStatus !== "active") continue;
    if (
      effective == null ||
      effective.name !== option.name ||
      !sameOptionalString(effective.description, option.description)
    ) {
      const changedFields: CatalogPublicationChangedField[] = [];
      if (effective == null) {
        pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
        pushFieldDiff(changedFields, "name", null, option.name);
        pushFieldDiff(changedFields, "description", null, option.description);
      } else {
        pushFieldDiff(changedFields, "name", effective.name, option.name);
        pushFieldDiff(changedFields, "description", effective.description, option.description);
      }
      changes.push({
        entityKind: "modifier_option",
        entityId: option.id,
        entityCode: option.code,
        changeType: effective == null ? "lifecycle_activate" : "content",
        summary: `Modifier option ${option.code} draft differs from effective truth.`,
        draftDiffersFromEffective: true,
        changedFields,
        affectedScope,
      });
    }
  }

  for (const binding of graph.modifierGroupOptions) {
    const effective = await loadEffectiveModifierGroupOptionContent(context, binding);
    const consumers = await loadSharedModifierGroupConsumers(
      context,
      brandId,
      binding.modifierGroupId,
    );
    const affectedScope = await toAffectedScope(
      context,
      consumers,
      "shared_modifier_group_option",
      binding.lifecycleStatus === "retired" || binding.lifecycleStatus === "active",
    );

    if (binding.lifecycleStatus === "retired" && binding.effectiveContentRevision != null) {
      changes.push({
        entityKind: "modifier_group_option",
        entityId: binding.id,
        changeType: "lifecycle_retire",
        summary: "Group↔Option binding staged RETIRED.",
        draftDiffersFromEffective: true,
        changedFields: [
          {
            field: "lifecycleStatus",
            effectiveValue: "active",
            proposedValue: "retired",
          },
        ],
        affectedScope,
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
      const changedFields: CatalogPublicationChangedField[] = [];
      if (effective == null) {
        pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
        pushFieldDiff(changedFields, "minQuantity", null, binding.minQuantity);
        pushFieldDiff(changedFields, "maxQuantity", null, binding.maxQuantity);
        pushFieldDiff(changedFields, "defaultQuantity", null, binding.defaultQuantity);
        pushFieldDiff(changedFields, "position", null, binding.position);
      } else {
        pushFieldDiff(changedFields, "minQuantity", effective.minQuantity, binding.minQuantity);
        pushFieldDiff(changedFields, "maxQuantity", effective.maxQuantity, binding.maxQuantity);
        pushFieldDiff(
          changedFields,
          "defaultQuantity",
          effective.defaultQuantity,
          binding.defaultQuantity,
        );
        pushFieldDiff(changedFields, "position", effective.position, binding.position);
      }
      changes.push({
        entityKind: "modifier_group_option",
        entityId: binding.id,
        changeType: effective == null ? "binding" : "content",
        summary: "Group↔Option cardinality/position draft differs from effective truth.",
        draftDiffersFromEffective: true,
        changedFields,
        affectedScope,
      });
    }
  }

  for (const binding of graph.variantModifierGroups) {
    const effective = await loadEffectiveVariantModifierGroupContent(context, binding);
    const variant = graph.variants.find((v) => v.id === binding.variantId);
    // VMG content/cardinality/lifecycle is binding-specific. Sharing a ModifierGroup
    // does not fan out Variant A changes to Variant B.
    const productVariantPublished =
      graph.product.effectiveContentRevision != null &&
      variant?.effectiveContentRevision != null;
    const currentlyCustomerVisible =
      productVariantPublished &&
      effective != null &&
      effective.lifecycleStatus === "active";
    const firstPublishActive =
      productVariantPublished &&
      effective == null &&
      binding.lifecycleStatus === "active";
    const customerTruthChange =
      binding.lifecycleStatus === "retired" || binding.lifecycleStatus === "active";
    const affectedScope: CatalogPublicationAffectedScope[] =
      variant == null
        ? []
        : [
            {
              productId: graph.product.id,
              productCode: graph.product.code,
              variantId: variant.id,
              variantCode: variant.code,
              relationship: "shared_variant_modifier_group",
              customerTruthAffected:
                customerTruthChange && (currentlyCustomerVisible || firstPublishActive),
            },
          ];

    if (binding.lifecycleStatus === "retired" && binding.effectiveContentRevision != null) {
      changes.push({
        entityKind: "variant_modifier_group",
        entityId: binding.id,
        changeType: "lifecycle_retire",
        summary: "Variant↔ModifierGroup binding staged RETIRED.",
        draftDiffersFromEffective: true,
        changedFields: [
          {
            field: "lifecycleStatus",
            effectiveValue: "active",
            proposedValue: "retired",
          },
        ],
        affectedScope,
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
      const changedFields: CatalogPublicationChangedField[] = [];
      if (effective == null) {
        pushFieldDiff(changedFields, "lifecycleStatus", null, "active");
        pushFieldDiff(changedFields, "minTotalQuantity", null, binding.minTotalQuantity);
        pushFieldDiff(changedFields, "maxTotalQuantity", null, binding.maxTotalQuantity);
        pushFieldDiff(changedFields, "position", null, binding.position);
      } else {
        pushFieldDiff(
          changedFields,
          "minTotalQuantity",
          effective.minTotalQuantity,
          binding.minTotalQuantity,
        );
        pushFieldDiff(
          changedFields,
          "maxTotalQuantity",
          effective.maxTotalQuantity,
          binding.maxTotalQuantity,
        );
        pushFieldDiff(changedFields, "position", effective.position, binding.position);
      }
      changes.push({
        entityKind: "variant_modifier_group",
        entityId: binding.id,
        changeType: effective == null ? "binding" : "content",
        summary: "Variant↔ModifierGroup cardinality/position draft differs from effective truth.",
        draftDiffersFromEffective: true,
        changedFields,
        affectedScope,
      });
    }
  }

  const materialCustomerChanges = changes.filter((c) => c.changeType !== "lifecycle_draft");
  const wouldChangeCustomerTruth = materialCustomerChanges.length > 0;

  const validationBlockers: string[] = [];
  let validationOk = true;
  try {
    await assertProductGraphReady(context, productId);
  } catch (error) {
    // R2: only known user-correctable Catalog failures become blockers.
    if (
      error instanceof CatalogValidationError ||
      error instanceof CatalogNotFoundError ||
      error instanceof CatalogInvalidStateError
    ) {
      validationOk = false;
      validationBlockers.push(error.message);
    } else {
      throw error;
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
