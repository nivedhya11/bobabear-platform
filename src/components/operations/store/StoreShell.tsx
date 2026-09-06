"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

import { StoreOutletProvider, useStoreOutlet } from "./StoreOutletContext";
import { StoreSubnav } from "./StoreSubnav";

function StoreShellInner({ children }: Readonly<{ children: ReactNode }>) {
  const {
    outlets,
    selectedOutlet,
    outletId,
    loading,
    unauthorized,
    forbidden,
    error,
    staleOutletId,
    selectOutlet,
    retry,
    announcement,
  } = useStoreOutlet();

  if (loading) {
    return <p aria-live="polite" data-testid="store-shell-loading">Loading store…</p>;
  }
  if (unauthorized) {
    return (
      <p role="alert" data-testid="store-shell-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (forbidden) {
    return (
      <p role="alert" data-testid="store-shell-forbidden">
        You do not have permission to view store outlets.
      </p>
    );
  }
  if (error) {
    return (
      <div role="alert" data-testid="store-shell-error" className="space-y-3">
        <p>{error}</p>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="store-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="store-outlet-select" className="text-sm text-[var(--text-secondary)]">
            Outlet
          </label>
          <select
            id="store-outlet-select"
            data-testid="store-outlet-select"
            className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 text-sm outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
            value={outletId ?? ""}
            disabled={outlets.length === 0}
            onChange={(event) => {
              if (event.target.value) selectOutlet(event.target.value);
            }}
          >
            {outlets.length === 0 || !outletId ? (
              <option value="">Select an outlet</option>
            ) : null}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} ({outlet.code})
              </option>
            ))}
          </select>
        </div>
        {selectedOutlet ? (
          <p className="text-sm text-[var(--text-secondary)]" data-testid="store-outlet-summary">
            {selectedOutlet.name} · {selectedOutlet.code}
            {selectedOutlet.organizationId ? ` · Org ${selectedOutlet.organizationId.slice(0, 8)}` : ""}
          </p>
        ) : null}
      </div>

      {staleOutletId ? (
        <p role="alert" data-testid="store-outlet-stale">
          The selected outlet is not available in your scope. Choose an authorized outlet to
          continue.
        </p>
      ) : null}

      {outlets.length === 0 ? (
        <p data-testid="store-outlets-empty" className="text-sm text-[var(--text-secondary)]">
          No authorized outlets are available for Store operations.
        </p>
      ) : null}

      {selectedOutlet ? <StoreSubnav /> : null}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="store-announcement"
      >
        {announcement}
      </div>

      {selectedOutlet || staleOutletId ? children : null}
    </div>
  );
}

export function StoreShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <StoreOutletProvider>
      <StoreShellInner>{children}</StoreShellInner>
    </StoreOutletProvider>
  );
}
