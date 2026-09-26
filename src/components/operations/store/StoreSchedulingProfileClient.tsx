"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getStoreSchedulingProfile,
  setStoreSchedulingProfile,
  type StoreSchedulingProfile,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready" }>;

type FieldErrors = Readonly<{
  pickup: string | null;
  delivery: string | null;
}>;

const fieldClassName =
  "w-full min-w-0 min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]";

const LEAD_TIME_ERROR = "Enter a whole number of minutes greater than 0.";

function parsePositiveLeadMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

function revisionForWrite(configured: boolean, revision: string | null): number | null {
  if (!configured) return 0;
  if (revision === null || !/^\d+$/.test(revision)) return null;
  const value = Number(revision);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

function normalizeRevision(revision: string | number): string {
  return typeof revision === "number" ? String(revision) : revision;
}

export function StoreSchedulingProfileClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["outlet.operating_schedule.manage"] === true;
  const pickupId = useId();
  const deliveryId = useId();
  const pickupErrorId = useId();
  const deliveryErrorId = useId();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [configured, setConfigured] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ pickup: null, delivery: null });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  function applyProfile(loaded: Readonly<{ configured: boolean; profile: StoreSchedulingProfile | null }>) {
    if (!loaded.configured || loaded.profile === null) {
      setConfigured(false);
      setRevision(null);
      setPickup("");
      setDelivery("");
      return;
    }
    setConfigured(true);
    setRevision(normalizeRevision(loaded.profile.revision));
    setPickup(String(loaded.profile.pickupMinLeadMinutes));
    setDelivery(String(loaded.profile.deliveryMinLeadMinutes));
  }

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await getStoreSchedulingProfile(outletId);
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
        setView({ kind: "error", message: "Scheduled fulfilment could not be loaded." });
        return;
      }
      applyProfile(result.data);
      setFieldErrors({ pickup: null, delivery: null });
      setError(null);
      setMessage(null);
      setView({ kind: "ready" });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  async function onSave() {
    if (!outletId || !canManage || view.kind !== "ready") return;
    const pickupMinutes = parsePositiveLeadMinutes(pickup);
    const deliveryMinutes = parsePositiveLeadMinutes(delivery);
    const nextErrors: FieldErrors = {
      pickup: pickupMinutes === null ? LEAD_TIME_ERROR : null,
      delivery: deliveryMinutes === null ? LEAD_TIME_ERROR : null,
    };
    if (pickupMinutes === null || deliveryMinutes === null) {
      setFieldErrors(nextErrors);
      setMessage(null);
      setError(null);
      announce(LEAD_TIME_ERROR);
      return;
    }
    const expectedRevision = revisionForWrite(configured, revision);
    if (expectedRevision === null) {
      const failed = "Scheduled fulfilment could not be saved.";
      setError(failed);
      announce(failed);
      return;
    }
    setPending(true);
    setFieldErrors({ pickup: null, delivery: null });
    setError(null);
    setMessage(null);
    announce("Saving scheduled fulfilment…");
    const result = await setStoreSchedulingProfile(outletId, {
      pickupMinLeadMinutes: pickupMinutes,
      deliveryMinLeadMinutes: deliveryMinutes,
      expectedRevision,
    });
    setPending(false);
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setView({ kind: "unauthorized" });
        return;
      }
      if (result.status === 403 || result.code === "STORE_UNAUTHORIZED") {
        const denied = "You do not have permission to save scheduled fulfilment for this outlet.";
        setError(denied);
        announce(denied);
        return;
      }
      if (result.code === "STORE_CONFLICT") {
        const refreshed = await getStoreSchedulingProfile(outletId);
        if (!refreshed.ok) {
          setView({
            kind: "error",
            message: "This configuration changed and could not be reloaded.",
          });
          return;
        }
        applyProfile(refreshed.data);
        const conflict =
          "This configuration changed. Saved lead times were reloaded. Review them before saving again.";
        setError(conflict);
        announce(conflict);
        return;
      }
      if (result.code === "STORE_REQUEST_INVALID") {
        const invalid = "Lead times must be whole minutes greater than 0.";
        const next: FieldErrors = {
          pickup: result.field === "deliveryMinLeadMinutes" ? null : invalid,
          delivery: result.field === "pickupMinLeadMinutes" ? null : invalid,
        };
        setFieldErrors(next);
        announce(invalid);
        return;
      }
      const failed = "Scheduled fulfilment could not be saved.";
      setError(failed);
      announce(failed);
      return;
    }
    applyProfile({ configured: true, profile: result.data.profile });
    setMessage("Scheduled fulfilment saved.");
    announce("Scheduled fulfilment saved.");
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return (
      <p aria-live="polite" data-testid="store-scheduling-loading">
        Loading scheduled fulfilment…
      </p>
    );
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-scheduling-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-scheduling-forbidden">
        You do not have permission to view scheduled fulfilment for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-scheduling-load-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  const inputsDisabled = !canManage || pending;

  return (
    <section
      aria-labelledby="store-scheduling-heading"
      className="flex max-w-full flex-col gap-4 border-t border-[var(--enterprise-border,#3D6026)] pt-6"
      data-testid="store-scheduling-profile"
    >
      <div className="space-y-1">
        <h2
          id="store-scheduling-heading"
          className="text-lg font-semibold text-[var(--enterprise-text-primary,#FAF3E2)]"
        >
          Scheduled fulfilment
        </h2>
        {configured ? (
          <p className="text-sm text-[var(--text-secondary)]" data-testid="store-scheduling-configured">
            Scheduled fulfilment is configured.
          </p>
        ) : (
          <div className="space-y-1" data-testid="store-scheduling-unconfigured">
            <p className="text-sm text-[var(--enterprise-text-primary,#FAF3E2)]">
              Scheduled fulfilment isn&apos;t configured for this outlet.
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {canManage
                ? "Set minimum lead times for Pickup and Delivery to make scheduled windows available."
                : "Minimum lead times have not been set."}
            </p>
          </div>
        )}
      </div>

      <form
        className="flex max-w-full flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <div className="flex flex-col gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor={pickupId}>
            <span className="text-[var(--text-secondary)]">Pickup minimum lead time (minutes)</span>
            <input
              id={pickupId}
              name="pickupMinLeadMinutes"
              inputMode="numeric"
              autoComplete="off"
              data-testid="store-scheduling-pickup"
              value={pickup}
              disabled={inputsDisabled}
              aria-invalid={fieldErrors.pickup ? true : undefined}
              aria-describedby={fieldErrors.pickup ? pickupErrorId : undefined}
              onChange={(event) => setPickup(event.target.value)}
              className={fieldClassName}
            />
          </label>
          {fieldErrors.pickup ? (
            <p id={pickupErrorId} role="alert" data-testid="store-scheduling-pickup-error" className="text-sm">
              {fieldErrors.pickup}
            </p>
          ) : null}

          <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor={deliveryId}>
            <span className="text-[var(--text-secondary)]">Delivery minimum lead time (minutes)</span>
            <input
              id={deliveryId}
              name="deliveryMinLeadMinutes"
              inputMode="numeric"
              autoComplete="off"
              data-testid="store-scheduling-delivery"
              value={delivery}
              disabled={inputsDisabled}
              aria-invalid={fieldErrors.delivery ? true : undefined}
              aria-describedby={fieldErrors.delivery ? deliveryErrorId : undefined}
              onChange={(event) => setDelivery(event.target.value)}
              className={fieldClassName}
            />
          </label>
          {fieldErrors.delivery ? (
            <p
              id={deliveryErrorId}
              role="alert"
              data-testid="store-scheduling-delivery-error"
              className="text-sm"
            >
              {fieldErrors.delivery}
            </p>
          ) : null}
        </div>

        {!canManage ? (
          <p className="text-sm text-[var(--text-secondary)]" data-testid="store-scheduling-readonly">
            You can view these lead times but cannot change them.
          </p>
        ) : (
          <Button
            type="submit"
            data-testid="store-scheduling-save"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </form>

      {message ? (
        <p aria-live="polite" data-testid="store-scheduling-success" className="text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" data-testid="store-scheduling-error" className="text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
