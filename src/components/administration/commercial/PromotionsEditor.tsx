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
  activateCoupon,
  activatePromotion,
  createCoupon,
  createPromotion,
  disableCoupon,
  enableCoupon,
  getPromotion,
  listCoupons,
  listPromotions,
  previewCouponConsequence,
  previewPromotionConsequence,
  retireCoupon,
  retirePromotion,
  savePromotionBenefit,
  savePromotionDraft,
  type Coupon,
  type CouponStatus,
  type Promotion,
  type PromotionStatus,
} from "@/lib/administration/commercial-promotions";
import {
  describeAdminFailure,
  MOBILE_AUTHORING_MESSAGE,
} from "@/lib/administration/commercial-errors";
import { parseInrToPaise } from "@/lib/administration/commercial-money";
import { cn } from "@/lib/utils";

import { ConsequenceReviewDialog } from "./ConsequenceReviewDialog";
import type { CommercialCapabilities, CommercialContext } from "./commercial-types";

type PromotionsEditorProps = Readonly<{
  context: CommercialContext;
  capabilities: CommercialCapabilities;
  authoringAllowed: boolean;
  onStatus: (message: string) => void;
}>;

type ReviewState = Readonly<{
  kind: "promotion" | "coupon";
  id: string;
  expectedRevision: string;
  proposedStatus: string;
  couponAction?: "activate" | "disable" | "enable" | "retire";
  draftLabel: string;
  effectiveLabel: string;
  dimensions: readonly Readonly<{ label: string; value: string }>[];
}>;

export function PromotionsEditor(props: PromotionsEditorProps) {
  const { context, capabilities, authoringAllowed } = props;
  const canRead = capabilities.promotionsRead || capabilities.couponsRead;
  const canManagePromo = capabilities.promotionsManage && authoringAllowed;
  const canActivatePromo = capabilities.promotionsActivate && authoringAllowed;
  const canManageCoupon = capabilities.couponsManage && authoringAllowed;

  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [benefit, setBenefit] = useState<unknown>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [benefitType, setBenefitType] = useState<"percentage_discount" | "fixed_amount_discount">(
    "percentage_discount",
  );
  const [percentageBps, setPercentageBps] = useState("1000");
  const [fixedInr, setFixedInr] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!context.brandId || !capabilities.promotionsRead) return;
    setLoading(true);
    setError(null);
    const result = await listPromotions(context.brandId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      return;
    }
    setPromotions(result.data.promotions);
  }, [capabilities.promotionsRead, context.brandId]);

  const loadDetail = useCallback(async () => {
    if (!context.brandId || !selectedId || !capabilities.promotionsRead) {
      setPromotion(null);
      setCoupons([]);
      return;
    }
    setLoading(true);
    const [promoResult, couponResult] = await Promise.all([
      getPromotion(context.brandId, selectedId),
      capabilities.couponsRead
        ? listCoupons(context.brandId, selectedId)
        : Promise.resolve(null),
    ]);
    setLoading(false);
    if (!promoResult.ok) {
      setError(describeAdminFailure(promoResult));
      return;
    }
    setPromotion(promoResult.data.promotion);
    setBenefit(promoResult.data.benefit);
    setDraftName(promoResult.data.promotion.displayName);
    setActivationError(null);
    if (couponResult && couponResult.ok) {
      setCoupons(couponResult.data.coupons);
    } else {
      setCoupons([]);
    }
  }, [capabilities.couponsRead, capabilities.promotionsRead, context.brandId, selectedId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadList();
  }, [loadList]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void loadDetail();
  }, [loadDetail]);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Promotions read required">
        You need promotions.read or coupons.read to inspect this section.
      </Alert>
    );
  }

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Choose a brand to author promotions and coupons.
      </Alert>
    );
  }

  if (loading && promotions.length === 0 && !promotion) {
    return <LoadingState label="Loading promotions…" />;
  }

  async function handleCreatePromotion() {
    if (!canManagePromo || !context.brandId) return;
    setBusy(true);
    const result = await createPromotion(context.brandId, {
      code: code.trim(),
      displayName: displayName.trim(),
      scopeType: "brand",
      triggerType: "automatic",
      startsAt: new Date().toISOString(),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setCode("");
    setDisplayName("");
    setSelectedId(result.data.promotion.id);
    props.onStatus("Promotion created as draft.");
    await loadList();
  }

  async function handleSaveDraft() {
    if (!canManagePromo || !context.brandId || !promotion) return;
    setBusy(true);
    const result = await savePromotionDraft(context.brandId, promotion.id, {
      expectedPromotionRevision: promotion.revision,
      displayName: draftName,
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(describeAdminFailure(result));
      return;
    }
    props.onStatus("Promotion draft saved.");
    await loadDetail();
  }

  async function handleSaveBenefit() {
    if (!canManagePromo || !context.brandId || !promotion) return;
    setBusy(true);
    let result;
    if (benefitType === "percentage_discount") {
      const bps = Number.parseInt(percentageBps, 10);
      if (!Number.isFinite(bps)) {
        setBusy(false);
        props.onStatus("Enter percentage in basis points (e.g. 1000 = 10%).");
        return;
      }
      result = await savePromotionBenefit(context.brandId, promotion.id, {
        expectedPromotionRevision: promotion.revision,
        benefitType: "percentage_discount",
        percentageBps: bps,
      });
    } else {
      const paise = parseInrToPaise(fixedInr);
      if (paise === null) {
        setBusy(false);
        props.onStatus("Enter a valid fixed INR amount.");
        return;
      }
      result = await savePromotionBenefit(context.brandId, promotion.id, {
        expectedPromotionRevision: promotion.revision,
        benefitType: "fixed_amount_discount",
        fixedAmountPaise: paise,
      });
    }
    setBusy(false);
    if (!result.ok) {
      props.onStatus(`${result.code}: ${describeAdminFailure(result)}`);
      return;
    }
    props.onStatus("Benefit saved on draft.");
    await loadDetail();
  }

  async function openPromotionReview(proposedStatus: PromotionStatus) {
    if (!context.brandId || !promotion) return;
    if (proposedStatus === "active" && !canActivatePromo && !canManagePromo) return;
    if (proposedStatus === "retired" && !canManagePromo && !canActivatePromo) return;
    const result = await previewPromotionConsequence(context.brandId, promotion.id, {
      proposedStatus,
    });
    if (!result.ok) {
      setActivationError(`${result.code}: ${describeAdminFailure(result)}`);
      props.onStatus(`${result.code}: ${describeAdminFailure(result)}`);
      return;
    }
    const preview = result.data.preview;
    setReview({
      kind: "promotion",
      id: promotion.id,
      expectedRevision: preview.expectedPromotionRevision,
      proposedStatus,
      draftLabel: `Proposed status: ${preview.proposedStatus}`,
      effectiveLabel: `Current status: ${preview.currentStatus}`,
      dimensions: [
        { label: "Customer implication", value: preview.customerVisibleImplication },
        {
          label: "Supported lifecycle",
          value: preview.supportedLifecycleStates.join(", "),
        },
      ],
    });
    setReviewError(null);
    setActivationError(null);
  }

  async function openCouponReview(
    coupon: Coupon,
    proposedStatus: CouponStatus,
    couponAction: "activate" | "disable" | "enable" | "retire",
  ) {
    if (!canManageCoupon || !context.brandId) return;
    const result = await previewCouponConsequence(context.brandId, coupon.id, { proposedStatus });
    if (!result.ok) {
      props.onStatus(`${result.code}: ${describeAdminFailure(result)}`);
      return;
    }
    const preview = result.data.preview;
    setReview({
      kind: "coupon",
      id: coupon.id,
      expectedRevision: preview.expectedCouponRevision,
      proposedStatus,
      couponAction,
      draftLabel: `Proposed: ${preview.proposedStatus}`,
      effectiveLabel: `Current: ${preview.currentStatus} (${preview.canonicalCode})`,
      dimensions: [
        { label: "Customer implication", value: preview.customerVisibleImplication },
        {
          label: "Supported lifecycle",
          value: preview.supportedLifecycleStates.join(", "),
        },
      ],
    });
    setReviewError(null);
  }

  async function confirmReview() {
    if (!review || !context.brandId) return;
    setReviewBusy(true);
    setReviewError(null);
    let result;
    if (review.kind === "promotion") {
      const body = { expectedPromotionRevision: review.expectedRevision };
      result =
        review.proposedStatus === "active"
          ? await activatePromotion(context.brandId, review.id, body)
          : await retirePromotion(context.brandId, review.id, body);
    } else {
      const body = { expectedCouponRevision: review.expectedRevision };
      const action = review.couponAction ?? "activate";
      if (action === "activate") {
        result = await activateCoupon(context.brandId, review.id, body);
      } else if (action === "disable") {
        result = await disableCoupon(context.brandId, review.id, body);
      } else if (action === "enable") {
        result = await enableCoupon(context.brandId, review.id, body);
      } else {
        result = await retireCoupon(context.brandId, review.id, body);
      }
    }
    setReviewBusy(false);
    if (!result.ok) {
      const msg = `${result.code}: ${describeAdminFailure(result)}`;
      setReviewError(msg);
      if (review.kind === "promotion" && review.proposedStatus === "active") {
        setActivationError(msg);
      }
      return;
    }
    setReview(null);
    props.onStatus("Lifecycle effect applied.");
    await loadList();
    await loadDetail();
  }

  async function handleCreateCoupon() {
    if (!canManageCoupon || !context.brandId || !selectedId) return;
    setBusy(true);
    const result = await createCoupon(context.brandId, selectedId, {
      origin: "manual",
      ...(couponCode.trim() ? { canonicalCode: couponCode.trim() } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      props.onStatus(`${result.code}: ${describeAdminFailure(result)}`);
      return;
    }
    setCouponCode("");
    props.onStatus(`Coupon created (${result.data.coupon.canonicalCode}).`);
    await loadDetail();
  }

  function statusTone(status: string) {
    if (status === "active") return "success" as const;
    if (status === "retired" || status === "disabled") return "danger" as const;
    return "neutral" as const;
  }

  return (
    <div data-testid="promotions-editor" className="space-y-4">
      {!authoringAllowed ? (
        <Alert tone="info" title="Inspection only on this viewport">
          {MOBILE_AUTHORING_MESSAGE}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {activationError ? (
        <Alert tone="danger" title="Activation readiness">
          {activationError}
        </Alert>
      ) : null}

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <h3 className="text-sm font-semibold">Promotions</h3>
        <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
          Lifecycle states: draft, active, retired only. Coupons may also be disabled.
        </p>
        {promotions.length === 0 ? (
          <EmptyState title="No promotions" description="Create a draft promotion to begin." />
        ) : (
          <ul className="space-y-2">
            {promotions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface,#2E4720)]",
                    selectedId === p.id && "bg-[var(--bg-surface,#2E4720)] font-semibold",
                  )}
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.displayName} ({p.code})
                  <StatusBadge className="ml-2" tone={statusTone(p.status)}>
                    {p.status}
                  </StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {canManagePromo ? (
          <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
            <legend className="mb-1 text-sm font-semibold">Create promotion</legend>
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Code"
              aria-label="Promotion code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className={cn(enterpriseFieldClass)}
              placeholder="Display name"
              aria-label="Promotion display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Button type="button" onClick={() => void handleCreatePromotion()}>
              Create
            </Button>
          </fieldset>
        ) : null}
      </div>

      {promotion ? (
        <div className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{promotion.displayName}</h3>
            <StatusBadge tone={statusTone(promotion.status)}>{promotion.status}</StatusBadge>
            <span className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
              Revision {promotion.revision}
            </span>
          </div>

          {canManagePromo && promotion.status === "draft" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span>Display name</span>
                <input
                  className={cn(enterpriseFieldClass, "w-full")}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </label>
              <Button type="button" onClick={() => void handleSaveDraft()}>
                Save draft
              </Button>

              <fieldset className="space-y-2" disabled={busy}>
                <legend className="text-sm font-semibold">Benefit</legend>
                <select
                  className={cn(enterpriseFieldClass)}
                  value={benefitType}
                  aria-label="Benefit type"
                  onChange={(e) =>
                    setBenefitType(e.target.value as "percentage_discount" | "fixed_amount_discount")
                  }
                >
                  <option value="percentage_discount">Percentage discount</option>
                  <option value="fixed_amount_discount">Fixed amount discount</option>
                </select>
                {benefitType === "percentage_discount" ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span>Percentage (basis points, 1000 = 10%)</span>
                    <input
                      className={cn(enterpriseFieldClass)}
                      value={percentageBps}
                      onChange={(e) => setPercentageBps(e.target.value)}
                    />
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 text-sm">
                    <span>Fixed INR amount</span>
                    <input
                      className={cn(enterpriseFieldClass)}
                      value={fixedInr}
                      inputMode="decimal"
                      onChange={(e) => setFixedInr(e.target.value)}
                    />
                  </label>
                )}
                <Button type="button" onClick={() => void handleSaveBenefit()}>
                  Save benefit
                </Button>
              </fieldset>
            </>
          ) : null}

          <div className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
            Current benefit:{" "}
            {benefit == null
              ? "None configured"
              : typeof benefit === "object"
                ? "Configured (server)"
                : String(benefit)}
          </div>

          <div className="flex flex-wrap gap-2">
            {promotion.status === "draft" && (canActivatePromo || canManagePromo) ? (
              <Button type="button" variant="secondary" onClick={() => void openPromotionReview("active")}>
                Review &amp; activate
              </Button>
            ) : null}
            {promotion.status !== "retired" && (canManagePromo || canActivatePromo) ? (
              <Button type="button" variant="outline" onClick={() => void openPromotionReview("retired")}>
                Review &amp; retire
              </Button>
            ) : null}
          </div>

          {capabilities.couponsRead ? (
            <div className="space-y-3 border-t border-[var(--enterprise-border,#3D6026)] pt-3">
              <h4 className="text-sm font-semibold">Coupons</h4>
              <ul className="space-y-2 text-sm">
                {coupons.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {c.canonicalCode}{" "}
                      <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
                    </span>
                    {canManageCoupon ? (
                      <div className="flex flex-wrap gap-1">
                        {c.status === "draft" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void openCouponReview(c, "active", "activate")}
                          >
                            Activate
                          </Button>
                        ) : null}
                        {c.status === "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void openCouponReview(c, "disabled", "disable")}
                          >
                            Disable
                          </Button>
                        ) : null}
                        {c.status === "disabled" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void openCouponReview(c, "active", "enable")}
                          >
                            Enable
                          </Button>
                        ) : null}
                        {c.status !== "retired" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void openCouponReview(c, "retired", "retire")}
                          >
                            Retire
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
                {coupons.length === 0 ? (
                  <li className="text-[var(--enterprise-muted,#C4D4A8)]">No coupons.</li>
                ) : null}
              </ul>
              {canManageCoupon ? (
                <fieldset className="flex flex-wrap gap-2" disabled={busy}>
                  <input
                    className={cn(enterpriseFieldClass)}
                    placeholder="Canonical code (optional)"
                    aria-label="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <Button type="button" onClick={() => void handleCreateCoupon()}>
                    Create coupon
                  </Button>
                </fieldset>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <ConsequenceReviewDialog
        open={review !== null}
        title="Review lifecycle effect"
        draftLabel={review?.draftLabel ?? ""}
        effectiveLabel={review?.effectiveLabel ?? ""}
        dimensions={review?.dimensions ?? []}
        revisionLabel="Expected revision"
        revisionValue={review?.expectedRevision ?? ""}
        busy={reviewBusy}
        error={reviewError}
        confirmLabel="Confirm effect"
        onCancel={() => {
          if (reviewBusy) return;
          setReview(null);
          props.onStatus("No effect — draft work remains.");
        }}
        onConfirm={() => void confirmReview()}
      />
    </div>
  );
}
