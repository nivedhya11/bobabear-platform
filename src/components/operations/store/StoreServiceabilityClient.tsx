"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getStoreServiceability,
  setStoreDistancePolicy,
  type StoreServiceability,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; serviceability: StoreServiceability }>;

export function StoreServiceabilityClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["serviceability.manage"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [revision, setRevision] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  function applyServiceability(serviceability: StoreServiceability) {
    setLatitude(serviceability.serviceOriginLatitude ?? "");
    setLongitude(serviceability.serviceOriginLongitude ?? "");
    setMaxDistance(
      serviceability.maxServiceDistanceMeters === null
        ? ""
        : String(serviceability.maxServiceDistanceMeters),
    );
    setRevision(serviceability.revision);
  }

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await getStoreServiceability(outletId);
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
        setView({ kind: "error", message: "Serviceability could not be loaded." });
        return;
      }
      applyServiceability(result.data.serviceability);
      setView({ kind: "ready", serviceability: result.data.serviceability });
      setError(null);
      setMessage(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  async function onSave() {
    if (!outletId || !canManage || view.kind !== "ready") return;
    if (!view.serviceability.routingPriorityConfigured) {
      setError(
        "Delivery routing priority must be configured before the distance policy can be saved.",
      );
      return;
    }
    const max = maxDistance.trim() === "" ? null : Number(maxDistance);
    if (max !== null && (!Number.isFinite(max) || max <= 0)) {
      setError("Maximum service distance must be a positive number of meters.");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    announce("Saving serviceability…");
    const result = await setStoreDistancePolicy(outletId, {
      expectedRevision: revision,
      serviceOriginLatitude: latitude.trim() === "" ? null : latitude.trim(),
      serviceOriginLongitude: longitude.trim() === "" ? null : longitude.trim(),
      maxServiceDistanceMeters: max,
    });
    setPending(false);
    if (!result.ok) {
      if (result.code === "SERVICEABILITY_CONFIGURATION_CONFLICT") {
        const refreshed = await getStoreServiceability(outletId);
        if (refreshed.ok) {
          applyServiceability(refreshed.data.serviceability);
          setView({ kind: "ready", serviceability: refreshed.data.serviceability });
        }
        const conflict =
          "This configuration changed elsewhere. Fields were refreshed — review and save again.";
        setError(conflict);
        announce(conflict);
        return;
      }
      if (result.code === "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED") {
        const required =
          "Delivery routing priority must be configured before the distance policy can be saved.";
        setError(required);
        announce(required);
        return;
      }
      const failed = "Serviceability could not be saved.";
      setError(failed);
      announce(failed);
      return;
    }
    applyServiceability(result.data.serviceability);
    setView({ kind: "ready", serviceability: result.data.serviceability });
    setMessage("Distance policy saved.");
    announce("Distance policy saved.");
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return (
      <p aria-live="polite" data-testid="store-serviceability-loading">
        Loading serviceability…
      </p>
    );
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-serviceability-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-serviceability-forbidden">
        You do not have permission to view serviceability for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-serviceability-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="store-serviceability">
      <p className="text-sm text-[var(--text-secondary)]">
        Set the service origin coordinates and maximum delivery distance. Postal codes are address
        metadata only and are not edited here.
      </p>

      {!view.serviceability.routingPriorityConfigured ? (
        <p
          role="status"
          data-testid="store-serviceability-routing-required"
          className="text-sm"
        >
          Configuration required: delivery routing priority must be set before distance policy can
          be saved.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Origin latitude</span>
          <input
            data-testid="store-serviceability-lat"
            value={latitude}
            disabled={!canManage || pending}
            onChange={(event) => setLatitude(event.target.value)}
            className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Origin longitude</span>
          <input
            data-testid="store-serviceability-lng"
            value={longitude}
            disabled={!canManage || pending}
            onChange={(event) => setLongitude(event.target.value)}
            className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--text-secondary)]">Maximum service distance (meters)</span>
          <input
            data-testid="store-serviceability-max"
            value={maxDistance}
            disabled={!canManage || pending}
            onChange={(event) => setMaxDistance(event.target.value)}
            className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]"
          />
        </label>
      </div>

      <p className="text-sm text-[var(--text-secondary)]" data-testid="store-serviceability-revision">
        Configuration revision: {revision ?? "none"}
      </p>

      {canManage ? (
        <Button
          type="button"
          data-testid="store-serviceability-save"
          disabled={pending || !view.serviceability.routingPriorityConfigured}
          aria-busy={pending}
          onClick={() => void onSave()}
        >
          Save distance policy
        </Button>
      ) : null}

      {message ? (
        <p aria-live="polite" data-testid="store-serviceability-success" className="text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" data-testid="store-serviceability-error-msg" className="text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
