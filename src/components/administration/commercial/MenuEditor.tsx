"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { EmptyState } from "@/components/enterprise/EmptyState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import {
  enterpriseFieldClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  activateMenuEntry,
  activateMenuSection,
  addMenuEntry,
  addMenuSection,
  createMenu,
  getMenu,
  listMenus,
  previewMenuPublish,
  publishMenu,
  reorderMenuEntries,
  reorderMenuSections,
  retireMenuEntry,
  retireMenuSection,
  saveMenuEntryDisplayDraft,
  type MenuDetail,
  type MenuEntry,
  type MenuListItem,
  type MenuSection,
} from "@/lib/administration/commercial-menu";
import {
  describeAdminFailure,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type MenuEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
  onSelectMenu: (menuId: string | null) => void;
}>;

type ReviewState = Readonly<{
  expectedMenuRevision: string;
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
  blockers: readonly string[];
  wouldChange: boolean;
}>;

type HierarchicalSection = Readonly<{
  section: MenuSection;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
}>;

function nonRetiredSiblings(
  sections: readonly MenuSection[],
  parentSectionId: string | null,
): MenuSection[] {
  return sections
    .filter(
      (s) => s.parentSectionId === parentSectionId && s.lifecycleStatus !== "retired",
    )
    .sort((a, b) => a.position - b.position);
}

/** Roots by position, then children indented under parents (depth-aware). */
function hierarchicalSections(sections: readonly MenuSection[]): HierarchicalSection[] {
  const out: HierarchicalSection[] = [];
  function walk(parentSectionId: string | null, depth: number) {
    const children = sections
      .filter((s) => s.parentSectionId === parentSectionId)
      .sort((a, b) => a.position - b.position);
    const movable = children.filter((s) => s.lifecycleStatus !== "retired");
    for (const section of children) {
      const movableIdx = movable.findIndex((s) => s.id === section.id);
      out.push({
        section,
        depth,
        isFirst: movableIdx === 0,
        isLast: movableIdx >= 0 && movableIdx === movable.length - 1,
      });
      walk(section.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

function lifecycleTone(status: string): "success" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "retired") return "danger";
  return "neutral";
}

export function MenuEditor(props: MenuEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
  const canRead = capabilities.menuRead;
  const canManage = capabilities.menuManage && authoringAllowed;

  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState<MenuListItem[]>([]);
  const [detail, setDetail] = useState<(MenuDetail & { ok?: true }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [sectionCode, setSectionCode] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [entrySectionId, setEntrySectionId] = useState("");
  const [entryDisplayName, setEntryDisplayName] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayDescription, setDisplayDescription] = useState("");

  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadMenus = useCallback(async () => {
    if (!context.brandId || !canRead) return;
    setLoading(true);
    setError(null);
    const result = await listMenus(context.brandId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setMenus(result.data.menus);
  }, [canRead, context.brandId]);

  const loadDetail = useCallback(async () => {
    if (!context.brandId || !context.menuId || !canRead) {
      setDetail(null);
      return;
    }
    setLoading(true);
    const result = await getMenu(context.brandId, context.menuId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      setDetail(null);
      return;
    }
    setDetail(result.data);
    setError(null);
  }, [canRead, context.brandId, context.menuId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadMenus();
  }, [loadMenus]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadDetail();
  }, [loadDetail]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Menu read required">
        You need menu.read to inspect menus.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand to manage customer menu presentation.
      </Alert>
    );
  }

  if (loading && menus.length === 0 && !detail) {
    return <LoadingState label="Loading menus…" />;
  }

  const draft = detail?.draft ?? null;
  const effective = detail?.effective ?? null;
  const sections = draft?.sections ?? [];
  const entries = draft?.entries ?? [];
  const revision = detail?.menu.revision ?? "";

  async function handleCreateMenu() {
    if (!canManage || !context.brandId) return;
    setBusy(true);
    const result = await createMenu(context.brandId, {
      code: newCode.trim(),
      name: newName.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setNewCode("");
    setNewName("");
    props.onStatus("Menu created as draft.");
    props.onSelectMenu(result.data.menu.id);
    await loadMenus();
  }

  async function handleAddSection() {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await addMenuSection(context.brandId, context.menuId, {
      expectedMenuRevision: detail.menu.revision,
      code: sectionCode.trim(),
      name: sectionName.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setSectionCode("");
    setSectionName("");
    props.onStatus("Section added to draft.");
    await loadDetail();
  }

  async function handleAddEntry() {
    if (!canManage || !context.brandId || !context.menuId || !detail || !context.productId) return;
    setBusy(true);
    const result = await addMenuEntry(context.brandId, context.menuId, {
      expectedMenuRevision: detail.menu.revision,
      sectionId: entrySectionId,
      productId: context.productId,
      ...(entryDisplayName.trim() ? { displayName: entryDisplayName.trim() } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setEntryDisplayName("");
    props.onStatus("Product entry placed on draft menu.");
    await loadDetail();
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const siblings = nonRetiredSiblings(sections, section.parentSectionId);
    const idx = siblings.findIndex((s) => s.id === sectionId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;
    const next = [...siblings];
    const a = next[idx]!;
    const b = next[swapIdx]!;
    next[idx] = b;
    next[swapIdx] = a;
    setBusy(true);
    const result = await reorderMenuSections(context.brandId, context.menuId, {
      expectedMenuRevision: detail.menu.revision,
      orderedSectionIds: next.map((s) => s.id),
      parentSectionId: section.parentSectionId,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Sections reordered on draft.");
    await loadDetail();
  }

  async function handleActivateSection(sectionId: string) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await activateMenuSection(context.brandId, context.menuId, sectionId, {
      expectedMenuRevision: detail.menu.revision,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Section activated.");
    await loadDetail();
  }

  async function handleRetireSection(sectionId: string) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await retireMenuSection(context.brandId, context.menuId, sectionId, {
      expectedMenuRevision: detail.menu.revision,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Section retired.");
    await loadDetail();
  }

  async function handleActivateEntry(entryId: string) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await activateMenuEntry(context.brandId, context.menuId, entryId, {
      expectedMenuRevision: detail.menu.revision,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Entry activated.");
    await loadDetail();
  }

  async function handleRetireEntry(entryId: string) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await retireMenuEntry(context.brandId, context.menuId, entryId, {
      expectedMenuRevision: detail.menu.revision,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Entry retired.");
    await loadDetail();
  }

  async function moveEntry(sectionId: string, entryId: string, direction: -1 | 1) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    const sectionEntries = entries
      .filter((e) => e.sectionId === sectionId)
      .sort((a, b) => a.position - b.position);
    const idx = sectionEntries.findIndex((e) => e.id === entryId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sectionEntries.length) return;
    const next = [...sectionEntries];
    const a = next[idx]!;
    const b = next[swapIdx]!;
    next[idx] = b;
    next[swapIdx] = a;
    setBusy(true);
    const result = await reorderMenuEntries(context.brandId, context.menuId, sectionId, {
      expectedMenuRevision: detail.menu.revision,
      orderedEntryIds: next.map((e) => e.id),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Entries reordered on draft.");
    await loadDetail();
  }

  async function saveDisplay(entry: MenuEntry) {
    if (!canManage || !context.brandId || !context.menuId || !detail) return;
    setBusy(true);
    const result = await saveMenuEntryDisplayDraft(context.brandId, context.menuId, entry.id, {
      expectedMenuRevision: detail.menu.revision,
      displayName: displayName.trim() ? displayName : null,
      displayDescription: displayDescription.trim() ? displayDescription : null,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setEditingEntryId(null);
    props.onStatus("Display override saved on draft.");
    await loadDetail();
  }

  async function openPublishReview() {
    if (!canManage || !context.brandId || !context.menuId) return;
    setBusy(true);
    const result = await previewMenuPublish(context.brandId, context.menuId);
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    const preview = result.data.preview;
    const active = preview.activeMenuEffect;
    const dimensions: { label: string; value: string }[] = [
      {
        label: "One active customer menu",
        value: active.targetBecomesActive
          ? active.replacesAnotherActiveMenu
            ? `This menu becomes the sole active customer menu (replaces ${active.currentActiveMenuId ?? "current"}).`
            : "This menu becomes the active customer menu."
          : "This publish does not activate this menu as the customer menu.",
      },
      {
        label: "Draft differs from effective",
        value: preview.draftDiffersFromEffective ? "Yes" : "No",
      },
    ];
    setReview({
      expectedMenuRevision: preview.expectedMenuRevision,
      draftLabel: detail?.menu.name ?? context.menuId,
      effectiveLabel: effective ? "Has effective version" : "No effective version yet",
      dimensions,
      blockers: preview.validationBlockers,
      wouldChange: preview.wouldChangeCustomerTruth,
    });
    setReviewError(null);
  }

  async function confirmPublish() {
    if (!review || !context.brandId || !context.menuId) return;
    setReviewBusy(true);
    setReviewError(null);
    const result = await publishMenu(context.brandId, context.menuId, {
      expectedMenuRevision: review.expectedMenuRevision,
    });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(describeAdminFailure(result));
      return;
    }
    setReview(null);
    props.onStatus(
      result.data.publication.changed
        ? "Menu published — customer presentation updated."
        : "Publish completed with no customer change.",
    );
    await loadDetail();
    await loadMenus();
  }

  return (
    <div data-testid="menu-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <h3 className="text-sm font-semibold">Menus</h3>
        {menus.length === 0 ? (
          <EmptyState title="No menus yet" description="Create a menu to organize customer presentation." />
        ) : (
          <ul className="space-y-2">
            {menus.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface,#2E4720)]",
                    context.menuId === m.id && "bg-[var(--bg-surface,#2E4720)] font-semibold",
                  )}
                  onClick={() => props.onSelectMenu(m.id)}
                >
                  {m.name} ({m.code})
                  <StatusBadge className="ml-2" tone="neutral">
                    {m.lifecycleStatus}
                  </StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
            <legend className="mb-1 text-sm font-semibold">Create menu</legend>
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Code"
              aria-label="Menu code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Name"
              aria-label="Menu name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="button" onClick={() => void handleCreateMenu()}>
              Create menu
            </Button>
          </fieldset>
        ) : null}
      </div>

      {detail ? (
        <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{detail.menu.name}</h3>
            <span className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
              Revision {revision}
              {detail.draftDiffersFromEffective ? " · Draft differs from effective" : ""}
            </span>
          </div>

          <Alert tone="info" title="One active customer menu">
            Publishing may replace another active menu. Review the active-menu effect before
            confirming.
          </Alert>

          {hierarchicalSections(sections).map(({ section, depth, isFirst, isLast }) => (
              <SectionBlock
                key={section.id}
                section={section}
                depth={depth}
                entries={entries
                  .filter((e) => e.sectionId === section.id)
                  .sort((a, b) => a.position - b.position)}
                canManage={canManage}
                isFirst={isFirst}
                isLast={isLast}
                editingEntryId={editingEntryId}
                displayName={displayName}
                displayDescription={displayDescription}
                onMoveSection={(dir) => void moveSection(section.id, dir)}
                onMoveEntry={(entryId, dir) => void moveEntry(section.id, entryId, dir)}
                onActivateSection={
                  section.lifecycleStatus === "draft"
                    ? () => void handleActivateSection(section.id)
                    : undefined
                }
                onRetireSection={
                  section.lifecycleStatus === "active"
                    ? () => void handleRetireSection(section.id)
                    : undefined
                }
                onActivateEntry={(entryId) => void handleActivateEntry(entryId)}
                onRetireEntry={(entryId) => void handleRetireEntry(entryId)}
                onEditEntry={(entry) => {
                  setEditingEntryId(entry.id);
                  setDisplayName(entry.displayName ?? "");
                  setDisplayDescription(entry.displayDescription ?? "");
                }}
                onDisplayName={setDisplayName}
                onDisplayDescription={setDisplayDescription}
                onSaveDisplay={(entry) => void saveDisplay(entry)}
                onCancelEdit={() => setEditingEntryId(null)}
              />
            ))}

          {canManage ? (
            <>
              <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
                <legend className="mb-1 text-sm font-semibold">Add section</legend>
                <input
                  className={cn(enterpriseFieldClass)}
                  placeholder="Code"
                  aria-label="Section code"
                  value={sectionCode}
                  onChange={(e) => setSectionCode(e.target.value)}
                />
                <input
                  className={cn(enterpriseFieldClass)}
                  placeholder="Name"
                  aria-label="Section name"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                />
                <Button type="button" onClick={() => void handleAddSection()}>
                  Add section
                </Button>
              </fieldset>

              <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
                <legend className="mb-1 text-sm font-semibold">
                  Place product entry
                  {!context.productId ? " (select a product in context)" : ""}
                </legend>
                <select
                  className={cn(enterpriseFieldClass)}
                  aria-label="Target section"
                  value={entrySectionId}
                  onChange={(e) => setEntrySectionId(e.target.value)}
                >
                  <option value="">Section…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  className={cn(enterpriseFieldClass)}
                  placeholder="Display name override (optional)"
                  aria-label="Display name override"
                  value={entryDisplayName}
                  onChange={(e) => setEntryDisplayName(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={!context.productId || !entrySectionId}
                  onClick={() => void handleAddEntry()}
                >
                  Place entry
                </Button>
              </fieldset>

              <Button type="button" variant="secondary" onClick={() => void openPublishReview()}>
                Review &amp; publish
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review menu publish"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected menu revision"
        revisionValue={review?.expectedMenuRevision ?? ""}
        blockers={review?.blockers}
        wouldChange={review?.wouldChange}
        noOpHint="No customer-visible menu change is expected."
        busy={reviewBusy}
        error={reviewError}
        confirmLabel="Publish changes"
        onCancel={() => {
          if (reviewBusy) return;
          setReview(null);
          props.onStatus("No effect — draft work remains.");
        }}
        onConfirm={() => void confirmPublish()}
      />
    </div>
  );
}

function SectionBlock(props: {
  section: MenuSection;
  depth: number;
  entries: MenuEntry[];
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  editingEntryId: string | null;
  displayName: string;
  displayDescription: string;
  onMoveSection: (dir: -1 | 1) => void;
  onMoveEntry: (entryId: string, dir: -1 | 1) => void;
  onActivateSection?: () => void;
  onRetireSection?: () => void;
  onActivateEntry: (entryId: string) => void;
  onRetireEntry: (entryId: string) => void;
  onEditEntry: (entry: MenuEntry) => void;
  onDisplayName: (v: string) => void;
  onDisplayDescription: (v: string) => void;
  onSaveDisplay: (entry: MenuEntry) => void;
  onCancelEdit: () => void;
}) {
  const sectionMovable = props.section.lifecycleStatus !== "retired";
  return (
    <div
      className="rounded-md border border-[var(--enterprise-border,#3D6026)] p-3"
      style={props.depth > 0 ? { paddingLeft: `${props.depth}rem` } : undefined}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          {props.section.name}{" "}
          <span className="font-normal text-[var(--enterprise-muted,#C4D4A8)]">
            ({props.section.code})
          </span>
          <StatusBadge className="ml-2" tone={lifecycleTone(props.section.lifecycleStatus)}>
            {props.section.lifecycleStatus}
          </StatusBadge>
        </h4>
        {props.canManage ? (
          <div className="flex flex-wrap gap-1">
            {sectionMovable ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={props.isFirst}
                  onClick={() => props.onMoveSection(-1)}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={props.isLast}
                  onClick={() => props.onMoveSection(1)}
                >
                  Move down
                </Button>
              </>
            ) : null}
            {props.onActivateSection ? (
              <Button type="button" size="sm" variant="outline" onClick={props.onActivateSection}>
                Activate section
              </Button>
            ) : null}
            {props.onRetireSection ? (
              <Button type="button" size="sm" variant="outline" onClick={props.onRetireSection}>
                Retire section
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <ul className="space-y-3">
        {props.entries.map((entry, idx) => (
          <li key={entry.id} className="space-y-2 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {entry.displayName ?? `Product ${entry.productId.slice(0, 8)}…`}
                  <StatusBadge className="ml-2" tone={lifecycleTone(entry.lifecycleStatus)}>
                    {entry.lifecycleStatus}
                  </StatusBadge>
                </p>
                <p className="text-[var(--enterprise-text-secondary,#EBD9A6)]">
                  {entry.displayDescription ?? "No display description override"}
                </p>
                <p className="mt-1 text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                  Media reference:{" "}
                  {entry.imagePath ? (
                    <code>{entry.imagePath}</code>
                  ) : (
                    <span>No media reference</span>
                  )}
                </p>
              </div>
              {props.canManage ? (
                <div className="flex flex-wrap gap-1">
                  {entry.lifecycleStatus !== "retired" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={idx === 0}
                        onClick={() => props.onMoveEntry(entry.id, -1)}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={idx === props.entries.length - 1}
                        onClick={() => props.onMoveEntry(entry.id, 1)}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => props.onEditEntry(entry)}
                      >
                        Display override
                      </Button>
                    </>
                  ) : null}
                  {entry.lifecycleStatus === "draft" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => props.onActivateEntry(entry.id)}
                    >
                      Activate entry
                    </Button>
                  ) : null}
                  {entry.lifecycleStatus === "active" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => props.onRetireEntry(entry.id)}
                    >
                      Retire entry
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {props.editingEntryId === entry.id && props.canManage ? (
              <fieldset className="space-y-2 rounded border border-[var(--enterprise-border,#3D6026)] p-2">
                <label className="flex flex-col gap-1">
                  <span>Display name</span>
                  <input
                    className={cn(enterpriseFieldClass, "w-full")}
                    value={props.displayName}
                    onChange={(e) => props.onDisplayName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Display description</span>
                  <textarea
                    className={cn(enterpriseFieldClass, "min-h-14 w-full py-2")}
                    value={props.displayDescription}
                    onChange={(e) => props.onDisplayDescription(e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => props.onSaveDisplay(entry)}>
                    Save display draft
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={props.onCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </fieldset>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
