"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  availabilityStateLabel,
  listStoreAvailability,
  setModifierOptionAvailability,
  setVariantAvailability,
  type StoreAvailabilityItem,
  type StoreAvailabilityState,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly StoreAvailabilityItem[] }>;

const STATES: readonly StoreAvailabilityState[] = [
  "available",
  "temporarily_unavailable",
  "sold_out",
];

export function StoreAvailabilityClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["availability.manage"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [filter, setFilter] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await listStoreAvailability(outletId);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403 || result.code === "STORE_UNAUTHORIZED") {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Availability could not be loaded." });
        return;
      }
      setView({ kind: "ready", items: result.data.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  const filtered = useMemo(() => {
    if (view.kind !== "ready") return [];
    const q = filter.trim().toLowerCase();
    if (!q) return view.items;
    return view.items.filter((item) => {
      const hay = [item.productName, item.variantName, item.code, item.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [view, filter]);

  async function onChangeState(item: StoreAvailabilityItem, state: StoreAvailabilityState) {
    if (!outletId || !canManage) return;
    setPendingId(item.id);
    setActionError(null);
    setActionMessage(null);
    announce("Updating availability…");
    const body = { state };
    const result =
      item.kind === "variant"
        ? await setVariantAvailability(outletId, item.id, body)
        : await setModifierOptionAvailability(outletId, item.id, body);
    setPendingId(null);
    if (!result.ok) {
      const message = "Availability could not be updated. Try again.";
      setActionError(message);
      announce(message);
      return;
    }
    const success = `${item.variantName ?? item.code ?? item.id} is now ${availabilityStateLabel(state)}.`;
    setActionMessage(success);
    announce(success);
    setView((current) => {
      if (current.kind !== "ready") return current;
      return {
        kind: "ready",
        items: current.items.map((row) =>
          row.id === item.id
            ? { ...row, effectiveState: state, persistedState: state }
            : row,
        ),
      };
    });
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return <p aria-live="polite" data-testid="store-availability-loading">Loading availability…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-availability-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-availability-forbidden">
        You do not have permission to view availability for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-availability-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="store-availability">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-availability-filter" className="text-sm text-[var(--text-secondary)]">
          Find an item
        </label>
        <input
          id="store-availability-filter"
          data-testid="store-availability-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 text-sm outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
          placeholder="Search by name or code"
        />
      </div>

      {actionMessage ? (
        <p aria-live="polite" data-testid="store-availability-success" className="text-sm">
          {actionMessage}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" data-testid="store-availability-failure" className="text-sm">
          {actionError}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p data-testid="store-availability-empty" className="text-sm text-[var(--text-secondary)]">
          No availability items match.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]" data-testid="store-availability-list">
          {filtered.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {item.productName ? `${item.productName} — ` : ""}
                  {item.variantName ?? item.code ?? item.id}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status: {availabilityStateLabel(item.effectiveState)}
                  {item.kind === "modifier_option" ? " · Modifier option" : ""}
                </p>
              </div>
              {canManage ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Set availability</span>
                  <select
                    aria-label={`Set availability for ${item.variantName ?? item.id}`}
                    data-testid={`store-availability-select-${item.id}`}
                    disabled={pendingId === item.id}
                    value={
                      STATES.includes(item.effectiveState as StoreAvailabilityState)
                        ? item.effectiveState
                        : "available"
                    }
                    onChange={(event) =>
                      void onChangeState(item, event.target.value as StoreAvailabilityState)
                    }
                    className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
                  >
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {availabilityStateLabel(state)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {pendingId ? (
        <p aria-live="polite" data-testid="store-availability-pending">
          Updating availability…
        </p>
      ) : null}
    </div>
  );
}
