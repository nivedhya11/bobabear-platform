"use client";

import type { ReactNode } from "react";

import { LoadingState } from "@/components/enterprise/LoadingState";
import { enterpriseFieldClass, enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
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
    return (
      <div data-testid="store-shell-loading">
        <LoadingState label="Loading store…" />
      </div>
    );
  }
  if (unauthorized) {
    return (
      <p role="alert" data-testid="store-shell-unauthorized" className="text-sm">
        Sign in required.{" "}
        <a className="font-semibold text-[var(--enterprise-accent)] underline underline-offset-4" href="/workforce/login/">
          Workforce sign in
        </a>
      </p>
    );
  }
  if (forbidden) {
    return (
      <p role="alert" data-testid="store-shell-forbidden" className="text-sm">
        You do not have permission to view store outlets.
      </p>
    );
  }
  if (error) {
    return (
      <div role="alert" data-testid="store-shell-error" className={`${enterprisePanelClass} space-y-3 px-4 py-3`}>
        <p className="text-sm font-semibold">Store could not be loaded</p>
        <p className="text-sm text-[var(--enterprise-muted)]">{error}</p>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="store-shell">
      <section
        className={`${enterprisePanelClass} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between`}
        aria-label="Selected outlet"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="store-outlet-select" className="text-xs font-bold uppercase tracking-wide text-[var(--enterprise-muted)]">
            Outlet
          </label>
          <select
            id="store-outlet-select"
            data-testid="store-outlet-select"
            className={`${enterpriseFieldClass} min-w-[16rem] max-w-full`}
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
          <p
            className="text-sm leading-relaxed text-[var(--enterprise-text-secondary)]"
            data-testid="store-outlet-summary"
          >
            <span className="font-semibold text-[var(--enterprise-text-primary)]">{selectedOutlet.name}</span>
            <span className="text-[var(--enterprise-muted)]"> · {selectedOutlet.code}</span>
            {selectedOutlet.organizationId ? (
              <span className="text-[var(--enterprise-muted)]">
                {" "}
                · Org {selectedOutlet.organizationId.slice(0, 8)}
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      {staleOutletId ? (
        <p
          role="alert"
          data-testid="store-outlet-stale"
          className={`${enterprisePanelClass} border-amber-500/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100`}
        >
          The selected outlet is not available in your scope. Choose an authorized outlet to
          continue.
        </p>
      ) : null}

      {outlets.length === 0 ? (
        <p data-testid="store-outlets-empty" className="text-sm text-[var(--enterprise-muted)]">
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
