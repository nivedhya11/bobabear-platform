/**
 * publishMenuRevision + previewMenuPublication (IMP-036F F3A / F3B).
 *
 * Lock order for publication: Brand FOR UPDATE → Brand Menus (id order) →
 * candidate MenuVersion → section/entry children → validate → material diff →
 * atomic pointer switch + exclusive active Menu.
 *
 * Preview is non-authoring: it never creates a draft when none exists.
 */
import { and, eq, ne } from "drizzle-orm";

import type { MenuLifecycleStatus } from "../../../shared/catalog/menu";
import { menusTable, menuVersionsTable } from "../../../platform/database/schema/menu";
import { requireWorkforcePrincipal } from "../../access-control/principal";
import type { PersistenceTransactionContext } from "../../persistence/types";
import { assertTransactionContext } from "../assert-role";
import {
  activationTimestamps,
  assertUuid,
  retirementTimestamps,
} from "../lifecycle";
import { insertMenuMutationAuditEvent } from "./audit";
import { requireMenuManage } from "./authorize-menu";
import {
  MenuInvalidStateError,
  MenuNotFoundError,
  MenuValidationError,
} from "./errors";
import { findMenuById } from "./menus";
import { assertMenuGraphReady } from "./validation";
import {
  advanceMenuRevision,
  assertExpectedMenuRevision,
  compareMaterialGraphs,
  loadVersionGraph,
  lockBrandForUpdate,
  lockBrandMenusForUpdate,
  lockMenuForUpdate,
  lockMenuVersionForUpdate,
  lockVersionGraphChildren,
  materialGraphFingerprint,
  parseExpectedMenuRevision,
  type MenuEntryVersionRow,
  type MenuSectionVersionRow,
} from "./versions";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
}

function isKnownMenuValidationError(error: unknown): boolean {
  return (
    error instanceof MenuValidationError ||
    error instanceof MenuInvalidStateError ||
    error instanceof MenuNotFoundError
  );
}

export type PublishMenuRevisionInput = Readonly<{
  actor: unknown;
  menuId: string;
  expectedMenuRevision: bigint | number | string;
}>;

export type PublishMenuRevisionResult = Readonly<{
  changed: boolean;
  menuId: string;
  brandId: string;
  menuRevision: bigint;
  previousMenuRevision: bigint;
  effectiveMenuVersionId: string | null;
  previousEffectiveMenuVersionId: string | null;
}>;

export type MenuPublicationSectionChanges = Readonly<{
  added: readonly string[];
  retired: readonly string[];
  activated: readonly string[];
  renamed: readonly string[];
  descriptionChanged: readonly string[];
  reparented: readonly string[];
  reordered: readonly string[];
}>;

export type MenuPublicationEntryChanges = Readonly<{
  added: readonly string[];
  retired: readonly string[];
  activated: readonly string[];
  moved: readonly string[];
  reordered: readonly string[];
  displayNameChanged: readonly string[];
  displayDescriptionChanged: readonly string[];
}>;

export type MenuPublicationChanges = Readonly<{
  sections: MenuPublicationSectionChanges;
  entries: MenuPublicationEntryChanges;
}>;

export type MenuPublicationActiveMenuEffect = Readonly<{
  targetBecomesActive: boolean;
  replacesAnotherActiveMenu: boolean;
  /** Informational snapshot only — not revision-bound by expectedMenuRevision. */
  currentActiveMenuId: string | null;
}>;

export type PreviewMenuPublicationInput = Readonly<{
  actor: unknown;
  menuId: string;
}>;

export type PreviewMenuPublicationResult = Readonly<{
  menuId: string;
  brandId: string;
  expectedMenuRevision: string;
  effectiveMenuVersionId: string | null;
  draftMenuVersionId: string | null;
  draftDiffersFromEffective: boolean;
  wouldChangeCustomerTruth: boolean;
  validationOk: boolean;
  validationBlockers: readonly string[];
  changes: MenuPublicationChanges;
  activeMenuEffect: MenuPublicationActiveMenuEffect;
  materialFingerprintDraft: string | null;
  materialFingerprintEffective: string | null;
  operation: "menu_revision_publish";
  hasPendingDraft: boolean;
}>;

function emptyChanges(): MenuPublicationChanges {
  return {
    sections: {
      added: [],
      retired: [],
      activated: [],
      renamed: [],
      descriptionChanged: [],
      reparented: [],
      reordered: [],
    },
    entries: {
      added: [],
      retired: [],
      activated: [],
      moved: [],
      reordered: [],
      displayNameChanged: [],
      displayDescriptionChanged: [],
    },
  };
}

export function diffMenuPublicationChanges(
  draftSections: readonly MenuSectionVersionRow[],
  draftEntries: readonly MenuEntryVersionRow[],
  effectiveSections: readonly MenuSectionVersionRow[] | null,
  effectiveEntries: readonly MenuEntryVersionRow[] | null,
): MenuPublicationChanges {
  const effectiveSectionMap = new Map(
    (effectiveSections ?? []).map((s) => [s.sectionId, s] as const),
  );
  const effectiveEntryMap = new Map((effectiveEntries ?? []).map((e) => [e.entryId, e] as const));
  const draftSectionMap = new Map(draftSections.map((s) => [s.sectionId, s] as const));
  const draftEntryMap = new Map(draftEntries.map((e) => [e.entryId, e] as const));

  const sectionsAdded: string[] = [];
  const sectionsRetired: string[] = [];
  const sectionsActivated: string[] = [];
  const sectionsRenamed: string[] = [];
  const sectionsDescriptionChanged: string[] = [];
  const sectionsReparented: string[] = [];
  const sectionsReordered: string[] = [];

  for (const draft of draftSections) {
    const prior = effectiveSectionMap.get(draft.sectionId);
    if (!prior) {
      sectionsAdded.push(draft.sectionId);
      continue;
    }
    if (prior.lifecycleStatus !== "retired" && draft.lifecycleStatus === "retired") {
      sectionsRetired.push(draft.sectionId);
    }
    if (prior.lifecycleStatus !== "active" && draft.lifecycleStatus === "active") {
      sectionsActivated.push(draft.sectionId);
    }
    if (prior.name !== draft.name) sectionsRenamed.push(draft.sectionId);
    if ((prior.description ?? null) !== (draft.description ?? null)) {
      sectionsDescriptionChanged.push(draft.sectionId);
    }
    if ((prior.parentSectionId ?? null) !== (draft.parentSectionId ?? null)) {
      sectionsReparented.push(draft.sectionId);
    }
    if (prior.position !== draft.position) sectionsReordered.push(draft.sectionId);
  }

  for (const prior of effectiveSections ?? []) {
    if (!draftSectionMap.has(prior.sectionId) && prior.lifecycleStatus !== "retired") {
      sectionsRetired.push(prior.sectionId);
    }
  }

  const entriesAdded: string[] = [];
  const entriesRetired: string[] = [];
  const entriesActivated: string[] = [];
  const entriesMoved: string[] = [];
  const entriesReordered: string[] = [];
  const entriesDisplayNameChanged: string[] = [];
  const entriesDisplayDescriptionChanged: string[] = [];

  for (const draft of draftEntries) {
    const prior = effectiveEntryMap.get(draft.entryId);
    if (!prior) {
      entriesAdded.push(draft.entryId);
      continue;
    }
    if (prior.lifecycleStatus !== "retired" && draft.lifecycleStatus === "retired") {
      entriesRetired.push(draft.entryId);
    }
    if (prior.lifecycleStatus !== "active" && draft.lifecycleStatus === "active") {
      entriesActivated.push(draft.entryId);
    }
    if (prior.sectionId !== draft.sectionId) entriesMoved.push(draft.entryId);
    if (prior.position !== draft.position) entriesReordered.push(draft.entryId);
    if ((prior.displayName ?? null) !== (draft.displayName ?? null)) {
      entriesDisplayNameChanged.push(draft.entryId);
    }
    if ((prior.displayDescription ?? null) !== (draft.displayDescription ?? null)) {
      entriesDisplayDescriptionChanged.push(draft.entryId);
    }
  }

  for (const prior of effectiveEntries ?? []) {
    if (!draftEntryMap.has(prior.entryId) && prior.lifecycleStatus !== "retired") {
      entriesRetired.push(prior.entryId);
    }
  }

  return {
    sections: {
      added: sectionsAdded,
      retired: sectionsRetired,
      activated: sectionsActivated,
      renamed: sectionsRenamed,
      descriptionChanged: sectionsDescriptionChanged,
      reparented: sectionsReparented,
      reordered: sectionsReordered,
    },
    entries: {
      added: entriesAdded,
      retired: entriesRetired,
      activated: entriesActivated,
      moved: entriesMoved,
      reordered: entriesReordered,
      displayNameChanged: entriesDisplayNameChanged,
      displayDescriptionChanged: entriesDisplayDescriptionChanged,
    },
  };
}

/**
 * Non-authoring consequence preview for deliberate Menu publication.
 * Does NOT call ensureDraftMenuVersion — no pending draft yields a deterministic
 * no-candidate response without advancing authoring/audit state.
 */
export async function previewMenuPublication(
  context: PersistenceTransactionContext,
  input: PreviewMenuPublicationInput,
): Promise<PreviewMenuPublicationResult> {
  assertTransactionContext(context, "previewMenuPublication");
  const menuId = assertUuid(input.menuId, "menuId");
  const menu = await lockMenuForUpdate(context, menuId);
  await requireMenuManage(context, input.actor, menu.brandId);

  const brandMenus = await lockBrandMenusForUpdate(context, menu.brandId);
  const currentActiveMenuId =
    brandMenus.find((row) => row.lifecycleStatus === "active" && row.id !== menuId)?.id ??
    (menu.lifecycleStatus === "active" ? menu.id : null);
  const otherActiveExists = brandMenus.some(
    (row) => row.id !== menuId && row.lifecycleStatus === "active",
  );

  if (!menu.draftMenuVersionId) {
    let effectiveFingerprint: string | null = null;
    if (menu.effectiveMenuVersionId) {
      const effectiveGraph = await loadVersionGraph(context, menu.effectiveMenuVersionId);
      effectiveFingerprint = materialGraphFingerprint(
        effectiveGraph.sections,
        effectiveGraph.entries,
      );
    }
    return {
      menuId,
      brandId: menu.brandId,
      expectedMenuRevision: menu.revision.toString(10),
      effectiveMenuVersionId: menu.effectiveMenuVersionId,
      draftMenuVersionId: null,
      draftDiffersFromEffective: false,
      wouldChangeCustomerTruth: false,
      validationOk: false,
      validationBlockers: [
        "No draft MenuVersion exists to publish; create draft changes first.",
      ],
      changes: emptyChanges(),
      activeMenuEffect: {
        targetBecomesActive: false,
        replacesAnotherActiveMenu: false,
        currentActiveMenuId,
      },
      materialFingerprintDraft: null,
      materialFingerprintEffective: effectiveFingerprint,
      operation: "menu_revision_publish",
      hasPendingDraft: false,
    };
  }

  const draftGraph = await loadVersionGraph(context, menu.draftMenuVersionId);
  let effectiveSections: readonly MenuSectionVersionRow[] | null = null;
  let effectiveEntries: readonly MenuEntryVersionRow[] | null = null;
  let effectiveFingerprint: string | null = null;
  if (menu.effectiveMenuVersionId) {
    const effectiveGraph = await loadVersionGraph(context, menu.effectiveMenuVersionId);
    effectiveSections = effectiveGraph.sections;
    effectiveEntries = effectiveGraph.entries;
    effectiveFingerprint = materialGraphFingerprint(
      effectiveGraph.sections,
      effectiveGraph.entries,
    );
  }

  const draftFingerprint = materialGraphFingerprint(draftGraph.sections, draftGraph.entries);
  const wouldChange =
    effectiveFingerprint == null
      ? draftGraph.sections.length > 0 || draftGraph.entries.length > 0
      : draftFingerprint !== effectiveFingerprint;

  const blockers: string[] = [];
  try {
    await assertMenuGraphReady(context, menuId, { menuVersionId: menu.draftMenuVersionId });
  } catch (error) {
    if (!isKnownMenuValidationError(error)) {
      throw error;
    }
    blockers.push(error instanceof Error ? error.message : "Menu graph validation failed.");
  }

  const changes = diffMenuPublicationChanges(
    draftGraph.sections,
    draftGraph.entries,
    effectiveSections,
    effectiveEntries,
  );

  return {
    menuId,
    brandId: menu.brandId,
    expectedMenuRevision: menu.revision.toString(10),
    effectiveMenuVersionId: menu.effectiveMenuVersionId,
    draftMenuVersionId: menu.draftMenuVersionId,
    draftDiffersFromEffective: wouldChange,
    wouldChangeCustomerTruth: wouldChange,
    validationOk: blockers.length === 0,
    validationBlockers: blockers,
    changes,
    activeMenuEffect: {
      targetBecomesActive: wouldChange && menu.lifecycleStatus !== "active",
      replacesAnotherActiveMenu: wouldChange && otherActiveExists,
      currentActiveMenuId,
    },
    materialFingerprintDraft: draftFingerprint,
    materialFingerprintEffective: effectiveFingerprint,
    operation: "menu_revision_publish",
    hasPendingDraft: true,
  };
}

/**
 * Validate the pending draft graph without publishing or creating a draft.
 */
export async function validateMenuPublication(
  context: PersistenceTransactionContext,
  input: Readonly<{ actor: unknown; menuId: string }>,
): Promise<
  Readonly<{
    menuId: string;
    brandId: string;
    expectedMenuRevision: string;
    validationOk: boolean;
    validationBlockers: readonly string[];
    hasPendingDraft: boolean;
  }>
> {
  assertTransactionContext(context, "validateMenuPublication");
  const menuId = assertUuid(input.menuId, "menuId");
  const menu = await lockMenuForUpdate(context, menuId);
  await requireMenuManage(context, input.actor, menu.brandId);

  if (!menu.draftMenuVersionId) {
    return {
      menuId,
      brandId: menu.brandId,
      expectedMenuRevision: menu.revision.toString(10),
      validationOk: false,
      validationBlockers: [
        "No draft MenuVersion exists to publish; create draft changes first.",
      ],
      hasPendingDraft: false,
    };
  }

  const blockers: string[] = [];
  try {
    await assertMenuGraphReady(context, menuId, { menuVersionId: menu.draftMenuVersionId });
  } catch (error) {
    if (!isKnownMenuValidationError(error)) {
      throw error;
    }
    blockers.push(error instanceof Error ? error.message : "Menu graph validation failed.");
  }

  return {
    menuId,
    brandId: menu.brandId,
    expectedMenuRevision: menu.revision.toString(10),
    validationOk: blockers.length === 0,
    validationBlockers: blockers,
    hasPendingDraft: true,
  };
}

/**
 * Atomic MenuVersion publication + exclusive Brand active-Menu cutover.
 * Material no-op: changed=false, no menu.published, no pointer/lifecycle switch.
 */
export async function publishMenuRevision(
  context: PersistenceTransactionContext,
  input: PublishMenuRevisionInput,
): Promise<PublishMenuRevisionResult> {
  assertTransactionContext(context, "publishMenuRevision");
  const menuId = assertUuid(input.menuId, "menuId");
  const expected = parseExpectedMenuRevision(input.expectedMenuRevision);
  const workforceUserId = actorId(input.actor);

  const soft = await findMenuById(context, menuId);
  if (!soft) throw new MenuNotFoundError("menu");

  await lockBrandForUpdate(context, soft.brandId);
  const brandMenus = await lockBrandMenusForUpdate(context, soft.brandId);
  const menu = brandMenus.find((row) => row.id === menuId);
  if (!menu) throw new MenuNotFoundError("menu");

  await requireMenuManage(context, input.actor, menu.brandId);
  assertExpectedMenuRevision(menu, expected);

  if (menu.lifecycleStatus === "retired") {
    throw new MenuInvalidStateError({
      message: "Cannot publish a menu revision for a retired menu.",
    });
  }

  if (!menu.draftMenuVersionId) {
    throw new MenuValidationError({
      message: "No draft MenuVersion exists to publish; create draft changes first.",
    });
  }

  const candidate = await lockMenuVersionForUpdate(context, menu.draftMenuVersionId);
  if (candidate.lifecycleStatus !== "DRAFT" || candidate.menuId !== menu.id) {
    throw new MenuInvalidStateError({
      message: "Draft MenuVersion pointer does not reference a DRAFT version for this menu.",
    });
  }

  const children = await lockVersionGraphChildren(context, candidate.id);
  await assertMenuGraphReady(context, menuId, { menuVersionId: candidate.id });

  const previousEffectiveId = menu.effectiveMenuVersionId;
  let materiallyDifferent = true;
  if (previousEffectiveId) {
    const prior = await lockMenuVersionForUpdate(context, previousEffectiveId);
    if (prior.lifecycleStatus !== "EFFECTIVE") {
      throw new MenuInvalidStateError({
        message: "Menu.effectiveMenuVersionId does not reference an EFFECTIVE version.",
      });
    }
    const priorChildren = await lockVersionGraphChildren(context, prior.id);
    materiallyDifferent = !compareMaterialGraphs(children, priorChildren);
  } else {
    materiallyDifferent =
      children.sections.some((s) => s.lifecycleStatus === "active") ||
      children.entries.some((e) => e.lifecycleStatus === "active");
  }

  if (!materiallyDifferent) {
    return {
      changed: false,
      menuId: menu.id,
      brandId: menu.brandId,
      menuRevision: expected,
      previousMenuRevision: expected,
      effectiveMenuVersionId: previousEffectiveId,
      previousEffectiveMenuVersionId: previousEffectiveId,
    };
  }

  const now = new Date();
  const stamps = activationTimestamps();

  if (previousEffectiveId) {
    await context.db
      .update(menuVersionsTable)
      .set({
        lifecycleStatus: "SUPERSEDED",
        supersededAt: now,
      })
      .where(
        and(
          eq(menuVersionsTable.id, previousEffectiveId),
          eq(menuVersionsTable.lifecycleStatus, "EFFECTIVE"),
        ),
      );

    await insertMenuMutationAuditEvent(context, {
      actorWorkforceUserId: workforceUserId,
      action: "menu.version_superseded",
      brandId: menu.brandId,
      menuId: menu.id,
      menuVersionId: previousEffectiveId,
      targetType: "menu_version",
      targetId: previousEffectiveId,
      previousMenuRevision: expected,
      newMenuRevision: expected,
      metadata: { supersededBy: candidate.id },
    });
  }

  const strayEffective = await context.db
    .select({ id: menuVersionsTable.id })
    .from(menuVersionsTable)
    .where(
      and(
        eq(menuVersionsTable.menuId, menu.id),
        eq(menuVersionsTable.lifecycleStatus, "EFFECTIVE"),
        ne(menuVersionsTable.id, candidate.id),
      ),
    )
    .for("update");
  for (const stray of strayEffective) {
    if (stray.id === previousEffectiveId) continue;
    await context.db
      .update(menuVersionsTable)
      .set({ lifecycleStatus: "SUPERSEDED", supersededAt: now })
      .where(eq(menuVersionsTable.id, stray.id));
  }

  await context.db
    .update(menuVersionsTable)
    .set({
      lifecycleStatus: "EFFECTIVE",
      effectiveAt: now,
      supersededAt: null,
    })
    .where(eq(menuVersionsTable.id, candidate.id));

  for (const other of brandMenus) {
    if (other.id === menuId || other.lifecycleStatus !== "active") continue;
    const retireStamps = retirementTimestamps(
      other.lifecycleStatus as MenuLifecycleStatus,
      other.activatedAt,
    );
    await context.db
      .update(menusTable)
      .set({
        lifecycleStatus: retireStamps.lifecycleStatus,
        activatedAt: retireStamps.activatedAt,
        retiredAt: retireStamps.retiredAt,
        updatedAt: retireStamps.updatedAt,
      })
      .where(eq(menusTable.id, other.id));
  }

  await context.db
    .update(menusTable)
    .set({
      effectiveMenuVersionId: candidate.id,
      draftMenuVersionId: null,
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: menu.activatedAt ?? stamps.activatedAt,
      retiredAt: null,
      updatedAt: now,
    })
    .where(eq(menusTable.id, menu.id));

  const advanced = await advanceMenuRevision(
    context,
    {
      ...menu,
      draftMenuVersionId: null,
      effectiveMenuVersionId: candidate.id,
      lifecycleStatus: "active",
      activatedAt: menu.activatedAt ?? stamps.activatedAt,
      retiredAt: null,
      updatedAt: now,
    },
    now,
  );

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.publish_attempted",
    brandId: menu.brandId,
    menuId: menu.id,
    menuVersionId: candidate.id,
    targetType: "menu",
    targetId: menu.id,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
  });

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.published",
    brandId: menu.brandId,
    menuId: menu.id,
    menuVersionId: candidate.id,
    targetType: "menu",
    targetId: menu.id,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
    metadata: {
      previousEffectiveMenuVersionId: previousEffectiveId ?? "",
      effectiveMenuVersionId: candidate.id,
      firstCutover: previousEffectiveId == null,
    },
  });

  return {
    changed: true,
    menuId: menu.id,
    brandId: menu.brandId,
    menuRevision: advanced.revision,
    previousMenuRevision: expected,
    effectiveMenuVersionId: candidate.id,
    previousEffectiveMenuVersionId: previousEffectiveId,
  };
}
