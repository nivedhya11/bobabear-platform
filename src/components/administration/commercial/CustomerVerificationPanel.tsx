"use client";

import { useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import {
  enterpriseFieldClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  postCustomerCommercialVerification,
  type CustomerVerificationResponse,
  type VerificationOutcome,
} from "@/lib/administration/commercial";
import { describeAdminFailure } from "@/lib/administration/commercial-errors";
import { parseInrToPaise } from "@/lib/administration/commercial-money";
import { cn } from "@/lib/utils";

import type { CommercialContext } from "./commercial-types";

type CustomerVerificationPanelProps = Readonly<{
  context: CommercialContext;
  onStatus: (message: string) => void;
}>;

function outcomeTone(outcome: VerificationOutcome) {
  if (outcome === "VERIFIED_MATCH") return "success" as const;
  if (outcome === "VERIFIED_MISMATCH") return "danger" as const;
  if (outcome === "PARTIAL_VERIFICATION") return "warning" as const;
  return "neutral" as const;
}

function outcomeLabel(outcome: VerificationOutcome): string {
  switch (outcome) {
    case "VERIFIED_MATCH":
      return "VERIFIED_MATCH";
    case "VERIFIED_MISMATCH":
      return "MISMATCH";
    case "PARTIAL_VERIFICATION":
      return "PARTIAL";
    case "INSUFFICIENT_CONTEXT":
      return "INSUFFICIENT_CONTEXT";
    default:
      return outcome;
  }
}

export function CustomerVerificationPanel(props: CustomerVerificationPanelProps) {
  const { context } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerVerificationResponse | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [subtotalInr, setSubtotalInr] = useState("");

  if (!context.brandId || !context.variantId || !context.outletId) {
    return (
      <Alert tone="info" title="Outlet required">
        Customer commercial verification needs brand, variant, and outlet.
      </Alert>
    );
  }

  async function runVerification() {
    setBusy(true);
    setError(null);
    const body: {
      outletId: string;
      destinationCoordinates?: { latitude: string; longitude: string } | null;
      orderSubtotalPaise?: string | null;
    } = { outletId: context.outletId! };

    if (lat.trim() && lng.trim()) {
      body.destinationCoordinates = { latitude: lat.trim(), longitude: lng.trim() };
    }
    if (subtotalInr.trim()) {
      const paise = parseInrToPaise(subtotalInr);
      if (paise === null) {
        setBusy(false);
        setError("Order subtotal must be valid INR.");
        return;
      }
      body.orderSubtotalPaise = paise;
    }

    const response = await postCustomerCommercialVerification(
      context.brandId,
      context.variantId!,
      body,
    );
    setBusy(false);
    if (!response.ok) {
      setError(describeAdminFailure(response));
      setResult(null);
      props.onStatus(describeAdminFailure(response));
      return;
    }
    setResult(response.data);
    props.onStatus(`Verification outcome: ${outcomeLabel(response.data.outcome)}`);
  }

  return (
    <div data-testid="customer-verification" className="space-y-4">
      <Alert tone="warning" title="Never trust the form as truth">
        Verification re-reads customer commercial projections from the server. Form fields only
        supply optional destination / subtotal context.
      </Alert>

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy}>
          <legend className="mb-1 text-sm font-semibold">Optional context</legend>
          <label className="flex flex-col gap-1 text-sm">
            <span>Destination latitude</span>
            <input
              className={cn(enterpriseFieldClass)}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Destination longitude</span>
            <input
              className={cn(enterpriseFieldClass)}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Order subtotal (INR)</span>
            <input
              className={cn(enterpriseFieldClass)}
              inputMode="decimal"
              value={subtotalInr}
              onChange={(e) => setSubtotalInr(e.target.value)}
            />
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void runVerification()}>
            Verify customer truth
          </Button>
          {result ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void runVerification()}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>

      {busy ? <LoadingState label="Verifying…" /> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {result ? (
        <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Outcome</h3>
            <StatusBadge tone={outcomeTone(result.outcome)}>
              {outcomeLabel(result.outcome)}
            </StatusBadge>
          </div>
          <p className="text-sm">{result.explanation}</p>
          <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
            formStateTrusted={String(result.formStateTrusted)} · subsequentReadValid=
            {String(result.subsequentReadValid)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
