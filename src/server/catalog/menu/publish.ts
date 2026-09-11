/**
 * publishMenuRevision + previewMenuPublication (IMP-036F F3A).
 *
 * Lock order for publication: Brand FOR UPDATE → Brand Menus (id order) →
 * candidate MenuVersion → section/entry children → validate → material diff →
 * atomic pointer switch + exclusive active Menu.
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
  ensureDraftMenuVersion,
  loadVersionGraph,
  lockBrandForUpdate,
  lockBrandMenusForUpdate,
  lockMenuForUpdate,
  lockMenuVersionForUpdate,
  lockVersionGraphChildren,
  materialGraphFingerprint,
  parseExpectedMenuRevision,
} from "./versions";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
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
  wouldChangeCustomerTruth: boolean;
  validationOk: boolean;
  validationBlockers: readonly string[];
  materialFingerprintDraft: string | null;
  materialFingerprintEffective: string | null;
  operation: "menu_revision_publish";
}>;

export async function previewMenuPublication(
  context: PersistenceTransactionContext,
  input: PreviewMenuPublicationInput,
): Promise<PreviewMenuPublicationResult> {
  assertTransactionContext(context, "previewMenuPublication");
  const menuId = assertUuid(input.menuId, "menuId");
  const menu = await lockMenuForUpdate(context, menuId);
  await requireMenuManage(context, input.actor, menu.brandId);

  const workforceUserId = actorId(input.actor);
  const { menu: withDraft, draft } = await ensureDraftMenuVersion(context, {
    menuId,
    actorWorkforceUserId: workforceUserId,
  });

  const draftGraph = await loadVersionGraph(context, draft.id);
  let effectiveFingerprint: string | null = null;
  if (withDraft.effectiveMenuVersionId) {
    const effectiveGraph = await loadVersionGraph(context, withDraft.effectiveMenuVersionId);
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
    await assertMenuGraphReady(context, menuId, { menuVersionId: draft.id });
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "Menu graph validation failed.");
  }

  return {
    menuId,
    brandId: withDraft.brandId,
    expectedMenuRevision: withDraft.revision.toString(),
    effectiveMenuVersionId: withDraft.effectiveMenuVersionId,
    draftMenuVersionId: draft.id,
    wouldChangeCustomerTruth: wouldChange,
    validationOk: blockers.length === 0,
    validationBlockers: blockers,
    materialFingerprintDraft: draftFingerprint,
    materialFingerprintEffective: effectiveFingerprint,
    operation: "menu_revision_publish",
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
