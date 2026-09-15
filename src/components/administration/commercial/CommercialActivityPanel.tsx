"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
import { fetchCommercialActivity } from "@/lib/administration/commercial";
import { describeAdminFailure } from "@/lib/administration/commercial-errors";
import { cn } from "@/lib/utils";

import type { CommercialContext } from "./commercial-types";

type CommercialActivityPanelProps = Readonly<{
  context: CommercialContext;
}>;

type ActivityRow = Readonly<{
  id: string;
  domain: string;
  actor: string;
  time: string;
  action: string;
}>;

function asActivityRows(events: readonly unknown[]): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const record = event as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : null;
    const domain = typeof record.domain === "string" ? record.domain : null;
    const action = typeof record.action === "string" ? record.action : null;
    const time = typeof record.occurredAt === "string" ? record.occurredAt : null;
    if (!id || !domain || !action || !time) continue;
    const actor =
      typeof record.actorWorkforceUserId === "string" && record.actorWorkforceUserId
        ? record.actorWorkforceUserId
        : "System / unknown";
    rows.push({ id, domain, actor, time, action });
  }
  return rows;
}

export function CommercialActivityPanel(props: CommercialActivityPanelProps) {
  const { context } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [omitted, setOmitted] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!context.brandId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await fetchCommercialActivity(context.brandId);
    setLoading(false);
    if (!result.ok) {
      setError(describeAdminFailure(result));
      setRows([]);
      return;
    }
    setRows(asActivityRows(result.data.events));
    setOmitted(
      result.data.omittedDomains
        .map((d) => {
          if (typeof d === "string") return d;
          if (d && typeof d === "object" && "domain" in d) {
            const domain = (d as { domain?: unknown }).domain;
            return typeof domain === "string" ? domain : null;
          }
          return null;
        })
        .filter((d): d is string => Boolean(d)),
    );
  }, [context.brandId]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  if (!context.brandId) {
    return (
      <Alert tone="info" title="Select a brand">
        Commercial activity is listed per brand.
      </Alert>
    );
  }

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading commercial activity…" />;
  }

  return (
    <div data-testid="commercial-activity" className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {omitted.length > 0 ? (
        <Alert tone="info" title="Some domains omitted">
          {omitted.join(", ")}
        </Alert>
      ) : null}

      <div className={cn(enterprisePanelClass, "overflow-x-auto px-2 py-2")}>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--enterprise-border,#3D6026)] text-[var(--enterprise-muted,#C4D4A8)]">
              <th className="px-2 py-2 font-semibold">Domain</th>
              <th className="px-2 py-2 font-semibold">Actor</th>
              <th className="px-2 py-2 font-semibold">Time</th>
              <th className="px-2 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--enterprise-border,#3D6026)]/60">
                <td className="px-2 py-2">{row.domain}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.actor}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  {new Date(row.time).toLocaleString()}
                </td>
                <td className="px-2 py-2">{row.action}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-[var(--enterprise-muted,#C4D4A8)]">
                  No commercial activity events visible for this brand.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
