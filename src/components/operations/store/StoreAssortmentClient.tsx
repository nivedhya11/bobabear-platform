"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getStoreAssortment, type StoreAssortmentItem } from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "escalation" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly StoreAssortmentItem[] }>;

function AssortmentEscalation() {
  return (
    <div data-testid="store-assortment-escalation" className="space-y-2">
      <p>
        Assortment for this store is controlled at the brand level. You can view availability and
        operating controls here, but assortment changes need a brand administrator.
      </p>
      <p className="text-sm text-[var(--text-secondary)]">
        Assortment management is not available in Store operations.
      </p>
    </div>
  );
}

export function StoreAssortmentClient() {
  const { outletId, capabilities, staleOutletId } = useStoreOutlet();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const canReadAssortment = capabilities?.["assortment.read"] === true;

  useEffect(() => {
    if (!outletId || staleOutletId || capabilities === null || !canReadAssortment) return;
    let cancelled = false;
    void (async () => {
      const result = await getStoreAssortment(outletId);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403 || result.code === "STORE_UNAUTHORIZED") {
          setView({ kind: "escalation" });
          return;
        }
        setView({ kind: "error", message: "Assortment could not be loaded." });
        return;
      }
      setView({ kind: "ready", items: result.data.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, capabilities, canReadAssortment, reloadToken]);

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (capabilities === null) {
    return <p aria-live="polite" data-testid="store-assortment-loading">Loading assortment…</p>;
  }
  if (!canReadAssortment || view.kind === "escalation") {
    return <AssortmentEscalation />;
  }

  if (view.kind === "loading") {
    return <p aria-live="polite" data-testid="store-assortment-loading">Loading assortment…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-assortment-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-assortment-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="store-assortment">
      <p className="text-sm text-[var(--text-secondary)]">
        Read-only view of what this outlet may offer. Catalog identity remains separate.
      </p>
      {view.items.length === 0 ? (
        <p data-testid="store-assortment-empty">No assortment items are visible for this outlet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {view.items.map((item) => (
            <li key={item.variantId} className="py-3 text-sm">
              <p className="font-medium">
                {item.productName} — {item.variantName}
              </p>
              <p className="text-[var(--text-secondary)]">
                Code {item.code} · {item.eligible ? "Eligible" : "Not eligible"} (
                {item.eligibilityCode})
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
