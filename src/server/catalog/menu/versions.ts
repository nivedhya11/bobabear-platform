/**
 * Menu VERSIONED_MENU_GRAPH / MENU_REVISION helpers (IMP-036F F3A).
 *
 * Menu.revision is the authoritative expectedMenuRevision CAS target.
 * Customer truth resolves ACTIVE Menu → effectiveMenuVersionId → EFFECTIVE graph.
 */
import { randomUUID } from "node:crypto";

import { and, asc, eq, ne, sql } from "drizzle-orm";

import type { MenuLifecycleStatus } from "../../../shared/catalog/menu";
import {
  menuEntriesTable,
  menuEntryVersionsTable,
  menusTable,
  menuSectionsTable,
  menuSectionVersionsTable,
  menuVersionsTable,
} from "../../../platform/database/schema/menu";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "../assert-role";
import { assertUuid } from "../lifecycle";
import { insertMenuMutationAuditEvent } from "./audit";
import { MenuConflictError, MenuNotFoundError, MenuValidationError } from "./errors";
import type { Menu, MenuEntry, MenuSection, MenuVersion } from "./types";

export type MenuRow = typeof menusTable.$inferSelect;
export type MenuVersionRow = typeof menuVersionsTable.$inferSelect;
export type MenuSectionVersionRow = typeof menuSectionVersionsTable.$inferSelect;
export type MenuEntryVersionRow = typeof menuEntryVersionsTable.$inferSelect;

export type VersionGraph = Readonly<{
  version: MenuVersion;
  sections: readonly MenuSectionVersionRow[];
  entries: readonly MenuEntryVersionRow[];
}>;

export function rowToMenu(row: MenuRow): Menu {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    lifecycleStatus: row.lifecycleStatus as Menu["lifecycleStatus"],
    revision: row.revision,
    effectiveMenuVersionId: row.effectiveMenuVersionId,
    draftMenuVersionId: row.draftMenuVersionId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

export function rowToMenuVersion(row: MenuVersionRow): MenuVersion {
  return {
    id: row.id,
    menuId: row.menuId,
    brandId: row.brandId,
    revision: row.revision,
    lifecycleStatus: row.lifecycleStatus as MenuVersion["lifecycleStatus"],
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    effectiveAt: row.effectiveAt ? new Date(row.effectiveAt) : null,
    supersededAt: row.supersededAt ? new Date(row.supersededAt) : null,
  };
}

export function sectionVersionToMenuSection(
  row: MenuSectionVersionRow,
  timestamps: Readonly<{ createdAt: Date; updatedAt: Date }>,
): MenuSection {
  const lifecycleStatus = row.lifecycleStatus as MenuLifecycleStatus;
  return {
    id: row.sectionId,
    brandId: row.brandId,
    menuId: row.menuId,
    parentSectionId: row.parentSectionId,
    code: row.code,
    name: row.name,
    description: row.description,
    position: row.position,
    lifecycleStatus,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    activatedAt: lifecycleStatus === "active" ? timestamps.updatedAt : null,
    retiredAt: lifecycleStatus === "retired" ? timestamps.updatedAt : null,
  };
}

export function entryVersionToMenuEntry(
  row: MenuEntryVersionRow,
  timestamps: Readonly<{ createdAt: Date; updatedAt: Date }>,
): MenuEntry {
  const lifecycleStatus = row.lifecycleStatus as MenuLifecycleStatus;
  return {
    id: row.entryId,
    brandId: row.brandId,
    menuId: row.menuId,
    sectionId: row.sectionId,
    productId: row.productId,
    displayName: row.displayName,
    displayDescription: row.displayDescription,
    imagePath: row.imagePath,
    position: row.position,
    lifecycleStatus,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    activatedAt: lifecycleStatus === "active" ? timestamps.updatedAt : null,
    retiredAt: lifecycleStatus === "retired" ? timestamps.updatedAt : null,
  };
}

export function parseExpectedMenuRevision(
  value: unknown,
  field = "expectedMenuRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new MenuValidationError({ message: `${field} must be > 0.` });
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new MenuValidationError({ message: `${field} must be > 0.` });
    }
    return parsed;
  }
  throw new MenuValidationError({ message: `${field} must be a positive integer.` });
}

export function assertExpectedMenuRevision(
  menu: Readonly<{ revision: bigint }>,
  expectedMenuRevision: bigint,
): void {
  if (menu.revision !== expectedMenuRevision) {
    throw new MenuConflictError({
      code: "MENU_STALE_REVISION",
      message:
        "expectedMenuRevision does not match current Menu.revision; no publish effect.",
    });
  }
}

export async function lockMenuForUpdate(
  context: PersistenceTransactionContext,
  menuId: string,
): Promise<Menu> {
  assertTransactionContext(context, "lockMenuForUpdate");
  const id = assertUuid(menuId, "menuId");
  const rows = await context.db
    .select()
    .from(menusTable)
    .where(eq(menusTable.id, id))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new MenuNotFoundError("menu");
  return rowToMenu(row);
}

export async function lockMenuVersionForUpdate(
  context: PersistenceTransactionContext,
  menuVersionId: string,
): Promise<MenuVersion> {
  assertTransactionContext(context, "lockMenuVersionForUpdate");
  const id = assertUuid(menuVersionId, "menuVersionId");
  const rows = await context.db
    .select()
    .from(menuVersionsTable)
    .where(eq(menuVersionsTable.id, id))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new MenuNotFoundError("menu_version");
  return rowToMenuVersion(row);
}

/**
 * Advance Menu.revision (aggregate review/CAS counter).
 * Callers must already hold the Menu row FOR UPDATE.
 */
export async function advanceMenuRevision(
  context: PersistenceTransactionContext,
  menu: Menu,
  at: Date = new Date(),
): Promise<Menu> {
  assertTransactionContext(context, "advanceMenuRevision");
  const next = menu.revision + BigInt(1);
  await context.db
    .update(menusTable)
    .set({ revision: next, updatedAt: at })
    .where(
      and(eq(menusTable.id, menu.id), eq(menusTable.revision, menu.revision)),
    );
  return { ...menu, revision: next, updatedAt: at };
}

export async function loadVersionGraph(
  context: PersistenceQueryContext,
  menuVersionId: string,
): Promise<VersionGraph> {
  assertApplicationRole(context, "loadVersionGraph");
  const id = assertUuid(menuVersionId, "menuVersionId");
  const versions = await context.db
    .select()
    .from(menuVersionsTable)
    .where(eq(menuVersionsTable.id, id))
    .limit(1);
  const versionRow = versions[0];
  if (!versionRow) throw new MenuNotFoundError("menu_version");

  const sections = await context.db
    .select()
    .from(menuSectionVersionsTable)
    .where(eq(menuSectionVersionsTable.menuVersionId, id))
    .orderBy(asc(menuSectionVersionsTable.sectionId));

  const entries = await context.db
    .select()
    .from(menuEntryVersionsTable)
    .where(eq(menuEntryVersionsTable.menuVersionId, id))
    .orderBy(asc(menuEntryVersionsTable.entryId));

  return {
    version: rowToMenuVersion(versionRow),
    sections,
    entries,
  };
}

/** Deterministic material fingerprint for publish no-op comparison. */
export function materialGraphFingerprint(
  sections: ReadonlyArray<
    Readonly<{
      sectionId: string;
      parentSectionId: string | null;
      code: string;
      name: string;
      description: string | null;
      position: number;
      lifecycleStatus: string;
    }>
  >,
  entries: ReadonlyArray<
    Readonly<{
      entryId: string;
      sectionId: string;
      productId: string;
      displayName: string | null;
      displayDescription: string | null;
      imagePath: string | null;
      position: number;
      lifecycleStatus: string;
    }>
  >,
): string {
  const sectionPayload = [...sections]
    .map((s) => ({
      sectionId: s.sectionId,
      parentSectionId: s.parentSectionId,
      code: s.code,
      name: s.name,
      description: s.description,
      position: s.position,
      lifecycleStatus: s.lifecycleStatus,
    }))
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId));
  const entryPayload = [...entries]
    .map((e) => ({
      entryId: e.entryId,
      sectionId: e.sectionId,
      productId: e.productId,
      displayName: e.displayName,
      displayDescription: e.displayDescription,
      imagePath: e.imagePath,
      position: e.position,
      lifecycleStatus: e.lifecycleStatus,
    }))
    .sort((a, b) => a.entryId.localeCompare(b.entryId));
  return JSON.stringify({ sections: sectionPayload, entries: entryPayload });
}

export function compareMaterialGraphs(
  left: Readonly<{
    sections: VersionGraph["sections"];
    entries: VersionGraph["entries"];
  }>,
  right: Readonly<{
    sections: VersionGraph["sections"];
    entries: VersionGraph["entries"];
  }>,
): boolean {
  return (
    materialGraphFingerprint(left.sections, left.entries) ===
    materialGraphFingerprint(right.sections, right.entries)
  );
}

async function nextVersionRevision(
  context: PersistenceTransactionContext,
  menu: Menu,
): Promise<bigint> {
  const maxRows = await context.db
    .select({
      maxRevision: sql<string | null>`max(${menuVersionsTable.revision})`,
    })
    .from(menuVersionsTable)
    .where(eq(menuVersionsTable.menuId, menu.id));
  const maxRaw = maxRows[0]?.maxRevision;
  const maxExisting = maxRaw == null ? BigInt(0) : BigInt(maxRaw);
  const candidate = menu.revision > maxExisting ? menu.revision : maxExisting + BigInt(1);
  return candidate;
}

async function copyGraphIntoVersion(
  context: PersistenceTransactionContext,
  input: Readonly<{
    menuVersionId: string;
    menuId: string;
    brandId: string;
    sections: ReadonlyArray<{
      sectionId: string;
      parentSectionId: string | null;
      code: string;
      name: string;
      description: string | null;
      position: number;
      lifecycleStatus: string;
    }>;
    entries: ReadonlyArray<{
      entryId: string;
      sectionId: string;
      productId: string;
      displayName: string | null;
      displayDescription: string | null;
      imagePath: string | null;
      position: number;
      lifecycleStatus: string;
    }>;
  }>,
): Promise<void> {
  for (const section of input.sections) {
    await context.db.insert(menuSectionVersionsTable).values({
      id: randomUUID(),
      menuVersionId: input.menuVersionId,
      sectionId: section.sectionId,
      brandId: input.brandId,
      menuId: input.menuId,
      parentSectionId: section.parentSectionId,
      code: section.code,
      name: section.name,
      description: section.description,
      position: section.position,
      lifecycleStatus: section.lifecycleStatus,
    });
  }
  for (const entry of input.entries) {
    await context.db.insert(menuEntryVersionsTable).values({
      id: randomUUID(),
      menuVersionId: input.menuVersionId,
      entryId: entry.entryId,
      brandId: input.brandId,
      menuId: input.menuId,
      sectionId: entry.sectionId,
      productId: entry.productId,
      displayName: entry.displayName,
      displayDescription: entry.displayDescription,
      imagePath: entry.imagePath,
      position: entry.position,
      lifecycleStatus: entry.lifecycleStatus,
    });
  }
}

async function loadLegacyGraphSeed(
  context: PersistenceTransactionContext,
  menuId: string,
): Promise<{
  sections: Array<{
    sectionId: string;
    parentSectionId: string | null;
    code: string;
    name: string;
    description: string | null;
    position: number;
    lifecycleStatus: string;
  }>;
  entries: Array<{
    entryId: string;
    sectionId: string;
    productId: string;
    displayName: string | null;
    displayDescription: string | null;
    imagePath: string | null;
    position: number;
    lifecycleStatus: string;
  }>;
}> {
  const sections = await context.db
    .select()
    .from(menuSectionsTable)
    .where(eq(menuSectionsTable.menuId, menuId))
    .orderBy(asc(menuSectionsTable.id));
  const entries = await context.db
    .select()
    .from(menuEntriesTable)
    .where(eq(menuEntriesTable.menuId, menuId))
    .orderBy(asc(menuEntriesTable.id));
  return {
    sections: sections.map((s) => ({
      sectionId: s.id,
      parentSectionId: s.parentSectionId,
      code: s.code,
      name: s.name,
      description: s.description,
      position: s.position,
      lifecycleStatus: s.lifecycleStatus,
    })),
    entries: entries.map((e) => ({
      entryId: e.id,
      sectionId: e.sectionId,
      productId: e.productId,
      displayName: e.displayName,
      displayDescription: e.displayDescription,
      imagePath: e.imagePath,
      position: e.position,
      lifecycleStatus: e.lifecycleStatus,
    })),
  };
}

/**
 * Ensure a DRAFT MenuVersion exists for authoring.
 * Copy-on-write from EFFECTIVE when present; otherwise seed from legacy rows.
 * Callers should hold Menu FOR UPDATE (or this locks it).
 */
export async function ensureDraftMenuVersion(
  context: PersistenceTransactionContext,
  input: Readonly<{
    menuId: string;
    actorWorkforceUserId?: string | null;
    at?: Date;
  }>,
): Promise<{ menu: Menu; draft: MenuVersion }> {
  assertTransactionContext(context, "ensureDraftMenuVersion");
  const at = input.at ?? new Date();
  let menu = await lockMenuForUpdate(context, input.menuId);

  if (menu.draftMenuVersionId) {
    const existing = await lockMenuVersionForUpdate(context, menu.draftMenuVersionId);
    if (existing.lifecycleStatus === "DRAFT" && existing.menuId === menu.id) {
      return { menu, draft: existing };
    }
    await context.db
      .update(menusTable)
      .set({ draftMenuVersionId: null, updatedAt: at })
      .where(eq(menusTable.id, menu.id));
    menu = { ...menu, draftMenuVersionId: null, updatedAt: at };
  }

  let seedSections: Awaited<ReturnType<typeof loadLegacyGraphSeed>>["sections"];
  let seedEntries: Awaited<ReturnType<typeof loadLegacyGraphSeed>>["entries"];
  const copiedFromEffective = menu.effectiveMenuVersionId != null;

  if (menu.effectiveMenuVersionId) {
    const effective = await loadVersionGraph(context, menu.effectiveMenuVersionId);
    seedSections = effective.sections.map((s) => ({
      sectionId: s.sectionId,
      parentSectionId: s.parentSectionId,
      code: s.code,
      name: s.name,
      description: s.description,
      position: s.position,
      lifecycleStatus: s.lifecycleStatus,
    }));
    seedEntries = effective.entries.map((e) => ({
      entryId: e.entryId,
      sectionId: e.sectionId,
      productId: e.productId,
      displayName: e.displayName,
      displayDescription: e.displayDescription,
      imagePath: e.imagePath,
      position: e.position,
      lifecycleStatus: e.lifecycleStatus,
    }));
  } else {
    const legacy = await loadLegacyGraphSeed(context, menu.id);
    seedSections = legacy.sections;
    seedEntries = legacy.entries;
  }

  const versionRevision = await nextVersionRevision(context, menu);
  if (versionRevision > menu.revision) {
    await context.db
      .update(menusTable)
      .set({ revision: versionRevision, updatedAt: at })
      .where(eq(menusTable.id, menu.id));
    menu = { ...menu, revision: versionRevision, updatedAt: at };
  }

  const draftId = randomUUID();
  await context.db.insert(menuVersionsTable).values({
    id: draftId,
    menuId: menu.id,
    brandId: menu.brandId,
    revision: versionRevision,
    lifecycleStatus: "DRAFT",
    createdAt: at,
    createdBy: input.actorWorkforceUserId ?? null,
    effectiveAt: null,
    supersededAt: null,
  });

  await copyGraphIntoVersion(context, {
    menuVersionId: draftId,
    menuId: menu.id,
    brandId: menu.brandId,
    sections: seedSections,
    entries: seedEntries,
  });

  await context.db
    .update(menusTable)
    .set({ draftMenuVersionId: draftId, updatedAt: at })
    .where(eq(menusTable.id, menu.id));
  menu = { ...menu, draftMenuVersionId: draftId, updatedAt: at };

  const draft = await lockMenuVersionForUpdate(context, draftId);

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "menu.version_draft_created",
    brandId: menu.brandId,
    menuId: menu.id,
    menuVersionId: draftId,
    targetType: "menu_version",
    targetId: draftId,
    previousMenuRevision: null,
    newMenuRevision: menu.revision,
    metadata: {
      copiedFromEffective,
    },
  });

  return { menu, draft };
}

/**
 * Lock draft version children in deterministic sectionId / entryId order.
 */
export async function lockVersionGraphChildren(
  context: PersistenceTransactionContext,
  menuVersionId: string,
): Promise<{
  sections: MenuSectionVersionRow[];
  entries: MenuEntryVersionRow[];
}> {
  assertTransactionContext(context, "lockVersionGraphChildren");
  const id = assertUuid(menuVersionId, "menuVersionId");
  const sections = await context.db
    .select()
    .from(menuSectionVersionsTable)
    .where(eq(menuSectionVersionsTable.menuVersionId, id))
    .orderBy(asc(menuSectionVersionsTable.sectionId))
    .for("update");
  const entries = await context.db
    .select()
    .from(menuEntryVersionsTable)
    .where(eq(menuEntryVersionsTable.menuVersionId, id))
    .orderBy(asc(menuEntryVersionsTable.entryId))
    .for("update");
  return { sections, entries };
}

export async function upsertDraftSectionVersion(
  context: PersistenceTransactionContext,
  input: Readonly<{
    menuVersionId: string;
    menuId: string;
    brandId: string;
    sectionId: string;
    parentSectionId: string | null;
    code: string;
    name: string;
    description: string | null;
    position: number;
    lifecycleStatus: string;
  }>,
): Promise<void> {
  assertTransactionContext(context, "upsertDraftSectionVersion");
  const existing = await context.db
    .select({ id: menuSectionVersionsTable.id })
    .from(menuSectionVersionsTable)
    .where(
      and(
        eq(menuSectionVersionsTable.menuVersionId, input.menuVersionId),
        eq(menuSectionVersionsTable.sectionId, input.sectionId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await context.db
      .update(menuSectionVersionsTable)
      .set({
        parentSectionId: input.parentSectionId,
        code: input.code,
        name: input.name,
        description: input.description,
        position: input.position,
        lifecycleStatus: input.lifecycleStatus,
      })
      .where(eq(menuSectionVersionsTable.id, existing[0].id));
    return;
  }

  await context.db.insert(menuSectionVersionsTable).values({
    id: randomUUID(),
    menuVersionId: input.menuVersionId,
    sectionId: input.sectionId,
    brandId: input.brandId,
    menuId: input.menuId,
    parentSectionId: input.parentSectionId,
    code: input.code,
    name: input.name,
    description: input.description,
    position: input.position,
    lifecycleStatus: input.lifecycleStatus,
  });
}

export async function upsertDraftEntryVersion(
  context: PersistenceTransactionContext,
  input: Readonly<{
    menuVersionId: string;
    menuId: string;
    brandId: string;
    entryId: string;
    sectionId: string;
    productId: string;
    displayName: string | null;
    displayDescription: string | null;
    imagePath: string | null;
    position: number;
    lifecycleStatus: string;
  }>,
): Promise<void> {
  assertTransactionContext(context, "upsertDraftEntryVersion");
  const existing = await context.db
    .select({ id: menuEntryVersionsTable.id })
    .from(menuEntryVersionsTable)
    .where(
      and(
        eq(menuEntryVersionsTable.menuVersionId, input.menuVersionId),
        eq(menuEntryVersionsTable.entryId, input.entryId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await context.db
      .update(menuEntryVersionsTable)
      .set({
        sectionId: input.sectionId,
        productId: input.productId,
        displayName: input.displayName,
        displayDescription: input.displayDescription,
        imagePath: input.imagePath,
        position: input.position,
        lifecycleStatus: input.lifecycleStatus,
      })
      .where(eq(menuEntryVersionsTable.id, existing[0].id));
    return;
  }

  await context.db.insert(menuEntryVersionsTable).values({
    id: randomUUID(),
    menuVersionId: input.menuVersionId,
    entryId: input.entryId,
    brandId: input.brandId,
    menuId: input.menuId,
    sectionId: input.sectionId,
    productId: input.productId,
    displayName: input.displayName,
    displayDescription: input.displayDescription,
    imagePath: input.imagePath,
    position: input.position,
    lifecycleStatus: input.lifecycleStatus,
  });
}

export { ne, sql };
