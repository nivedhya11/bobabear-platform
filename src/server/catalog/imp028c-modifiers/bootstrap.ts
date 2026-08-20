/**
 * IMP-028C Hong Kong Milk Tea modifier bootstrap (Slice 4).
 *
 * Fixed artifact only. Dry-run by default; writes require apply.
 * Owns only modifier records declared in the checked-in artifact.
 *
 * Catalog graph writes follow the established menu-import / pricing-bootstrap
 * application-role DML pattern. Semantic codes resolve ownership; database IDs
 * are generated or reused at apply time. No bootstrap workforce principal.
 */
import { randomUUID } from "node:crypto";

import { and, eq, isNull, ne } from "drizzle-orm";

import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../../platform/database/schema/catalog";
import { brandsTable } from "../../../platform/database/schema/organizations";
import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../../platform/database/schema/pricing";
import {
  HONG_KONG_MILK_TEA_BASE_PRICE_PAISE,
  HONG_KONG_MILK_TEA_PRODUCT_NAME,
} from "../../../shared/catalog/imp028c-modifiers/constants";
import { activationTimestamps } from "../lifecycle";
import {
  revalidateProductsForModifierGroup,
  validateActiveProductGraph,
} from "../validation";
import type { Persistence, PersistenceTransactionContext } from "../../persistence/types";
import { bootstrapExistingMenuAssortment } from "../../assortment/bootstrap";
import { runExistingMenuImport } from "../menu-import";
import { bootstrapExistingMenuPricing } from "../../pricing/bootstrap";
import { Imp028cModifiersBootstrapError } from "./errors";
import {
  loadImp028cModifiersArtifact,
  validateImp028cModifiersArtifactAgainstMenu,
  type Imp028cModifiersArtifact,
} from "./validate-artifact";

export type Imp028cModifiersBootstrapResult = Readonly<{
  mode: "dry-run" | "apply";
  outcome: "NO_CHANGES" | "WOULD_CREATE" | "APPLIED" | "FAILED";
  brandId: string;
  variantId: string;
  priceBookId: string;
  counts: Readonly<{
    created: number;
    unchanged: number;
    conflicts: number;
  }>;
}>;

type Counts = { created: number; unchanged: number; conflicts: number };

type ResolvedPrerequisites = Readonly<{
  brandId: string;
  productId: string;
  variantId: string;
  priceBookId: string;
}>;

type ResolvedGraph = Readonly<{
  modifierGroupId: string;
  optionIdsByCode: ReadonlyMap<string, string>;
  bindingIdsByOptionCode: ReadonlyMap<string, string>;
  variantModifierGroupId: string;
}>;

function conflict(message: string): never {
  throw new Imp028cModifiersBootstrapError("MODIFIER_BOOTSTRAP_CONFLICT", { message });
}

function prerequisite(message: string): never {
  throw new Imp028cModifiersBootstrapError("PREREQUISITE_MISSING", { message });
}

async function resolvePrerequisites(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
): Promise<ResolvedPrerequisites> {
  const brandRows = await tx.db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.code, artifact.brand.code));
  if (brandRows.length === 0) {
    prerequisite(`Brand ${artifact.brand.code} is missing after menu import.`);
  }
  if (brandRows.length > 1) {
    conflict(`Brand code ${artifact.brand.code} is ambiguous.`);
  }
  const brand = brandRows[0]!;
  if (brand.status !== "active") {
    prerequisite(`Brand ${artifact.brand.code} is missing or inactive.`);
  }

  const productRows = await tx.db
    .select()
    .from(catalogProductsTable)
    .where(
      and(
        eq(catalogProductsTable.brandId, brand.id),
        eq(catalogProductsTable.code, artifact.target.product_code),
      ),
    );
  if (productRows.length === 0) {
    prerequisite("Hong Kong Milk Tea product is missing after menu import.");
  }
  if (productRows.length > 1) {
    conflict(`Product code ${artifact.target.product_code} is ambiguous.`);
  }
  const product = productRows[0]!;
  if (product.lifecycleStatus !== "active") {
    prerequisite("Hong Kong Milk Tea product is not active after menu import.");
  }
  if (product.productKind !== "standard") {
    prerequisite("Hong Kong Milk Tea product has unexpected product kind.");
  }
  if (product.name !== artifact.target.product_name || product.name !== HONG_KONG_MILK_TEA_PRODUCT_NAME) {
    conflict("Resolved product does not match expected UAT target.");
  }

  const variantRows = await tx.db
    .select()
    .from(catalogVariantsTable)
    .where(
      and(
        eq(catalogVariantsTable.productId, product.id),
        eq(catalogVariantsTable.code, artifact.target.variant_code),
      ),
    );
  if (variantRows.length === 0) {
    prerequisite("Hong Kong Milk Tea default variant is missing after menu import.");
  }
  if (variantRows.length > 1) {
    conflict(`Variant code ${artifact.target.variant_code} is ambiguous.`);
  }
  const variant = variantRows[0]!;
  if (variant.lifecycleStatus !== "active") {
    prerequisite("Hong Kong Milk Tea default variant is not active after menu import.");
  }
  if (variant.brandId !== brand.id) {
    prerequisite("Hong Kong Milk Tea variant belongs to an unexpected brand.");
  }

  const expectedScopeType = artifact.price_book.scope_type;
  const scopeConditions = [
    eq(priceBooksTable.brandId, brand.id),
    eq(priceBooksTable.code, artifact.price_book.code),
    eq(priceBooksTable.scopeType, expectedScopeType),
  ];
  if (expectedScopeType === "brand") {
    scopeConditions.push(isNull(priceBooksTable.territoryId));
    scopeConditions.push(isNull(priceBooksTable.organizationId));
    scopeConditions.push(isNull(priceBooksTable.outletId));
  }
  const bookRows = await tx.db
    .select()
    .from(priceBooksTable)
    .where(and(...scopeConditions));
  if (bookRows.length === 0) {
    const booksByBrandAndCode = await tx.db
      .select({ id: priceBooksTable.id })
      .from(priceBooksTable)
      .where(
        and(
          eq(priceBooksTable.brandId, brand.id),
          eq(priceBooksTable.code, artifact.price_book.code),
        ),
      );
    if (booksByBrandAndCode.length > 0) {
      conflict(`Price book code ${artifact.price_book.code} exists with incompatible scope.`);
    }
    prerequisite(`${artifact.price_book.code} price book is missing after pricing bootstrap.`);
  }
  if (bookRows.length > 1) {
    conflict(`Price book code ${artifact.price_book.code} is ambiguous.`);
  }
  const book = bookRows[0]!;
  if (book.lifecycleStatus !== "active") {
    prerequisite(`${artifact.price_book.code} price book is inactive after pricing bootstrap.`);
  }

  const basePriceRows = await tx.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(
      and(
        eq(priceBookVariantPricesTable.priceBookId, book.id),
        eq(priceBookVariantPricesTable.variantId, variant.id),
      ),
    )
    .limit(1);
  const basePrice = basePriceRows[0];
  if (!basePrice || basePrice.amountPaise !== BigInt(HONG_KONG_MILK_TEA_BASE_PRICE_PAISE)) {
    conflict("Resolved variant base price does not match expected canonical price.");
  }

  return Object.freeze({
    brandId: brand.id,
    productId: product.id,
    variantId: variant.id,
    priceBookId: book.id,
  });
}

async function findModifierGroupByCode(
  tx: PersistenceTransactionContext,
  brandId: string,
  code: string,
) {
  const rows = await tx.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(and(eq(catalogModifierGroupsTable.brandId, brandId), eq(catalogModifierGroupsTable.code, code)))
    .limit(1);
  return rows[0] ?? null;
}

async function findModifierOptionByCode(
  tx: PersistenceTransactionContext,
  brandId: string,
  code: string,
) {
  const rows = await tx.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(and(eq(catalogModifierOptionsTable.brandId, brandId), eq(catalogModifierOptionsTable.code, code)))
    .limit(1);
  return rows[0] ?? null;
}

async function findActiveGroupOptionBinding(
  tx: PersistenceTransactionContext,
  modifierGroupId: string,
  modifierOptionId: string,
) {
  const rows = await tx.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.modifierGroupId, modifierGroupId),
        eq(catalogModifierGroupOptionsTable.modifierOptionId, modifierOptionId),
        ne(catalogModifierGroupOptionsTable.lifecycleStatus, "retired"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findActiveVariantModifierGroupBinding(
  tx: PersistenceTransactionContext,
  variantId: string,
  modifierGroupId: string,
) {
  const rows = await tx.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.variantId, variantId),
        eq(catalogVariantModifierGroupsTable.modifierGroupId, modifierGroupId),
        ne(catalogVariantModifierGroupsTable.lifecycleStatus, "retired"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function activateRowIfNeeded(
  tx: PersistenceTransactionContext,
  table:
    | typeof catalogModifierGroupsTable
    | typeof catalogModifierOptionsTable
    | typeof catalogModifierGroupOptionsTable
    | typeof catalogVariantModifierGroupsTable,
  row: { id: string; lifecycleStatus: string },
): Promise<void> {
  if (row.lifecycleStatus === "active") return;
  if (row.lifecycleStatus === "retired") {
    conflict("Bootstrap-owned record is retired.");
  }
  const stamps = activationTimestamps();
  await tx.db
    .update(table)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(table.id, row.id));
}

async function resolveGraphFromDatabase(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
): Promise<ResolvedGraph | null> {
  const group = await findModifierGroupByCode(tx, resolved.brandId, artifact.modifier_group.code);
  if (!group) return null;

  const optionIdsByCode = new Map<string, string>();
  for (const entry of artifact.modifier_options) {
    const option = await findModifierOptionByCode(tx, resolved.brandId, entry.option.code);
    if (!option) return null;
    optionIdsByCode.set(entry.option.code, option.id);
  }

  const bindingIdsByOptionCode = new Map<string, string>();
  for (const entry of artifact.modifier_options) {
    const optionId = optionIdsByCode.get(entry.option.code)!;
    const binding = await findActiveGroupOptionBinding(tx, group.id, optionId);
    if (!binding) return null;
    bindingIdsByOptionCode.set(entry.option.code, binding.id);
  }

  const vmg = await findActiveVariantModifierGroupBinding(
    tx,
    resolved.variantId,
    group.id,
  );
  if (!vmg) return null;

  return Object.freeze({
    modifierGroupId: group.id,
    optionIdsByCode,
    bindingIdsByOptionCode,
    variantModifierGroupId: vmg.id,
  });
}

async function ensureModifierGroup(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  apply: boolean,
  counts: Counts,
): Promise<string | null> {
  const expected = artifact.modifier_group;
  const existing = await findModifierGroupByCode(tx, resolved.brandId, expected.code);
  if (!existing) {
    counts.created += 1;
    if (!apply) return null;
    const now = new Date();
    const id = randomUUID();
    await tx.db.insert(catalogModifierGroupsTable).values({
      id,
      brandId: resolved.brandId,
      code: expected.code,
      name: expected.name,
      description: null,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
    return id;
  }
  if (existing.name !== expected.name) {
    counts.conflicts += 1;
    conflict(`Modifier group ${expected.code} exists with incompatible semantics.`);
  }
  counts.unchanged += 1;
  return existing.id;
}

async function ensureModifierOption(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  option: Imp028cModifiersArtifact["modifier_options"][number]["option"],
  apply: boolean,
  counts: Counts,
): Promise<string | null> {
  const existing = await findModifierOptionByCode(tx, resolved.brandId, option.code);
  if (!existing) {
    counts.created += 1;
    if (!apply) return null;
    const now = new Date();
    const id = randomUUID();
    await tx.db.insert(catalogModifierOptionsTable).values({
      id,
      brandId: resolved.brandId,
      code: option.code,
      name: option.name,
      description: null,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
    return id;
  }
  if (existing.name !== option.name) {
    counts.conflicts += 1;
    conflict(`Modifier option ${option.code} exists with incompatible semantics.`);
  }
  counts.unchanged += 1;
  return existing.id;
}

async function ensureGroupOptionBinding(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  entry: Imp028cModifiersArtifact["modifier_options"][number],
  modifierGroupId: string,
  modifierOptionId: string,
  apply: boolean,
  counts: Counts,
): Promise<string | null> {
  const expected = entry.binding;
  const existing = await findActiveGroupOptionBinding(tx, modifierGroupId, modifierOptionId);
  if (!existing) {
    counts.created += 1;
    if (!apply) return null;
    const now = new Date();
    const id = randomUUID();
    await tx.db.insert(catalogModifierGroupOptionsTable).values({
      id,
      brandId: resolved.brandId,
      modifierGroupId,
      modifierOptionId,
      minQuantity: expected.min_quantity,
      maxQuantity: expected.max_quantity,
      defaultQuantity: expected.default_quantity,
      position: expected.position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
    return id;
  }
  if (
    existing.brandId !== resolved.brandId ||
    existing.minQuantity !== expected.min_quantity ||
    existing.maxQuantity !== expected.max_quantity ||
    existing.defaultQuantity !== expected.default_quantity ||
    existing.position !== expected.position
  ) {
    counts.conflicts += 1;
    conflict(`Modifier group-option for ${entry.option.code} exists with incompatible semantics.`);
  }
  counts.unchanged += 1;
  return existing.id;
}

async function ensureVariantModifierGroupBinding(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  modifierGroupId: string,
  apply: boolean,
  counts: Counts,
): Promise<string | null> {
  const expected = artifact.variant_modifier_group;
  const existing = await findActiveVariantModifierGroupBinding(
    tx,
    resolved.variantId,
    modifierGroupId,
  );
  if (!existing) {
    counts.created += 1;
    if (!apply) return null;
    const now = new Date();
    const id = randomUUID();
    await tx.db.insert(catalogVariantModifierGroupsTable).values({
      id,
      brandId: resolved.brandId,
      variantId: resolved.variantId,
      modifierGroupId,
      minTotalQuantity: expected.min_total_quantity,
      maxTotalQuantity: expected.max_total_quantity,
      position: expected.position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
    return id;
  }
  if (
    existing.brandId !== resolved.brandId ||
    existing.minTotalQuantity !== expected.min_total_quantity ||
    existing.maxTotalQuantity !== expected.max_total_quantity ||
    existing.position !== expected.position
  ) {
    counts.conflicts += 1;
    conflict(`Variant modifier group for ${artifact.modifier_group.code} exists with incompatible semantics.`);
  }
  counts.unchanged += 1;
  return existing.id;
}

async function ensureActiveGraph(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  graph: ResolvedGraph,
): Promise<void> {
  for (const entry of artifact.modifier_options) {
    const optionId = graph.optionIdsByCode.get(entry.option.code)!;
    const rows = await tx.db
      .select()
      .from(catalogModifierOptionsTable)
      .where(eq(catalogModifierOptionsTable.id, optionId))
      .limit(1);
    const option = rows[0];
    if (!option) conflict(`Modifier option ${entry.option.code} missing before activation.`);
    await activateRowIfNeeded(tx, catalogModifierOptionsTable, option!);
  }

  for (const entry of artifact.modifier_options) {
    const bindingId = graph.bindingIdsByOptionCode.get(entry.option.code)!;
    const rows = await tx.db
      .select()
      .from(catalogModifierGroupOptionsTable)
      .where(eq(catalogModifierGroupOptionsTable.id, bindingId))
      .limit(1);
    const binding = rows[0];
    if (!binding) conflict(`Modifier group-option for ${entry.option.code} missing before activation.`);
    await activateRowIfNeeded(tx, catalogModifierGroupOptionsTable, binding!);
  }

  const groupRows = await tx.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(eq(catalogModifierGroupsTable.id, graph.modifierGroupId))
    .limit(1);
  const group = groupRows[0];
  if (!group) conflict(`Modifier group ${artifact.modifier_group.code} missing before activation.`);
  await activateRowIfNeeded(tx, catalogModifierGroupsTable, group!);

  const vmgRows = await tx.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(eq(catalogVariantModifierGroupsTable.id, graph.variantModifierGroupId))
    .limit(1);
  const vmg = vmgRows[0];
  if (!vmg) {
    conflict(`Variant modifier group for ${artifact.modifier_group.code} missing before activation.`);
  }
  await activateRowIfNeeded(tx, catalogVariantModifierGroupsTable, vmg!);

  await revalidateProductsForModifierGroup(tx, graph.modifierGroupId);
  await validateActiveProductGraph(tx, resolved.productId);
}

async function findModifierPriceBySemanticKey(
  tx: PersistenceTransactionContext,
  priceBookId: string,
  variantModifierGroupId: string,
  modifierGroupOptionId: string,
) {
  const rows = await tx.db
    .select()
    .from(priceBookModifierPricesTable)
    .where(
      and(
        eq(priceBookModifierPricesTable.priceBookId, priceBookId),
        eq(priceBookModifierPricesTable.variantModifierGroupId, variantModifierGroupId),
        eq(priceBookModifierPricesTable.modifierGroupOptionId, modifierGroupOptionId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function ensureModifierPrice(
  tx: PersistenceTransactionContext,
  artifact: Imp028cModifiersArtifact,
  resolved: ResolvedPrerequisites,
  entry: Imp028cModifiersArtifact["modifier_options"][number],
  graph: ResolvedGraph,
  apply: boolean,
  counts: Counts,
): Promise<void> {
  const modifierGroupOptionId = graph.bindingIdsByOptionCode.get(entry.option.code);
  if (!modifierGroupOptionId) {
    if (!apply) {
      counts.created += 1;
      return;
    }
    conflict(`Modifier group-option for ${entry.option.code} missing before pricing.`);
  }

  const existingByBinding = await findModifierPriceBySemanticKey(
    tx,
    resolved.priceBookId,
    graph.variantModifierGroupId,
    modifierGroupOptionId!,
  );

  const expectedDelta = BigInt(entry.price.price_delta_paise);
  if (existingByBinding) {
    if (
      existingByBinding.brandId !== resolved.brandId ||
      existingByBinding.priceDeltaPaise !== expectedDelta
    ) {
      counts.conflicts += 1;
      conflict(`Modifier price binding for ${entry.option.code} exists with incompatible semantics.`);
    }
    counts.unchanged += 1;
    return;
  }

  counts.created += 1;
  if (apply) {
    const now = new Date();
    await tx.db.insert(priceBookModifierPricesTable).values({
      id: randomUUID(),
      brandId: resolved.brandId,
      priceBookId: resolved.priceBookId,
      variantModifierGroupId: graph.variantModifierGroupId,
      modifierGroupOptionId: modifierGroupOptionId!,
      priceDeltaPaise: expectedDelta,
      allowTerritoryOverride: false,
      allowOrganizationOverride: false,
      allowOutletOverride: false,
      createdAt: now,
    });
  }
}

async function runBootstrapTransaction(
  persistence: Persistence,
  artifact: Imp028cModifiersArtifact,
  apply: boolean,
): Promise<{ counts: Counts; resolved: ResolvedPrerequisites }> {
  const counts: Counts = { created: 0, unchanged: 0, conflicts: 0 };
  let resolved!: ResolvedPrerequisites;

  await persistence.transaction(async (tx) => {
    resolved = await resolvePrerequisites(tx, artifact);

    const modifierGroupId = await ensureModifierGroup(tx, artifact, resolved, apply, counts);
    const optionIds = new Map<string, string | null>();
    for (const entry of artifact.modifier_options) {
      optionIds.set(
        entry.option.code,
        await ensureModifierOption(tx, artifact, resolved, entry.option, apply, counts),
      );
    }

    const resolvedGroupId =
      modifierGroupId ??
      (await findModifierGroupByCode(tx, resolved.brandId, artifact.modifier_group.code))?.id ??
      null;

    if (resolvedGroupId) {
      for (const entry of artifact.modifier_options) {
        const optionId =
          optionIds.get(entry.option.code) ??
          (await findModifierOptionByCode(tx, resolved.brandId, entry.option.code))?.id ??
          null;
        if (optionId) {
          await ensureGroupOptionBinding(
            tx,
            artifact,
            resolved,
            entry,
            resolvedGroupId,
            optionId,
            apply,
            counts,
          );
        }
      }
      await ensureVariantModifierGroupBinding(tx, artifact, resolved, resolvedGroupId, apply, counts);
    }

    const graph = await resolveGraphFromDatabase(tx, artifact, resolved);
    if (graph && apply) {
      await ensureActiveGraph(tx, artifact, resolved, graph);
    }

    if (graph) {
      for (const entry of artifact.modifier_options) {
        await ensureModifierPrice(tx, artifact, resolved, entry, graph, apply, counts);
      }
    } else if (!apply) {
      for (const _entry of artifact.modifier_options) {
        counts.created += 1;
      }
    } else {
      conflict("Modifier graph incomplete after apply.");
    }
  });

  return { counts, resolved };
}

export async function bootstrapImp028cModifiers(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
  readonly apply: boolean;
}): Promise<Imp028cModifiersBootstrapResult> {
  const artifact = loadImp028cModifiersArtifact(options.projectRoot);
  validateImp028cModifiersArtifactAgainstMenu(options.projectRoot, artifact);

  const mode = options.apply ? "apply" : "dry-run";
  try {
    const { counts, resolved } = await runBootstrapTransaction(
      options.persistence,
      artifact,
      options.apply,
    );
    const outcome =
      counts.created === 0 && counts.conflicts === 0
        ? "NO_CHANGES"
        : options.apply
          ? "APPLIED"
          : "WOULD_CREATE";

    return Object.freeze({
      mode,
      outcome,
      brandId: resolved.brandId,
      variantId: resolved.variantId,
      priceBookId: resolved.priceBookId,
      counts: Object.freeze({ ...counts }),
    });
  } catch (error) {
    if (error instanceof Imp028cModifiersBootstrapError) {
      throw error;
    }
    throw new Imp028cModifiersBootstrapError("persistence", {
      message: error instanceof Error ? error.message : "Modifier bootstrap failed.",
    });
  }
}

/** Full fresh-environment chain helper for tests only. */
export async function bootstrapImp028cFreshEnvironment(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
}): Promise<Imp028cModifiersBootstrapResult> {
  await runExistingMenuImport({
    projectRoot: options.projectRoot,
    persistence: options.persistence,
    apply: true,
  });
  await bootstrapExistingMenuAssortment({
    projectRoot: options.projectRoot,
    persistence: options.persistence,
    apply: true,
  });
  await bootstrapExistingMenuPricing({
    projectRoot: options.projectRoot,
    persistence: options.persistence,
    apply: true,
  });
  return bootstrapImp028cModifiers({
    projectRoot: options.projectRoot,
    persistence: options.persistence,
    apply: true,
  });
}

export async function resolveImp028cGraph(
  persistence: Persistence,
  projectRoot: string,
): Promise<ResolvedGraph | null> {
  const artifact = loadImp028cModifiersArtifact(projectRoot);
  return persistence.withContext(async (ctx) => {
    const resolved = await resolvePrerequisites(ctx, artifact);
    return resolveGraphFromDatabase(ctx, artifact, resolved);
  });
}

export type { ResolvedPrerequisites };
