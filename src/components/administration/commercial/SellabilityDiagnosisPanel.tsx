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
  postSellabilityDiagnosis,
  type DiagnosisSignal,
} from "@/lib/administration/commercial";
import { describeAdminFailure } from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import type { CommercialContext } from "./commercial-types";

type SellabilityDiagnosisPanelProps = Readonly<{
  context: CommercialContext;
  onStatus: (message: string) => void;
}>;

const AUTHORITY_PLAIN: Record<string, string> = {
  catalog: "Catalog identity",
  menu: "Menu presentation",
  assortment: "Assortment",
  availability: "Availability",
  operating: "Operating hours / readiness",
  pricing: "Pricing completeness",
  promotions: "Promotion applicability",
  delivery_tariff: "Customer delivery price",
  serviceability: "Serviceability",
  tax: "Tax / charges",
};

const SIGNAL_KEY_PLAIN: Record<string, string> = {
  CATALOG_LIFECYCLE: "Catalog lifecycle",
  CATALOG_PUBLICATION: "Catalog publication",
  MENU_PLACEMENT: "Menu",
  MENU_EFFECTIVE_VISIBILITY: "Menu visibility",
  ASSORTMENT: "Assortment",
  AVAILABILITY: "Availability",
  PRICING_COMPLETENESS: "Pricing completeness",
  PROMOTION_APPLICABILITY: "Promotion applicability",
  OUTLET_OPERATING_STATE: "Operating state",
  OUTLET_HOURS: "Outlet hours",
  SERVICEABILITY: "Serviceability",
};

function plainAuthority(authority: string): string {
  return AUTHORITY_PLAIN[authority] ?? authority;
}

function plainSignalKey(key: string): string {
  return SIGNAL_KEY_PLAIN[key] ?? key;
}

export function SellabilityDiagnosisPanel(props: SellabilityDiagnosisPanelProps) {
  const { context } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<readonly DiagnosisSignal[] | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  if (!context.brandId || !context.variantId || !context.outletId) {
    return (
      <Alert tone="info" title="Outlet required">
        Sellability diagnosis needs brand, variant, and outlet context.
      </Alert>
    );
  }

  async function runDiagnosis() {
    setBusy(true);
    setError(null);
    const body: {
      outletId: string;
      customerLocation?: { latitude: string; longitude: string } | null;
    } = { outletId: context.outletId! };
    if (lat.trim() && lng.trim()) {
      body.customerLocation = { latitude: lat.trim(), longitude: lng.trim() };
    }
    const result = await postSellabilityDiagnosis(context.brandId, context.variantId!, body);
    setBusy(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      setSignals(null);
      props.onStatus(describeAdminFailure(result));
      return;
    }
    setSignals(result.data.signals);
    props.onStatus("Diagnosis composed — underlying authorities remain authoritative.");
  }

  return (
    <div data-testid="sellability-diagnosis" className="space-y-4">
      <Alert tone="info" title="Diagnosis is not source of truth">
        Signals explain distinct authorities in plain language. Do not treat this panel as a new
        sellability domain.
      </Alert>

      <div className={cn(enterprisePanelClass, "space-y-3 px-4 py-4")}>
        <fieldset className="grid gap-2 sm:grid-cols-2" disabled={busy}>
          <legend className="mb-1 text-sm font-semibold">
            Optional customer location (for serviceability signal)
          </legend>
          <label className="flex flex-col gap-1 text-sm">
            <span>Latitude</span>
            <input
              className={cn(enterpriseFieldClass)}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Longitude</span>
            <input
              className={cn(enterpriseFieldClass)}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </label>
        </fieldset>
        <Button type="button" disabled={busy} onClick={() => void runDiagnosis()}>
          Diagnose sellability
        </Button>
      </div>

      {busy ? <LoadingState label="Running diagnosis…" /> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {signals ? (
        <ul className="space-y-3">
          {signals.map((signal) => (
            <li key={signal.key} className={cn(enterprisePanelClass, "space-y-2 px-4 py-3")}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{plainSignalKey(signal.key)}</h4>
                <StatusBadge tone={signal.authoritative ? "info" : "neutral"}>
                  {signal.authoritative ? "Authoritative signal" : "Non-authoritative"}
                </StatusBadge>
                <StatusBadge tone="neutral">{signal.outcome}</StatusBadge>
              </div>
              <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
                Authority: {plainAuthority(signal.authority)}
              </p>
              <p className="text-sm">{signal.explanation}</p>
              {signal.actionableContext ? (
                <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
                  {signal.actionableContext}
                </p>
              ) : null}
            </li>
          ))}
          {signals.length === 0 ? (
            <li className="text-sm text-[var(--enterprise-muted,#C4D4A8)]">No signals returned.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
