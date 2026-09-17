"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { Button } from "@/components/ui/Button";
import { fetchAdminOverview, fetchAdminSession } from "@/lib/administration/api";
import { resolveSignedInLabel } from "@/lib/workforce-hub/identity";
import { classifyPortalSessionResult } from "@/lib/workforce-hub/session-result";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
import { cn } from "@/lib/utils";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      signedInLabel: string;
      overview: Record<string, unknown>;
    }>;

function sampleCount(section: unknown): string {
  if (!section || typeof section !== "object") return "—";
  const record = section as { count?: number; more?: boolean };
  if (typeof record.count !== "number") return "—";
  return record.more ? `${record.count}+` : String(record.count);
}

export function AdministrationHubClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessionResult = await fetchAdminSession();
      if (cancelled) return;
      const outcome = classifyPortalSessionResult(sessionResult);
      if (outcome === "authentication_required") {
        setView({ kind: "unauthorized" });
        return;
      }
      if (outcome === "service_failure" || !sessionResult.ok) {
        setView({ kind: "error", message: "Administration session could not be loaded." });
        return;
      }
      const overviewResult = await fetchAdminOverview();
      if (cancelled) return;
      if (!overviewResult.ok) {
        setView({
          kind: "error",
          message: "Administration overview could not be loaded.",
        });
        return;
      }
      const projectedLabel = sessionResult.data.session.signedInLabel?.trim() ?? "";
      setView({
        kind: "ready",
        signedInLabel: resolveSignedInLabel({
          email: projectedLabel.includes("@") ? projectedLabel : undefined,
          workforceUserId: sessionResult.data.session.workforceUserId,
        }),
        overview: overviewResult.data.overview,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return <LoadingState label="Loading administration…" />;
  }
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-unauthorized" className="space-y-3">
        <Alert tone="warning" title="Sign-in required">
          Workforce sign-in is required for administration.
        </Alert>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "error") {
    return <ErrorState message={view.message} onRetry={() => window.location.reload()} />;
  }

  const hierarchy = (view.overview.hierarchy ?? {}) as Record<string, unknown>;
  const membershipAttention = (view.overview.membershipAttention ?? {}) as Record<
    string,
    unknown
  >;
  const recentAudit = (view.overview.recentAudit ?? {}) as {
    items?: unknown[];
    more?: boolean;
  };
  const operationalHealth = view.overview.operationalHealth as
    | { available: true; status: Record<string, unknown> }
    | { available: false; reason: string }
    | undefined;

  return (
    <div data-testid="admin-hub" className="space-y-6">
      <PageHeader
        title="Administration overview"
        description="Authorized hierarchy, membership attention, recent access changes, and safe operational health."
      />
      <p
        className="text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]"
        data-testid="admin-hub-identity"
      >
        {view.signedInLabel === "Signed in"
          ? "Signed in"
          : `Signed in as ${view.signedInLabel}`}
      </p>

      <section className={cn(enterprisePanelClass, "space-y-3 p-4")} aria-labelledby="overview-hierarchy">
        <h2 id="overview-hierarchy" className="text-base font-semibold">
          Organization hierarchy
        </h2>
        <p className="text-sm text-[var(--enterprise-text-secondary,#5C4B24)]">
          Counts are for your authorized set only and may be incomplete when more results exist.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Brands", hierarchy.brands],
              ["Organizations", hierarchy.organizations],
              ["Territories", hierarchy.territories],
              ["Legal entities", hierarchy.legalEntities],
              ["Outlets", hierarchy.outlets],
            ] as const
          ).map(([label, section]) => (
            <li key={label} className="rounded border border-[var(--enterprise-border,#D6C39A)] px-3 py-2 text-sm">
              <span className="font-medium">{label}</span>
              <span className="ml-2 tabular-nums">{sampleCount(section)}</span>
              {(section as { more?: boolean } | undefined)?.more ? (
                <StatusBadge tone="info" className="ml-2">
                  More available
                </StatusBadge>
              ) : null}
            </li>
          ))}
        </ul>
        <Button asChild variant="secondary">
          <a href="/workforce/admin/resources/">Open Organization</a>
        </Button>
      </section>

      <section className={cn(enterprisePanelClass, "space-y-3 p-4")} aria-labelledby="overview-membership">
        <h2 id="overview-membership" className="text-base font-semibold">
          Membership attention
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <StatusBadge tone="warning">Invited {String(membershipAttention.invited ?? 0)}</StatusBadge>
          </li>
          <li>
            <StatusBadge tone="danger">Suspended {String(membershipAttention.suspended ?? 0)}</StatusBadge>
          </li>
          <li>
            <StatusBadge tone="success">Active {String(membershipAttention.active ?? 0)}</StatusBadge>
          </li>
          <li>
            <StatusBadge tone="neutral">Expired {String(membershipAttention.expired ?? 0)}</StatusBadge>
          </li>
        </ul>
        {membershipAttention.more === true ? (
          <p className="text-sm">More memberships need attention beyond this sample.</p>
        ) : null}
        <Button asChild variant="secondary">
          <a href="/workforce/admin/memberships/">Open Workforce</a>
        </Button>
      </section>

      <section className={cn(enterprisePanelClass, "space-y-3 p-4")} aria-labelledby="overview-audit">
        <h2 id="overview-audit" className="text-base font-semibold">
          Recent access changes
        </h2>
        {(recentAudit.items ?? []).length === 0 ? (
          <p className="text-sm">No recent authorized audit events.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(recentAudit.items as Array<Record<string, unknown>>).map((event) => (
              <li key={String(event.id)}>
                {String(event.action)} · {String(event.targetType)} · {String(event.occurredAt)}
              </li>
            ))}
          </ul>
        )}
        {recentAudit.more ? (
          <StatusBadge tone="info">More audit history available</StatusBadge>
        ) : null}
        <Button asChild variant="secondary">
          <a href="/workforce/admin/audit/">Open Audit</a>
        </Button>
      </section>

      <section className={cn(enterprisePanelClass, "space-y-3 p-4")} aria-labelledby="overview-ops">
        <h2 id="overview-ops" className="text-base font-semibold">
          Operational health
        </h2>
        {!operationalHealth || operationalHealth.available === false ? (
          <Alert tone="warning" title="Operational status unavailable">
            Ops status requires order.read. Open System for hand-off navigation only.
          </Alert>
        ) : (
          <p className="text-sm">
            Ops service: {String(operationalHealth.status.service ?? "operations")} (composed read;
            Admin does not own Ops workflows).
          </p>
        )}
        <Button asChild variant="secondary">
          <a href="/workforce/admin/system/">Open System</a>
        </Button>
      </section>
    </div>
  );
}
