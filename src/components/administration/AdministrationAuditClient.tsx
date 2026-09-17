"use client";

import { useCallback, useEffect, useState } from "react";

import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { Button } from "@/components/ui/Button";
import { listAdministrationAuditEventsClient } from "@/lib/administration/api";

type AuditItem = Readonly<{
  id: string;
  occurredAt: string;
  action: string;
  targetType: string;
  targetId: string;
  actorWorkforceUserId?: string | null;
}>;

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      items: AuditItem[];
      more: boolean;
      nextCursor: string | null;
    }>;

export function AdministrationAuditClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [filters, setFilters] = useState({
    actorWorkforceUserId: "",
    action: "",
    occurredFrom: "",
    occurredTo: "",
  });

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (!append) setView({ kind: "loading" });
      const result = await listAdministrationAuditEventsClient({
        cursor,
        actorWorkforceUserId: filters.actorWorkforceUserId || undefined,
        action: filters.action || undefined,
        occurredFrom: filters.occurredFrom || undefined,
        occurredTo: filters.occurredTo || undefined,
      });
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403) {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Audit events could not be loaded." });
        return;
      }
      setView((prev) => {
        const prior = append && prev.kind === "ready" ? prev.items : [];
        return {
          kind: "ready",
          items: [...prior, ...result.data.items],
          more: result.data.more,
          nextCursor: result.data.nextCursor,
        };
      });
    },
    [filters],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  if (view.kind === "loading") return <LoadingState label="Loading audit…" />;
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-audit-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return <p data-testid="admin-audit-forbidden">Not authorized to read audit events.</p>;
  }
  if (view.kind === "error") {
    return <p data-testid="admin-audit-error">{view.message}</p>;
  }

  return (
    <div data-testid="admin-audit" className="space-y-6">
      <PageHeader
        title="Audit"
        description="Server-filtered access audit over your authorized event set."
      />
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="text-sm" htmlFor="audit-actor">
          Actor workforce user ID
          <input
            id="audit-actor"
            className="mt-1 w-full border px-2 py-1"
            value={filters.actorWorkforceUserId}
            onChange={(event) =>
              setFilters({ ...filters, actorWorkforceUserId: event.target.value })
            }
          />
        </label>
        <label className="text-sm" htmlFor="audit-action">
          Action
          <input
            id="audit-action"
            className="mt-1 w-full border px-2 py-1"
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value })}
          />
        </label>
        <label className="text-sm" htmlFor="audit-from">
          Occurred from (ISO)
          <input
            id="audit-from"
            className="mt-1 w-full border px-2 py-1"
            value={filters.occurredFrom}
            onChange={(event) => setFilters({ ...filters, occurredFrom: event.target.value })}
          />
        </label>
        <label className="text-sm" htmlFor="audit-to">
          Occurred to (ISO)
          <input
            id="audit-to"
            className="mt-1 w-full border px-2 py-1"
            value={filters.occurredTo}
            onChange={(event) => setFilters({ ...filters, occurredTo: event.target.value })}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>

      {view.items.length === 0 ? (
        <p data-testid="admin-audit-empty">No authorized audit events match these filters.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {view.items.map((event) => (
            <li key={event.id} className="rounded border border-[var(--enterprise-border,#D6C39A)] p-3">
              <p className="font-medium">{event.action}</p>
              <p>
                {event.targetType}:{event.targetId} · {event.occurredAt}
              </p>
              <p>Actor: {event.actorWorkforceUserId ?? "system"}</p>
            </li>
          ))}
        </ul>
      )}
      {view.more && view.nextCursor ? (
        <Button type="button" variant="secondary" onClick={() => void load(view.nextCursor!, true)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
