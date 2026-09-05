"use client";

import { useEffect, useState } from "react";

import { listWorkforceOrders } from "@/lib/operations/orders";
import { getOperationalStatus } from "@/lib/operations/operational-status";

type StoreState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{
      kind: "ready";
      outlet: Readonly<{ name: string; code: string; outletId: string }> | null;
      serviceLabel: string;
    }>;

/**
 * Read-only store context for daily operations (IMP-036D).
 * Store management remains IMP-036E.
 */
export function OperationsStoreClient() {
  const [state, setState] = useState<StoreState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [ordersResult, statusResult] = await Promise.all([
        listWorkforceOrders({ limit: 1 }),
        getOperationalStatus(),
      ]);
      if (cancelled) return;
      if (!ordersResult.ok) {
        if (ordersResult.status === 401 || ordersResult.code === "WORKFORCE_AUTH_REQUIRED") {
          setState({ kind: "unauthorized" });
          return;
        }
        setState({ kind: "error" });
        return;
      }
      const outlet = ordersResult.data.items[0]?.outlet ?? null;
      setState({
        kind: "ready",
        outlet: outlet
          ? { name: outlet.name, code: outlet.code, outletId: outlet.outletId }
          : null,
        serviceLabel: statusResult.ok ? statusResult.data.service : "operations",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <p aria-live="polite">Loading store context…</p>;
  if (state.kind === "unauthorized") {
    return (
      <p role="alert">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (state.kind === "error") {
    return <p role="alert">Store context could not be loaded.</p>;
  }

  return (
    <div className="flex flex-col gap-6" data-testid="operations-store">
      <section aria-labelledby="store-identity-heading">
        <h2 id="store-identity-heading" className="text-lg font-semibold">
          Store identity
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Read-only operational context. Store configuration and management are not available here.
        </p>
        {state.outlet ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-secondary)]">Name</dt>
              <dd>{state.outlet.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Code</dt>
              <dd>{state.outlet.code}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Outlet ID</dt>
              <dd className="break-all">{state.outlet.outletId}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            No recent authorized order outlet context is available yet.
          </p>
        )}
      </section>
      <section aria-labelledby="store-ops-heading">
        <h2 id="store-ops-heading" className="text-lg font-semibold">
          Service context
        </h2>
        <p className="mt-2 text-sm">Operations host: {state.serviceLabel}</p>
      </section>
    </div>
  );
}
