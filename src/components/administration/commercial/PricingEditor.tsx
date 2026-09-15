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
  activatePriceBook,
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

export function PricingEditor(props: PricingEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
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
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
      scopeType: "brand",
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
    props.onStatus("Price book created as draft.");
    await loadBooks();
  }

  async function handleAttachPrice() {
    if (!canManage || !context.brandId || !selectedId || !inspection || !context.variantId) return;
    const paise = parseInrToPaise(amountInr);
    if (paise === null) {
      props.onStatus("Enter a valid INR amount (e.g. 199.00).");
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
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setAmountInr("");
    props.onStatus("Baseline variant price attached on draft price book.");
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
        props.onStatus(describeAdminFailure(result));
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
      props.onStatus("Price book review could not be composed. Reload and try again.");
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
    props.onStatus("Price book activated.");
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
            <legend className="mb-1 text-sm font-semibold">Create price book</legend>
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
