"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { listAdminAuditEvents } from "@/lib/administration/api";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly Record<string, unknown>[] }>;

export function AdministrationAuditClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listAdminAuditEvents();
      if (cancelled) return;
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
      setView({ kind: "ready", items: result.data.items as Record<string, unknown>[] });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") return <p data-testid="admin-audit-loading">Loading audit…</p>;
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
    return <p data-testid="admin-audit-forbidden">Not authorized to read access audit.</p>;
  }
  if (view.kind === "error") return <p data-testid="admin-audit-error">{view.message}</p>;

  return (
    <div data-testid="admin-audit" className="space-y-3">
      {view.items.length === 0 ? (
        <p data-testid="admin-audit-empty">No audit events in scope.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {view.items.slice(0, 50).map((item) => (
            <li key={String(item.id)}>
              {String(item.occurredAt)} — {String(item.action)} — {String(item.targetType)}/
              {String(item.targetId)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
