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
import { getCatalogProductGraph } from "@/lib/administration/commercial-catalog";
import {
  activatePriceBook,
  attachModifierPrice,
  attachVariantPrice,
  createPriceBook,
  getPriceBook,
  listPriceBooks,
  previewPriceBookActivation,
  type PriceBook,
  type PriceBookInspection,
} from "@/lib/administration/commercial-pricing";
import {
  describeAdminFailure,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { formatInrFromPaise, parseInrToPaise } from "@/lib/administration/commercial-money";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "@/shared/pricing";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type PricingEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
}>;

type ReviewState = Readonly<{
  expectedPriceBookRevision: string;
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
  blockers: readonly string[];
  wouldChange: boolean;
}>;

type ModifierPriceChoice = Readonly<{
  key: string;
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  label: string;
}>;

export function PricingEditor(props: PricingEditorProps) {
  const { context, capabilities, authoringAllowed, onStatus } = props;
  const canRead = capabilities.pricingRead;
  const canManage = capabilities.pricingManage && authoringAllowed;

  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<PriceBook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspection, setInspection] = useState<PriceBookInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amountInr, setAmountInr] = useState("");
  const [modifierDeltaInr, setModifierDeltaInr] = useState("");
  const [modifierChoiceKey, setModifierChoiceKey] = useState("");
  const [modifierChoices, setModifierChoices] = useState<ModifierPriceChoice[]>([]);
  const [modifierGraphReady, setModifierGraphReady] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const hasInspection = inspection !== null;

  const loadBooks = useCallback(async () => {
    if (!context.brandId || !canRead) return;
    setLoading(true);
    setError(null);
    const result = await listPriceBooks(context.brandId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setBooks(result.data.priceBooks);
  }, [canRead, context.brandId]);

  const loadInspection = useCallback(async () => {
    if (!context.brandId || !selectedId || !canRead) {
      setInspection(null);
      return;
    }
    setLoading(true);
    const result = await getPriceBook(context.brandId, selectedId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setInspection(result.data.inspection);
  }, [canRead, context.brandId, selectedId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadInspection();
  }, [loadInspection]);

  const loadModifierChoices = useCallback(async () => {
    if (!canManage || !context.brandId || !context.productId || !context.variantId || !hasInspection) {
      setModifierChoices([]);
      setModifierChoiceKey("");
      setModifierGraphReady(false);
      return;
    }
    const result = await getCatalogProductGraph(context.brandId, context.productId);
    if (!result.ok) {
      setModifierChoices([]);
      setModifierChoiceKey("");
      setModifierGraphReady(true);
      onStatus(describeAdminFailure(result));
      return;
    }
    const { graph } = result.data;
    const variantId = context.variantId;
    const choices: ModifierPriceChoice[] = [];
    for (const vmg of graph.variantModifierGroups.filter((row) => row.variantId === variantId)) {
      const group = graph.modifierGroups.find((g) => g.id === vmg.modifierGroupId);
      const groupLabel = group?.draft.name ?? group?.code ?? `${vmg.modifierGroupId.slice(0, 8)}…`;
      for (const mgo of graph.modifierGroupOptions.filter(
        (row) => row.modifierGroupId === vmg.modifierGroupId,
      )) {
        const option = graph.modifierOptions.find((o) => o.id === mgo.modifierOptionId);
        const optionLabel = option?.draft?.name ?? option?.code ?? `${mgo.id.slice(0, 8)}…`;
        choices.push({
          key: `${vmg.id}:${mgo.id}`,
          variantModifierGroupId: vmg.id,
          modifierGroupOptionId: mgo.id,
          label: `${groupLabel} · ${optionLabel}`,
        });
      }
    }
    setModifierChoices(choices);
    setModifierChoiceKey((prev) => (choices.some((c) => c.key === prev) ? prev : ""));
    setModifierGraphReady(true);
  }, [
    canManage,
    context.brandId,
    context.productId,
    context.variantId,
    hasInspection,
    onStatus,
  ]);

  useEffect(() => {
    // Data-fetch effect: catalog associations for selected variant only.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadModifierChoices();
  }, [loadModifierChoices]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Pricing read required">
        You need pricing.read to inspect price books.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand to author pricing.
      </Alert>
    );
  }

  if (loading && books.length === 0 && !inspection) {
    return <LoadingState label="Loading pricing…" />;
  }

  async function handleCreate() {
    if (!canManage || !context.brandId) return;
    setBusy(true);
    const result = await createPriceBook(context.brandId, {
      scopeType: context.outletId ? "outlet" : "brand",
      ...(context.outletId ? { outletId: context.outletId } : {}),
      code: code.trim(),
      name: name.trim(),
      effectiveFrom: new Date().toISOString(),
      taxInclusionMode: "exclusive",
      currency: "INR",
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setCode("");
    setName("");
    setSelectedId(result.data.priceBook.id);
    props.onStatus(
      context.outletId
        ? "Outlet-scoped price book created as draft."
        : "Price book created as draft.",
    );
    await loadBooks();
  }

  async function handleAttachPrice() {
    if (!canManage || !context.brandId || !selectedId || !inspection || !context.variantId) return;
    const paise = parseInrToPaise(amountInr);
    if (paise === null) {
      onStatus("Enter a valid INR amount (e.g. 199.00).");
      return;
    }
    setBusy(true);
    const result = await attachVariantPrice(context.brandId, selectedId, {
      expectedPriceBookRevision: inspection.priceBook.revision,
      variantId: context.variantId,
      amountPaise: paise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    setBusy(false);
    if (!result.ok) {
      onStatus(describeAdminFailure(result));
      return;
    }
    setAmountInr("");
    onStatus("Baseline variant price attached on draft price book.");
    await loadInspection();
  }

  async function handleAttachModifierPrice() {
    if (!canManage || !context.brandId || !selectedId || !inspection) return;
    const choice = modifierChoices.find((c) => c.key === modifierChoiceKey);
    if (!choice) {
      onStatus("Select a modifier association and option.");
      return;
    }
    const paise = parseInrToPaise(modifierDeltaInr);
    if (paise === null) {
      onStatus("Enter a valid INR delta (e.g. 20.00).");
      return;
    }
    setBusy(true);
    const result = await attachModifierPrice(context.brandId, selectedId, {
      expectedPriceBookRevision: inspection.priceBook.revision,
      variantModifierGroupId: choice.variantModifierGroupId,
      modifierGroupOptionId: choice.modifierGroupOptionId,
      priceDeltaPaise: paise,
    });
    setBusy(false);
    if (!result.ok) {
      onStatus(describeAdminFailure(result));
      return;
    }
    setModifierDeltaInr("");
    onStatus("Modifier price attached on draft price book.");
    await loadInspection();
  }

  async function openActivateReview() {
    if (!canManage || !context.brandId || !selectedId) return;
    setBusy(true);
    setReviewError(null);
    try {
      const result = await previewPriceBookActivation(context.brandId, selectedId);
      setBusy(false);
      if (!result.ok) {
        onStatus(describeAdminFailure(result));
        return;
      }
      const preview = result.data.preview;
      setReview({
        expectedPriceBookRevision: preview.expectedPriceBookRevision,
        draftLabel: `Proposed activation · ${preview.lifecycleStatus}`,
        effectiveLabel: preview.customerMonetaryConsequence,
        dimensions: [
          ...preview.variantPriceChanges.slice(0, 12).flatMap((c) => [
            {
              label: "Current customer price",
              value: `${formatInrFromPaise(c.currentAmountPaise)} (variant ${c.variantId.slice(0, 8)}…)`,
            },
            {
              label: "Proposed customer price",
              value: `${formatInrFromPaise(c.proposedAmountPaise)} (variant ${c.variantId.slice(0, 8)}…)`,
            },
          ]),
          ...[...preview.overlapBlockers, ...preview.referenceBlockers].map((b) => ({
            label: "Blocker",
            value: b,
          })),
        ],
        blockers: [...preview.overlapBlockers, ...preview.referenceBlockers],
        wouldChange: preview.wouldChangeCustomerPricing,
      });
    } catch {
      setBusy(false);
      onStatus("Price book review could not be composed. Reload and try again.");
    }
  }

  async function confirmActivate() {
    if (!review || !context.brandId || !selectedId) return;
    setReviewBusy(true);
    setReviewError(null);
    const result = await activatePriceBook(context.brandId, selectedId, {
      expectedPriceBookRevision: review.expectedPriceBookRevision,
    });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(describeAdminFailure(result));
      return;
    }
    setReview(null);
    onStatus("Price book activated.");
    await loadBooks();
    await loadInspection();
  }

  return (
    <div data-testid="pricing-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <h3 className="text-sm font-semibold">Price books</h3>
        {books.length === 0 ? (
          <EmptyState title="No price books" description="Create a draft price book to attach baseline prices." />
        ) : (
          <ul className="space-y-2">
            {books.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface,#2E4720)]",
                    selectedId === b.id && "bg-[var(--bg-surface,#2E4720)] font-semibold",
                  )}
                  onClick={() => setSelectedId(b.id)}
                >
                  {b.name} ({b.code})
                  <StatusBadge className="ml-2" tone={b.lifecycleStatus === "active" ? "success" : "neutral"}>
                    {b.lifecycleStatus}
                  </StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
            <legend className="mb-1 text-sm font-semibold">
              Create price book
              {context.outletId ? " (outlet scope)" : " (brand scope)"}
            </legend>
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Code"
              aria-label="Price book code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Name"
              aria-label="Price book name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="button" onClick={() => void handleCreate()}>
              Create
            </Button>
          </fieldset>
        ) : null}
      </div>

      {inspection ? (
        <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{inspection.priceBook.name}</h3>
            <span className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
              Revision {inspection.priceBook.revision} · {inspection.priceBook.currency}
            </span>
          </div>

          <ul className="space-y-2 text-sm">
            {inspection.variantPrices.map((vp) => (
              <li key={vp.id}>
                Variant {vp.variantId.slice(0, 8)}… — {formatInrFromPaise(vp.amountPaise)}
                <span className="ml-2 text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                  tax {vp.taxCategoryId === TAX_CATEGORY_RESTAURANT_SERVICE_ID ? "restaurant service" : vp.taxCategoryId.slice(0, 8)}
                </span>
              </li>
            ))}
            {inspection.variantPrices.length === 0 ? (
              <li className="text-[var(--enterprise-muted,#C4D4A8)]">No variant prices yet.</li>
            ) : null}
          </ul>

          {canManage ? (
            <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
              <legend className="mb-1 text-sm font-semibold">
                Attach baseline variant price
                {!context.variantId ? " (select variant in context)" : ""}
              </legend>
              <input
                className={cn(enterpriseFieldClass)}
                placeholder="INR amount"
                aria-label="INR amount"
                inputMode="decimal"
                value={amountInr}
                onChange={(e) => setAmountInr(e.target.value)}
              />
              <p className="flex items-center text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                Default tax: restaurant service
              </p>
              <Button
                type="button"
                disabled={!context.variantId}
                onClick={() => void handleAttachPrice()}
              >
                Attach price
              </Button>
            </fieldset>
          ) : null}

          <div data-testid="modifier-price-authoring" className="space-y-3">
            <h4 className="text-sm font-semibold">Modifier prices</h4>
            <ul className="space-y-2 text-sm">
              {inspection.modifierPrices.map((mp) => (
                <li key={mp.id}>
                  Association {mp.variantModifierGroupId.slice(0, 8)}… · option{" "}
                  {mp.modifierGroupOptionId.slice(0, 8)}… —{" "}
                  {formatInrFromPaise(mp.priceDeltaPaise)}
                </li>
              ))}
              {inspection.modifierPrices.length === 0 ? (
                <li className="text-[var(--enterprise-muted,#C4D4A8)]">No modifier prices yet.</li>
              ) : null}
            </ul>

            {canManage ? (
              !context.productId || !context.variantId ? (
                <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                  Select a product and variant in context to attach modifier prices from catalog
                  associations.
                </p>
              ) : modifierGraphReady && modifierChoices.length === 0 ? (
                <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                  No modifier associations for this variant. Associate groups in Catalog first —
                  Pricing does not mutate Catalog.
                </p>
              ) : (
                <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy || !modifierGraphReady}>
                  <legend className="mb-1 text-sm font-semibold">Attach modifier price</legend>
                  <select
                    className={cn(enterpriseFieldClass)}
                    aria-label="Modifier association and option"
                    value={modifierChoiceKey}
                    onChange={(e) => setModifierChoiceKey(e.target.value)}
                  >
                    <option value="">Select association · option</option>
                    {modifierChoices.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={cn(enterpriseFieldClass)}
                    placeholder="INR delta"
                    aria-label="Modifier INR delta"
                    inputMode="decimal"
                    value={modifierDeltaInr}
                    onChange={(e) => setModifierDeltaInr(e.target.value)}
                  />
                  <Button
                    type="button"
                    disabled={!modifierChoiceKey || !modifierGraphReady}
                    onClick={() => void handleAttachModifierPrice()}
                  >
                    Attach modifier price
                  </Button>
                </fieldset>
              )
            ) : null}
          </div>

          {canManage && inspection.priceBook.lifecycleStatus === "draft" ? (
            <Button type="button" variant="secondary" onClick={() => void openActivateReview()}>
              Review &amp; activate
            </Button>
          ) : null}
        </div>
      ) : null}

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review price book activation"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected price book revision"
        revisionValue={review?.expectedPriceBookRevision ?? ""}
        blockers={review?.blockers}
        wouldChange={review?.wouldChange}
        noOpHint="No customer pricing change is expected."
        busy={reviewBusy}
        error={reviewError}
        confirmLabel="Confirm effect"
        onCancel={() => {
          if (reviewBusy) return;
          setReview(null);
          props.onStatus("No effect — draft work remains.");
        }}
        onConfirm={() => void confirmActivate()}
      />
    </div>
  );
}
