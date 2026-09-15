"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
import {
  fetchCommercialInspection,
  fetchCommercialOutletInspection,
  type CommercialInspectionResponse,
  type ComposedSection,
  type CompositionProjectionState,
} from "@/lib/administration/commercial";
import { describeAdminFailure } from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import type { CommercialContext } from "./commercial-types";

type CommercialInspectionPanelProps = Readonly<{
  context: CommercialContext;
}>;

const SECTION_LABELS: readonly Readonly<{
  key: keyof Omit<
    CommercialInspectionResponse,
    | "ok"
    | "brandId"
    | "variantId"
    | "productId"
    | "outletId"
    | "authoritiesRemainDistinct"
    | "diagnosisIsSourceOfTruth"
  >;
  label: string;
}>[] = [
  { key: "catalog", label: "Catalog identity" },
  { key: "menu", label: "Menu presentation" },
  { key: "assortment", label: "Brand assortment" },
  { key: "availability", label: "Operational availability" },
  { key: "operating", label: "Operating context" },
  { key: "pricing", label: "Pricing" },
  { key: "promotions", label: "Promotions" },
  { key: "deliveryTariff", label: "Customer delivery price" },
  { key: "taxCharges", label: "Tax / charges (context)" },
  { key: "mediaReference", label: "Media reference (context)" },
];

function stateTone(state: CompositionProjectionState) {
  if (state === "available") return "success" as const;
  if (state === "insufficient_authorized_context") return "warning" as const;
  if (state === "unavailable_to_inspect") return "danger" as const;
  return "neutral" as const;
}

function summarizeData(data: unknown): string | null {
  if (data === null || data === undefined) return null;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const preferred = ["summary", "status", "code", "name", "outcome", "imagePath", "source"];
    const parts: string[] = [];
    for (const key of preferred) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        parts.push(`${key}: ${String(value)}`);
      }
    }
    if (parts.length > 0) return parts.join(" · ");
    return "Present (server-composed; not expanded here)";
  }
  return null;
}

function SectionCard(props: {
  label: string;
  section: ComposedSection<unknown>;
}) {
  const summary = summarizeData(props.section.data);
  return (
    <article className={cn(enterprisePanelClass, "space-y-2 px-4 py-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">{props.label}</h4>
        <StatusBadge tone={stateTone(props.section.state)}>{props.section.state}</StatusBadge>
      </div>
      <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
        Permission affordance: {props.section.permission}
      </p>
      <p className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]">
        {props.section.explanation}
      </p>
      {props.section.state === "available" && summary ? (
        <p className="text-sm">{summary}</p>
      ) : null}
      {props.section.state === "available" && props.section.data == null ? (
        <p className="text-sm text-[var(--enterprise-muted,#C4D4A8)]">
          Available with no composed payload.
        </p>
      ) : null}
    </article>
  );
}

export function CommercialInspectionPanel(props: CommercialInspectionPanelProps) {
  const { context } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<CommercialInspectionResponse | null>(null);

  const load = useCallback(async () => {
    if (!context.brandId || !context.variantId) {
      setInspection(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = context.outletId
      ? await fetchCommercialOutletInspection(
          context.brandId,
          context.variantId,
          context.outletId,
        )
      : await fetchCommercialInspection(context.brandId, context.variantId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      setInspection(null);
      return;
    }
    setInspection(result.data);
  }, [context.brandId, context.outletId, context.variantId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  if (!context.brandId || !context.variantId) {
    return (
      <Alert tone="info" title="Select brand and variant">
        Commercial inspection requires brand and variant context. Outlet is optional but enables
        outlet-scoped sections.
      </Alert>
    );
  }

  if (loading && !inspection) {
    return <LoadingState label="Composing commercial inspection…" />;
  }

  return (
    <div data-testid="commercial-inspection" className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {inspection ? (
        <>
          <Alert tone="info" title="Authorities remain distinct">
            This panel composes projections for review. Diagnosis and forms are not commercial
            truth.
          </Alert>
          <div className="grid gap-3 lg:grid-cols-2">
            {SECTION_LABELS.map(({ key, label }) => (
              <SectionCard key={key} label={label} section={inspection[key]} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
