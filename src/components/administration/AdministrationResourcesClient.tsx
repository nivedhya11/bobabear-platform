"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { listAdminBrands } from "@/lib/administration/api";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly Record<string, unknown>[] }>;

export function AdministrationResourcesClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listAdminBrands();
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
        setView({ kind: "error", message: "Resources could not be loaded." });
        return;
      }
      setView({ kind: "ready", items: result.data.items as Record<string, unknown>[] });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") return <p data-testid="admin-resources-loading">Loading resources…</p>;
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-resources-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return <p data-testid="admin-resources-forbidden">You are not authorized to read brands in scope.</p>;
  }
  if (view.kind === "error") return <p data-testid="admin-resources-error">{view.message}</p>;

  return (
    <div data-testid="admin-resources" className="space-y-4">
      <h2 className="text-lg font-medium">Brands</h2>
      {view.items.length === 0 ? (
        <p data-testid="admin-resources-empty">No brands visible in your scope.</p>
      ) : (
        <ul className="space-y-2">
          {view.items.map((item) => (
            <li key={String(item.id)}>
              {String(item.code)} — {String(item.name)} ({String(item.status)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
