"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type AuditFilters = Readonly<{
  actorWorkforceUserId: string;
  action: string;
  occurredFrom: string;
  occurredTo: string;
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

const EMPTY_FILTERS: AuditFilters = Object.freeze({
  actorWorkforceUserId: "",
  action: "",
  occurredFrom: "",
  occurredTo: "",
});

export function AdministrationAuditClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  // Only the newest request may write to `view`; slower earlier responses are dropped.
  const latestRequestId = useRef(0);

  const load = useCallback(async (filters: AuditFilters, cursor?: string, append = false) => {
    latestRequestId.current += 1;
    const requestId = latestRequestId.current;
    if (!append) setView({ kind: "loading" });
    const result = await listAdministrationAuditEventsClient({
      cursor,
      actorWorkforceUserId: filters.actorWorkforceUserId || undefined,
      action: filters.action || undefined,
      occurredFrom: filters.occurredFrom || undefined,
      occurredTo: filters.occurredTo || undefined,
    });
    if (latestRequestId.current !== requestId) return;
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
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load(EMPTY_FILTERS);
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
    return (
      <div data-testid="admin-audit-error" className="space-y-3">
        <p>{view.message}</p>
        <Button
          type="button"
          variant="secondary"
          data-testid="admin-audit-retry"
          onClick={() => void load(appliedFilters)}
        >
          Retry
        </Button>
      </div>
    );
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
          const snapshot = draftFilters;
          setAppliedFilters(snapshot);
          void load(snapshot);
        }}
      >
        <label className="text-sm" htmlFor="audit-actor">
          Actor workforce user ID
          <input
            id="audit-actor"
            className="mt-1 w-full border px-2 py-1"
            value={draftFilters.actorWorkforceUserId}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, actorWorkforceUserId: event.target.value })
            }
          />
        </label>
        <label className="text-sm" htmlFor="audit-action">
          Action
          <input
            id="audit-action"
            className="mt-1 w-full border px-2 py-1"
            value={draftFilters.action}
            onChange={(event) => setDraftFilters({ ...draftFilters, action: event.target.value })}
          />
        </label>
        <label className="text-sm" htmlFor="audit-from">
          Occurred from (ISO)
          <input
            id="audit-from"
            className="mt-1 w-full border px-2 py-1"
            value={draftFilters.occurredFrom}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, occurredFrom: event.target.value })
            }
          />
        </label>
        <label className="text-sm" htmlFor="audit-to">
          Occurred to (ISO)
          <input
            id="audit-to"
            className="mt-1 w-full border px-2 py-1"
            value={draftFilters.occurredTo}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, occurredTo: event.target.value })
            }
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load(appliedFilters, view.nextCursor!, true)}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
