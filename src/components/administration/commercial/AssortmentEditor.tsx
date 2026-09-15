"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  excludeAssortmentTarget,
  includeAssortmentVariant,
  inspectAssortmentVariant,
  previewAssortmentConsequence,
  type AssortmentVariantInspection,
} from "@/lib/administration/commercial-assortment";
import {
  describeAdminFailure,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type AssortmentEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
}>;

type ExcludeScope = Readonly<
  | { scopeType: "brand" }
  | { scopeType: "outlet"; outletId: string }
>;

type PendingMutation =
  | { kind: "include_variant" }
  | { kind: "exclude"; scope: ExcludeScope };

type ReviewState = Readonly<{
  mutation: PendingMutation;
  expectedRuleRevision: string | null;
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
  blockers: readonly string[];
  wouldChange: boolean;
}>;

function scopeLabel(scope: ExcludeScope): string {
  return scope.scopeType === "outlet"
    ? `Outlet exclusion (outlet ${scope.outletId.slice(0, 8)}…)`
    : "Brand-wide exclusion";
}

export function AssortmentEditor(props: AssortmentEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
  const canRead = capabilities.assortmentRead;
  const canManage = capabilities.assortmentManage && authoringAllowed;

  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState<AssortmentVariantInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context.brandId || !context.variantId || !canRead) {
      setInspection(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await inspectAssortmentVariant(context.brandId, context.variantId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setInspection(result.data.inspection);
  }, [canRead, context.brandId, context.variantId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Assortment read required">
        You need assortment.read to inspect brand assortment.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand and variant to inspect assortment intent.
      </Alert>
    );
  }

  if (!context.variantId) {
    return (
      <Alert tone="info" title="Select a variant">
        Brand assortment is inspected per variant.
      </Alert>
    );
  }

  if (loading && !inspection) {
    return <LoadingState label="Loading assortment…" />;
  }

  async function openIncludeReview() {
    if (!canManage || !context.brandId || !context.variantId) return;
    const result = await previewAssortmentConsequence(context.brandId, {
      mutationType: "include_variant",
      variantId: context.variantId,
      scopeType: "brand",
    });
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    const preview = result.data.preview;
    setReview({
      mutation: { kind: "include_variant" },
      expectedRuleRevision: preview.expectedRuleRevision,
      draftLabel: `Proposed: ${preview.proposed.decision} / ${preview.proposed.status}`,
      effectiveLabel: preview.currentRule
        ? `Current: ${preview.currentRule.decision} / ${preview.currentRule.status}`
        : "No current include/exclude rule",
      dimensions: [
        { label: "Target scope", value: "Brand-wide include (commercial intent)" },
        { label: "Authority", value: "ASSORTMENT (brand commercial intent)" },
        {
          label: "AVAILABILITY",
          value: "Unchanged — operational availability is a separate authority",
        },
        {
          label: "Customer implication",
          value: preview.customerOrderabilityImplication,
        },
      ],
      blockers: preview.validationBlockers.map(String),
      wouldChange: preview.wouldChangeAssortmentIntent,
    });
    setReviewError(null);
  }

  async function openExcludeReview(scope: ExcludeScope) {
    if (!canManage || !context.brandId || !context.variantId) return;
    if (scope.scopeType === "outlet" && !scope.outletId) {
      props.onStatus("Select an outlet before performing an outlet-specific exclusion.");
      return;
    }
    const result = await previewAssortmentConsequence(context.brandId, {
      mutationType: "exclude",
      variantId: context.variantId,
      scopeType: scope.scopeType,
      ...(scope.scopeType === "outlet" ? { outletId: scope.outletId } : {}),
    });
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    const preview = result.data.preview;
    setReview({
      mutation: { kind: "exclude", scope },
      expectedRuleRevision: preview.expectedRuleRevision,
      draftLabel: `Proposed: ${preview.proposed.decision} / ${preview.proposed.status}`,
      effectiveLabel: preview.currentRule
        ? `Current: ${preview.currentRule.decision} / ${preview.currentRule.status}`
        : "No current include/exclude rule",
      dimensions: [
        { label: "Target scope", value: scopeLabel(scope) },
        { label: "Authority", value: "ASSORTMENT (brand commercial intent)" },
        {
          label: "AVAILABILITY",
          value: "Unchanged — operational availability is a separate authority",
        },
        {
          label: "Customer implication",
          value: preview.customerOrderabilityImplication,
        },
      ],
      blockers: preview.validationBlockers.map(String),
      wouldChange: preview.wouldChangeAssortmentIntent,
    });
    setReviewError(null);
  }

  async function confirmEffect() {
    if (!review || !context.brandId || !context.variantId) return;
    setReviewBusy(true);
    setReviewError(null);
    const result =
      review.mutation.kind === "include_variant"
        ? await includeAssortmentVariant(context.brandId, {
            variantId: context.variantId,
            expectedRuleRevision: review.expectedRuleRevision,
          })
        : await excludeAssortmentTarget(context.brandId, {
            scopeType: review.mutation.scope.scopeType,
            variantId: context.variantId,
            expectedRuleRevision: review.expectedRuleRevision,
            ...(review.mutation.scope.scopeType === "outlet"
              ? { outletId: review.mutation.scope.outletId }
              : {}),
          });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(describeAdminFailure(result));
      return;
    }
    setReview(null);
    props.onStatus(
      review.mutation.kind === "include_variant"
        ? "Variant included in brand assortment."
        : review.mutation.scope.scopeType === "outlet"
          ? "Variant excluded for the selected outlet."
          : "Variant excluded brand-wide.",
    );
    await load();
  }

  const includeRule = inspection?.includeRule ?? null;
  const outletSelected = Boolean(context.outletId);

  return (
    <div data-testid="assortment-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {!capabilities.assortmentManage ? (
        <Alert tone="warning" title="Brand assortment authority">
          Outlet managers cannot mutate Brand Assortment here. Assortment manage requires brand
          scope. Operational AVAILABILITY remains a separate Store concern.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <h3 className="text-sm font-semibold">Brand assortment vs availability</h3>
        <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
          <strong>ASSORTMENT:</strong> Is this outlet intended/permitted to offer the Variant?{" "}
          <strong>AVAILABILITY:</strong> Can it be ordered operationally right now? Availability is
          not edited in this commercial workspace.
        </p>
        <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
          Exclusion scope is explicit: outlet-selected exclusions use outlet scope; brand-wide
          exclusions are labeled separately and never silently substituted.
        </p>

        {inspection ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Include rule:</span>
              {includeRule ? (
                <StatusBadge tone={includeRule.decision === "include" ? "success" : "warning"}>
                  {includeRule.decision} · {includeRule.status}
                </StatusBadge>
              ) : (
                <StatusBadge tone="neutral">None</StatusBadge>
              )}
            </div>

            {inspection.relatedRules.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {inspection.relatedRules.map((rule) => (
                  <li key={rule.id}>
                    {rule.scopeType} · {rule.decision} · {rule.status}
                    {rule.outletId ? ` · outlet ${rule.outletId.slice(0, 8)}…` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--enterprise-muted,#C4D4A8)]">No related rules.</p>
            )}

            {inspection.outletConsequences.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase text-[var(--enterprise-muted,#C4D4A8)]">
                  Outlet consequences (assortment intent only)
                </p>
                <ul className="space-y-1 text-sm">
                  {inspection.outletConsequences.map((c) => (
                    <li key={c.outletId}>
                      Outlet {c.outletId.slice(0, 8)}… — intended:{" "}
                      {c.intendedByAssortment ? "yes" : "no"} ({c.assortmentCode}). Availability
                      remains separate.
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {canManage ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" onClick={() => void openIncludeReview()}>
                  Include variant (brand)
                </Button>
                {outletSelected && context.outletId ? (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="exclude-outlet-assortment"
                    onClick={() =>
                      void openExcludeReview({
                        scopeType: "outlet",
                        outletId: context.outletId!,
                      })
                    }
                  >
                    Exclude at selected outlet
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  data-testid="exclude-brand-assortment"
                  onClick={() => void openExcludeReview({ scopeType: "brand" })}
                >
                  Exclude brand-wide
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--enterprise-muted,#C4D4A8)]">No inspection loaded.</p>
        )}
      </div>

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review assortment effect"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected rule revision"
        revisionValue={review?.expectedRuleRevision ?? "null (create)"}
        blockers={review?.blockers}
        wouldChange={review?.wouldChange}
        noOpHint="No assortment intent change is expected."
        busy={reviewBusy}
        error={reviewError}
        confirmLabel="Confirm effect"
        onCancel={() => {
          if (reviewBusy) return;
          setReview(null);
          props.onStatus("No effect — draft work remains.");
        }}
        onConfirm={() => void confirmEffect()}
      />
    </div>
  );
}
