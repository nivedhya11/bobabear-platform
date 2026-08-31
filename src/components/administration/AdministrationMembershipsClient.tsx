"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { listAdminMemberships } from "@/lib/administration/api";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly Record<string, unknown>[] }>;

export function AdministrationMembershipsClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listAdminMemberships();
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
        setView({ kind: "error", message: "Memberships could not be loaded." });
        return;
      }
      setView({ kind: "ready", items: result.data.items as Record<string, unknown>[] });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") return <p data-testid="admin-memberships-loading">Loading memberships…</p>;
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-memberships-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return <p data-testid="admin-memberships-forbidden">Not authorized to read memberships.</p>;
  }
  if (view.kind === "error") return <p data-testid="admin-memberships-error">{view.message}</p>;

  return (
    <div data-testid="admin-memberships" className="space-y-4">
      {view.items.length === 0 ? (
        <p data-testid="admin-memberships-empty">No memberships in scope.</p>
      ) : (
        <ul className="space-y-2">
          {view.items.map((item) => (
            <li key={String(item.id)}>
              <a
                className="underline underline-offset-4"
                href={`/workforce/admin/memberships/detail/?membershipId=${String(item.id)}`}
              >
                {String(item.workforceUserId)} @ {String(item.scopeType)} ({String(item.status)})
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
