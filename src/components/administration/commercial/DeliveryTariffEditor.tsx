"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import {
  enterpriseFieldClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  getDeliveryTariff,
  previewDeliveryTariff,
  updateDeliveryTariff,
  type DeliveryFeeBand,
  type DeliveryTariff,
} from "@/lib/administration/commercial-pricing";
import {
  describeAdminFailure,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { formatInrFromPaise, parseInrToPaise } from "@/lib/administration/commercial-money";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type DeliveryTariffEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
}>;

type BandDraft = Readonly<{ maxDistanceMeters: string; feeInr: string }>;

type ReviewState = Readonly<{
  expectedTariffConfigRevision: string;
  bands: readonly DeliveryFeeBand[];
  freeThresholdPaise: string | null;
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
  wouldChange: boolean;
}>;

export function DeliveryTariffEditor(props: DeliveryTariffEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
  const canRead = capabilities.pricingRead;
  const canManage = capabilities.pricingManage && authoringAllowed;

  const [loading, setLoading] = useState(false);
  const [tariff, setTariff] = useState<DeliveryTariff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bands, setBands] = useState<BandDraft[]>([
    { maxDistanceMeters: "3000", feeInr: "40.00" },
  ]);
  const [freeThresholdInr, setFreeThresholdInr] = useState("");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context.brandId || !context.outletId || !canRead) {
      setTariff(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getDeliveryTariff(context.brandId, context.outletId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    const t = result.data.tariff;
    setTariff(t);
    setBands(
      t.deliveryFeeBands.length > 0
        ? t.deliveryFeeBands.map((b) => ({
            maxDistanceMeters: String(b.maxDistanceMeters),
            feeInr: formatInrFromPaise(b.amountPaise).replace(/^₹/, ""),
          }))
        : [{ maxDistanceMeters: "3000", feeInr: "40.00" }],
    );
    setFreeThresholdInr(
      t.freeDeliverySubtotalThresholdPaise
        ? formatInrFromPaise(t.freeDeliverySubtotalThresholdPaise).replace(/^₹/, "")
        : "",
    );
  }, [canRead, context.brandId, context.outletId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Pricing read required">
        Customer delivery price is owned by pricing.read / pricing.manage.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand and outlet for customer delivery price.
      </Alert>
    );
  }

  if (!context.outletId) {
    return (
      <Alert tone="info" title="Select an outlet">
        Customer delivery price requires an outlet context.
      </Alert>
    );
  }

  if (loading && !tariff) {
    return <LoadingState label="Loading delivery tariff…" />;
  }

  function parseBands(): DeliveryFeeBand[] | null {
    const parsed: DeliveryFeeBand[] = [];
    for (const band of bands) {
      const meters = Number.parseInt(band.maxDistanceMeters, 10);
      const paise = parseInrToPaise(band.feeInr);
      if (!Number.isFinite(meters) || meters <= 0 || paise === null) return null;
      parsed.push({ maxDistanceMeters: meters, amountPaise: Number(paise) });
    }
    return parsed;
  }

  async function openReview() {
    if (!canManage || !context.brandId || !context.outletId) return;
    const parsedBands = parseBands();
    if (!parsedBands) {
      props.onStatus("Enter valid distance meters and INR fees for each band.");
      return;
    }
    let freeThreshold: string | null = null;
    if (freeThresholdInr.trim()) {
      freeThreshold = parseInrToPaise(freeThresholdInr);
      if (freeThreshold === null) {
        props.onStatus("Free-delivery threshold must be valid INR or cleared.");
        return;
      }
    }
    setBusy(true);
    const result = await previewDeliveryTariff(context.brandId, context.outletId, {
      deliveryFeeBands: parsedBands,
      freeDeliverySubtotalThresholdPaise: freeThreshold,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    const preview = result.data.preview;
    setReview({
      expectedTariffConfigRevision: preview.expectedTariffConfigRevision,
      bands: parsedBands,
      freeThresholdPaise: freeThreshold,
      draftLabel: preview.customerMonetaryImplication,
      effectiveLabel: `Current bands: ${preview.currentBands.length}; free threshold ${formatInrFromPaise(preview.currentFreeDeliverySubtotalThresholdPaise)}`,
      dimensions: [
        {
          label: "Proposed bands",
          value: preview.proposedBands
            .map((b) => `${b.maxDistanceMeters}m → ${formatInrFromPaise(b.amountPaise)}`)
            .join("; "),
        },
        {
          label: "Proposed free-delivery threshold",
          value: formatInrFromPaise(preview.proposedFreeDeliverySubtotalThresholdPaise),
        },
        {
          label: "Geographic serviceability",
          value: "Unchanged (separate read-only context)",
        },
      ],
      wouldChange: preview.wouldChangeCustomerDeliveryPrice,
    });
    setReviewError(null);
  }

  async function confirmUpdate() {
    if (!review || !context.brandId || !context.outletId) return;
    setReviewBusy(true);
    setReviewError(null);
    const result = await updateDeliveryTariff(context.brandId, context.outletId, {
      expectedTariffConfigRevision: review.expectedTariffConfigRevision,
      deliveryFeeBands: review.bands,
      freeDeliverySubtotalThresholdPaise: review.freeThresholdPaise,
    });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(describeAdminFailure(result));
      return;
    }
    setReview(null);
    props.onStatus("Customer delivery price updated.");
    await load();
  }

  const geo = tariff?.geographicServiceability;

  return (
    <div data-testid="delivery-tariff-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
        <h3 className="text-sm font-semibold">Customer delivery price</h3>
        <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
          This configures customer delivery price — not Serviceability configuration and not
          provider/carrier cost.
        </p>

        {geo ? (
          <div className="rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 py-2 text-sm">
            <p className="text-xs font-bold uppercase text-[var(--enterprise-muted,#C4D4A8)]">
              Geographic serviceability (read-only context)
            </p>
            <ul className="mt-1 space-y-1 text-[var(--enterprise-text-secondary,#EBD9A6)]">
              <li>Max service distance: {geo.maxServiceDistanceMeters ?? "—"} m</li>
              <li>
                Origin: {geo.serviceOriginLatitude ?? "—"}, {geo.serviceOriginLongitude ?? "—"}
              </li>
              <li>Routing priority: {geo.routingPriority ?? "—"}</li>
            </ul>
          </div>
        ) : null}

        <fieldset className="space-y-3" disabled={!canManage || busy}>
          <legend className="text-sm font-semibold">Fee bands</legend>
          {bands.map((band, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span>Max distance (meters)</span>
                <input
                  className={cn(enterpriseFieldClass)}
                  inputMode="numeric"
                  value={band.maxDistanceMeters}
                  onChange={(e) => {
                    const next = [...bands];
                    next[index] = { ...band, maxDistanceMeters: e.target.value };
                    setBands(next);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Customer fee (INR)</span>
                <input
                  className={cn(enterpriseFieldClass)}
                  inputMode="decimal"
                  value={band.feeInr}
                  onChange={(e) => {
                    const next = [...bands];
                    next[index] = { ...band, feeInr: e.target.value };
                    setBands(next);
                  }}
                />
              </label>
              {canManage ? (
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={bands.length <= 1}
                    onClick={() => setBands(bands.filter((_, i) => i !== index))}
                  >
                    Remove band
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setBands([...bands, { maxDistanceMeters: "", feeInr: "" }])
              }
            >
              Add band
            </Button>
          ) : null}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span>Free-delivery threshold (INR, clearable)</span>
          <input
            className={cn(enterpriseFieldClass, "max-w-xs")}
            inputMode="decimal"
            disabled={!canManage || busy}
            value={freeThresholdInr}
            placeholder="Leave blank for none"
            onChange={(e) => setFreeThresholdInr(e.target.value)}
          />
        </label>

        {canManage ? (
          <Button type="button" variant="secondary" onClick={() => void openReview()}>
            Review &amp; update
          </Button>
        ) : null}
      </div>

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review customer delivery price"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected tariff config revision"
        revisionValue={review?.expectedTariffConfigRevision ?? ""}
        wouldChange={review?.wouldChange}
        noOpHint="No customer delivery price change is expected."
        busy={reviewBusy}
        error={reviewError}
        confirmLabel="Confirm effect"
        onCancel={() => {
          if (reviewBusy) return;
          setReview(null);
          props.onStatus("No effect — draft work remains.");
        }}
        onConfirm={() => void confirmUpdate()}
      />
    </div>
  );
}
