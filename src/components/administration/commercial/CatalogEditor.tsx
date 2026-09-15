"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { EmptyState } from "@/components/enterprise/EmptyState";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import {
  enterpriseFieldClass,
  enterpriseFocusRingClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  activateCatalogProduct,
  activateCatalogVariant,
  associateVariantModifierGroup,
  createCatalogProduct,
  createCatalogVariant,
  getCatalogProductGraph,
  listCatalogModifierGroups,
  listCatalogProducts,
  previewCatalogPublish,
  publishCatalogProduct,
  retireCatalogProduct,
  retireCatalogVariant,
  saveProductContentDraft,
  saveVariantContentDraft,
  type CatalogModifierGroupInspection,
  type CatalogProductInspection,
  type CatalogVariantInspection,
  type CatalogVariantModifierGroupRow,
} from "@/lib/administration/commercial-catalog";
import {
  describeAdminFailure,
  fieldErrorFromResult,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type CatalogEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
  onProductsChanged: () => void;
  onSelectProduct: (productId: string, label: string) => void;
  onSelectVariant: (variantId: string, label: string) => void;
}>;

type ReviewState = Readonly<{
  expectedContentRevision: string;
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
  blockers: readonly string[];
  wouldChange: boolean;
}>;

export function CatalogEditor(props: CatalogEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
  const canManage = capabilities.catalogManage && authoringAllowed;
  const canRead = capabilities.catalogRead;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProductInspection[]>([]);
  const [product, setProduct] = useState<CatalogProductInspection | null>(null);
  const [variants, setVariants] = useState<CatalogVariantInspection[]>([]);
  const [modifierGroups, setModifierGroups] = useState<CatalogModifierGroupInspection[]>([]);
  const [variantModifierGroups, setVariantModifierGroups] = useState<
    readonly CatalogVariantModifierGroupRow[]
  >([]);

  const [introOpen, setIntroOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [variantCode, setVariantCode] = useState("");
  const [variantName, setVariantName] = useState("");

  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [variantDraftName, setVariantDraftName] = useState("");
  const [variantDraftDescription, setVariantDraftDescription] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariantInspection | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<string | null>(null);

  const nameErrorId = useId();
  const descErrorId = useId();

  const loadProducts = useCallback(async () => {
    if (!context.brandId || !canRead) return;
    setLoading(true);
    setError(null);
    const result = await listCatalogProducts(context.brandId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setProducts(result.data.products);
  }, [canRead, context.brandId]);

  const loadGraph = useCallback(async () => {
    if (!context.brandId || !context.productId || !canRead) {
      setProduct(null);
      setVariants([]);
      return;
    }
    setLoading(true);
    setError(null);
    const [graphResult, groupsResult] = await Promise.all([
      getCatalogProductGraph(context.brandId, context.productId),
      listCatalogModifierGroups(context.brandId),
    ]);
    setLoading(false);
    if (!graphResult.ok) {
      setError(describeAdminFailure(graphResult));
      return;
    }
    const graph = graphResult.data.graph;
    setProduct(graph.product);
    setVariants(graph.variants);
    setDraftName(graph.product.draft.name);
    setDraftDescription(graph.product.draft.description ?? "");
    setDraftSaved(false);
    setFieldErrors({});

    if (groupsResult.ok) {
      setModifierGroups(groupsResult.data.modifierGroups);
    } else {
      setModifierGroups([]);
    }

    setVariantModifierGroups(graph.variantModifierGroups);

    const preferred =
      graph.variants.find((v) => v.id === context.variantId) ?? graph.variants[0] ?? null;
    setSelectedVariant(preferred);
    if (preferred) {
      setVariantDraftName(preferred.draft.name);
      setVariantDraftDescription(preferred.draft.description ?? "");
    }
  }, [canRead, context.brandId, context.productId, context.variantId]);

  const associatedGroupIdsForSelected = selectedVariant
    ? variantModifierGroups
        .filter((row) => row.variantId === selectedVariant.id)
        .map((row) => row.modifierGroupId)
    : [];

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadGraph();
  }, [loadGraph]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Catalog read required">
        You need catalog.read to inspect offerings.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand to inspect or author catalog offerings.
      </Alert>
    );
  }

  if (loading && products.length === 0 && !product) {
    return <LoadingState label="Loading catalog…" />;
  }

  if (error && products.length === 0 && !product) {
    return <ErrorState message={error} onRetry={() => void loadProducts()} />;
  }

  async function handleCreateProduct() {
    if (!canManage || !context.brandId) return;
    setBusy(true);
    setFieldErrors({});
    const result = await createCatalogProduct(context.brandId, {
      code: newCode.trim(),
      name: newName.trim(),
      productKind: "standard",
      ...(newDescription.trim() ? { description: newDescription.trim() } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      const fe = fieldErrorFromResult(result);
      if (fe?.field) setFieldErrors({ [fe.field]: fe.message });
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setIntroOpen(false);
    setNewCode("");
    setNewName("");
    setNewDescription("");
    props.onStatus("Offering created as draft.");
    props.onProductsChanged();
    props.onSelectProduct(result.data.product.id, result.data.product.draft.name);
    await loadProducts();
  }

  async function handleCreateVariant() {
    if (!canManage || !context.brandId || !context.productId) return;
    setBusy(true);
    const result = await createCatalogVariant(context.brandId, context.productId, {
      code: variantCode.trim(),
      name: variantName.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setVariantCode("");
    setVariantName("");
    props.onStatus("Variant created as draft.");
    props.onSelectVariant(result.data.variant.id, result.data.variant.draft.name);
    await loadGraph();
  }

  async function handleSaveProductDraft() {
    if (!canManage || !context.brandId || !product) return;
    setBusy(true);
    setFieldErrors({});
    const result = await saveProductContentDraft(context.brandId, product.id, {
      expectedContentRevision: product.draftContentRevision,
      name: draftName,
      description: draftDescription.trim() ? draftDescription : null,
    });
    setBusy(false);
    if (!result.ok) {
      const fe = fieldErrorFromResult(result);
      if (fe?.field) setFieldErrors({ [fe.field]: fe.message });
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setDraftSaved(true);
    props.onStatus("Customer truth unchanged — draft saved.");
    await loadGraph();
  }

  async function handleSaveVariantDraft() {
    if (!canManage || !context.brandId || !selectedVariant) return;
    setBusy(true);
    const result = await saveVariantContentDraft(context.brandId, selectedVariant.id, {
      expectedContentRevision: selectedVariant.draftContentRevision,
      name: variantDraftName,
      description: variantDraftDescription.trim() ? variantDraftDescription : null,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setDraftSaved(true);
    props.onStatus("Customer truth unchanged — draft saved.");
    await loadGraph();
  }

  async function openPublishReview() {
    if (!canManage || !context.brandId || !context.productId) return;
    setBusy(true);
    setReviewError(null);
    const result = await previewCatalogPublish(context.brandId, context.productId);
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    const preview = result.data.preview;
    setReview({
      expectedContentRevision: preview.expectedContentRevision,
      draftLabel: product?.draft.name ?? preview.productCode,
      effectiveLabel: product?.effective?.name ?? "No published effective content",
      dimensions: preview.changes.map((c) => ({
        label: `${c.entityKind}${c.entityCode ? ` (${c.entityCode})` : ""}`,
        value: c.summary,
      })),
      blockers: preview.validationBlockers,
      wouldChange: preview.wouldChangeCustomerTruth,
    });
  }

  async function confirmPublish() {
    if (!review || !context.brandId || !context.productId) return;
    setReviewBusy(true);
    setReviewError(null);
    const result = await publishCatalogProduct(context.brandId, context.productId, {
      expectedContentRevision: review.expectedContentRevision,
    });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(describeAdminFailure(result));
      return;
    }
    setReview(null);
    props.onStatus(
      result.data.publication.changed
        ? "Catalog published — customer truth updated."
        : "Publish completed with no customer change.",
    );
    await loadGraph();
    props.onProductsChanged();
  }

  async function runLifecycle(action: "activate-product" | "retire-product" | "activate-variant" | "retire-variant") {
    if (!canManage || !context.brandId) return;
    setBusy(true);
    let result;
    if (action === "activate-product" && product) {
      result = await activateCatalogProduct(context.brandId, product.id);
    } else if (action === "retire-product" && product) {
      result = await retireCatalogProduct(context.brandId, product.id);
    } else if (action === "activate-variant" && selectedVariant) {
      result = await activateCatalogVariant(context.brandId, selectedVariant.id);
    } else if (action === "retire-variant" && selectedVariant) {
      result = await retireCatalogVariant(context.brandId, selectedVariant.id);
    } else {
      setBusy(false);
      return;
    }
    setBusy(false);
    setLifecycleConfirm(null);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Lifecycle updated.");
    await loadGraph();
    await loadProducts();
  }

  async function associateGroup(modifierGroupId: string) {
    if (!canManage || !context.brandId || !selectedVariant) return;
    setBusy(true);
    const result = await associateVariantModifierGroup(context.brandId, selectedVariant.id, {
      modifierGroupId,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Modifier group associated on draft graph.");
    await loadGraph();
  }

  if (!context.productId && products.length === 0) {
    return (
      <div data-testid="catalog-editor" className="space-y-4">
        {!authoringAllowed ? (
          <Alert tone="info" title="Inspection only on this viewport">
            {MOBILE_AUTHORING_MESSAGE}
          </Alert>
        ) : null}
        <EmptyState
          title="No offerings yet"
          description="Introduce a catalog offering to begin commercial authoring for this brand."
          action={
            canManage ? (
              <Button type="button" onClick={() => setIntroOpen(true)}>
                Introduce offering
              </Button>
            ) : undefined
          }
        />
        {introOpen && canManage ? (
          <ProductCreateForm
            code={newCode}
            name={newName}
            description={newDescription}
            busy={busy}
            fieldErrors={fieldErrors}
            onCode={setNewCode}
            onName={setNewName}
            onDescription={setNewDescription}
            onCancel={() => setIntroOpen(false)}
            onSubmit={() => void handleCreateProduct()}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="catalog-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {draftSaved ? (
        <Alert tone="success" title="Draft saved">
          Customer truth unchanged — draft saved.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Offerings</h3>
          {canManage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setIntroOpen((v) => !v)}>
              Introduce offering
            </Button>
          ) : null}
        </div>
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={cn(
                  enterpriseFocusRingClass,
                  "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface,#2E4720)]",
                  context.productId === p.id && "bg-[var(--bg-surface,#2E4720)] font-semibold",
                )}
                onClick={() => props.onSelectProduct(p.id, p.draft.name)}
              >
                <span>{p.draft.name}</span>
                <span className="ml-2 text-[var(--enterprise-muted,#C4D4A8)]">({p.code})</span>
                <StatusBadge
                  tone={p.draft.lifecycleStatus === "active" ? "success" : p.draft.lifecycleStatus === "retired" ? "danger" : "neutral"}
                  className="ml-2"
                >
                  {p.draft.lifecycleStatus}
                </StatusBadge>
                {p.draftDiffersFromEffective ? (
                  <span className="ml-2 text-xs text-amber-200">Draft differs</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {introOpen && canManage ? (
          <ProductCreateForm
            code={newCode}
            name={newName}
            description={newDescription}
            busy={busy}
            fieldErrors={fieldErrors}
            onCode={setNewCode}
            onName={setNewName}
            onDescription={setNewDescription}
            onCancel={() => setIntroOpen(false)}
            onSubmit={() => void handleCreateProduct()}
          />
        ) : null}
      </div>

      {product ? (
        <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{product.draft.name}</h3>
            <StatusBadge tone="neutral">{product.draft.lifecycleStatus}</StatusBadge>
            <span className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
              Draft rev {product.draftContentRevision}
              {product.effectiveContentRevision
                ? ` · Effective rev ${product.effectiveContentRevision}`
                : " · No effective revision"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-[var(--enterprise-muted,#C4D4A8)]">
                Draft
              </p>
              <p className="text-sm">{product.draft.name}</p>
              <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
                {product.draft.description ?? "No description"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-[var(--enterprise-muted,#C4D4A8)]">
                Effective (customer)
              </p>
              {product.effective ? (
                <>
                  <p className="text-sm">{product.effective.name}</p>
                  <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
                    {product.effective.description ?? "No description"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--enterprise-muted,#C4D4A8)]">Not published</p>
              )}
            </div>
          </div>

          {canManage ? (
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="text-sm font-semibold">Edit draft</legend>
              <label className="flex flex-col gap-1 text-sm">
                <span>Name</span>
                <input
                  className={cn(enterpriseFieldClass, "w-full")}
                  value={draftName}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? nameErrorId : undefined}
                  onChange={(e) => setDraftName(e.target.value)}
                />
                {fieldErrors.name ? (
                  <span id={nameErrorId} className="text-xs text-rose-200">
                    {fieldErrors.name}
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Description</span>
                <textarea
                  className={cn(enterpriseFieldClass, "min-h-20 w-full py-2")}
                  value={draftDescription}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? descErrorId : undefined}
                  onChange={(e) => setDraftDescription(e.target.value)}
                />
                {fieldErrors.description ? (
                  <span id={descErrorId} className="text-xs text-rose-200">
                    {fieldErrors.description}
                  </span>
                ) : null}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSaveProductDraft()}>
                  Save draft
                </Button>
                <Button type="button" variant="secondary" onClick={() => void openPublishReview()}>
                  Review &amp; publish
                </Button>
              </div>
            </fieldset>
          ) : null}

          {canManage ? (
            <div className="flex flex-wrap gap-2 border-t border-[var(--enterprise-border,#3D6026)] pt-3">
              {lifecycleConfirm === "activate-product" ? (
                <>
                  <span className="text-sm">Activate this product?</span>
                  <Button type="button" size="sm" onClick={() => void runLifecycle("activate-product")}>
                    Confirm activate
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setLifecycleConfirm(null)}>
                    Cancel
                  </Button>
                </>
              ) : lifecycleConfirm === "retire-product" ? (
                <>
                  <span className="text-sm">Retire this product?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void runLifecycle("retire-product")}
                  >
                    Confirm retire
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setLifecycleConfirm(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLifecycleConfirm("activate-product")}>
                    Activate product
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLifecycleConfirm("retire-product")}>
                    Retire product
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {product ? (
        <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
          <h3 className="text-sm font-semibold">Variants</h3>
          <ul className="space-y-2">
            {variants.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className={cn(
                    enterpriseFocusRingClass,
                    "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface,#2E4720)]",
                    selectedVariant?.id === v.id && "bg-[var(--bg-surface,#2E4720)] font-semibold",
                  )}
                  onClick={() => {
                    setSelectedVariant(v);
                    setVariantDraftName(v.draft.name);
                    setVariantDraftDescription(v.draft.description ?? "");
                    props.onSelectVariant(v.id, v.draft.name);
                  }}
                >
                  {v.draft.name} ({v.code})
                  <StatusBadge className="ml-2" tone="neutral">
                    {v.draft.lifecycleStatus}
                  </StatusBadge>
                </button>
              </li>
            ))}
          </ul>

          {canManage ? (
            <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
              <legend className="mb-1 text-sm font-semibold">Create variant</legend>
              <input
                className={cn(enterpriseFieldClass)}
                placeholder="Code"
                aria-label="Variant code"
                value={variantCode}
                onChange={(e) => setVariantCode(e.target.value)}
              />
              <input
                className={cn(enterpriseFieldClass)}
                placeholder="Name"
                aria-label="Variant name"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
              />
              <Button type="button" onClick={() => void handleCreateVariant()}>
                Create variant
              </Button>
            </fieldset>
          ) : null}

          {selectedVariant && canManage ? (
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="text-sm font-semibold">Edit variant draft</legend>
              <label className="flex flex-col gap-1 text-sm">
                <span>Name</span>
                <input
                  className={cn(enterpriseFieldClass, "w-full")}
                  value={variantDraftName}
                  onChange={(e) => setVariantDraftName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Description</span>
                <textarea
                  className={cn(enterpriseFieldClass, "min-h-16 w-full py-2")}
                  value={variantDraftDescription}
                  onChange={(e) => setVariantDraftDescription(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSaveVariantDraft()}>
                  Save variant draft
                </Button>
                {lifecycleConfirm === "activate-variant" ? (
                  <>
                    <Button type="button" size="sm" onClick={() => void runLifecycle("activate-variant")}>
                      Confirm activate variant
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLifecycleConfirm(null)}>
                      Cancel
                    </Button>
                  </>
                ) : lifecycleConfirm === "retire-variant" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void runLifecycle("retire-variant")}
                    >
                      Confirm retire variant
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLifecycleConfirm(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => setLifecycleConfirm("activate-variant")}>
                      Activate variant
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setLifecycleConfirm("retire-variant")}>
                      Retire variant
                    </Button>
                  </>
                )}
              </div>
            </fieldset>
          ) : null}

          {selectedVariant ? (
            <div className="space-y-2 border-t border-[var(--enterprise-border,#3D6026)] pt-3">
              <h4 className="text-sm font-semibold">Modifier association</h4>
              {modifierGroups.length === 0 ? (
                <Alert tone="info" title="Modifier prerequisite">
                  No modifier structures exist yet. Create modifier groups before associating them.
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {modifierGroups.map((g) => {
                    const linked = associatedGroupIdsForSelected.includes(g.id);
                    return (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {g.draft.name} ({g.code})
                          {linked ? (
                            <span className="ml-2 text-xs text-emerald-200">Associated</span>
                          ) : null}
                        </span>
                        {canManage && !linked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void associateGroup(g.id)}
                          >
                            Associate
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review catalog publish"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected content revision"
        revisionValue={review?.expectedContentRevision ?? ""}
        blockers={review?.blockers}
        wouldChange={review?.wouldChange}
        noOpHint="No customer-visible catalog change is expected."
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

function ProductCreateForm(props: {
  code: string;
  name: string;
  description: string;
  busy: boolean;
  fieldErrors: Record<string, string>;
  onCode: (v: string) => void;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const codeErrId = useId();
  const nameErrId = useId();
  return (
    <fieldset className="space-y-3 rounded-md border border-[var(--enterprise-border,#3D6026)] p-3" disabled={props.busy}>
      <legend className="px-1 text-sm font-semibold">New offering</legend>
      <label className="flex flex-col gap-1 text-sm">
        <span>Code</span>
        <input
          className={cn(enterpriseFieldClass, "w-full")}
          value={props.code}
          aria-invalid={Boolean(props.fieldErrors.code)}
          aria-describedby={props.fieldErrors.code ? codeErrId : undefined}
          onChange={(e) => props.onCode(e.target.value)}
        />
        {props.fieldErrors.code ? (
          <span id={codeErrId} className="text-xs text-rose-200">
            {props.fieldErrors.code}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Name</span>
        <input
          className={cn(enterpriseFieldClass, "w-full")}
          value={props.name}
          aria-invalid={Boolean(props.fieldErrors.name)}
          aria-describedby={props.fieldErrors.name ? nameErrId : undefined}
          onChange={(e) => props.onName(e.target.value)}
        />
        {props.fieldErrors.name ? (
          <span id={nameErrId} className="text-xs text-rose-200">
            {props.fieldErrors.name}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Description</span>
        <textarea
          className={cn(enterpriseFieldClass, "min-h-16 w-full py-2")}
          value={props.description}
          onChange={(e) => props.onDescription(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button type="button" onClick={props.onSubmit}>
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
