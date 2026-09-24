"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getStorePickupProfile,
  setStorePickupProfile,
  type StorePickupProfile,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; profile: StorePickupProfile | null }>;

type FormState = Readonly<{
  enabled: boolean;
  displayName: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  instructions: string;
  expectedRevision: number;
}>;

const EMPTY_FORM: FormState = Object.freeze({
  enabled: false,
  displayName: "",
  addressLine1: "",
  addressLine2: "",
  locality: "",
  city: "",
  stateCode: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  instructions: "",
  expectedRevision: 0,
});

function formFromProfile(profile: StorePickupProfile | null): FormState {
  if (!profile) return EMPTY_FORM;
  return {
    enabled: profile.enabled,
    displayName: profile.displayName,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2 ?? "",
    locality: profile.locality ?? "",
    city: profile.city,
    stateCode: profile.stateCode,
    postalCode: profile.postalCode,
    latitude: profile.latitude ?? "",
    longitude: profile.longitude ?? "",
    instructions: profile.instructions,
    expectedRevision: profile.revision,
  };
}

const fieldClassName =
  "min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]";

export function StorePickupProfileClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["outlet.update"] === true;
  const formId = useId();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await getStorePickupProfile(outletId);
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
        setView({ kind: "error", message: "Pickup profile could not be loaded." });
        return;
      }
      setForm(formFromProfile(result.data.profile));
      setView({ kind: "ready", profile: result.data.profile });
      setError(null);
      setMessage(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave() {
    if (!outletId || !canManage || view.kind !== "ready") return;
    setPending(true);
    setError(null);
    setMessage(null);
    announce("Saving pickup profile…");
    const result = await setStorePickupProfile(outletId, {
      enabled: form.enabled,
      displayName: form.displayName.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() === "" ? null : form.addressLine2.trim(),
      locality: form.locality.trim() === "" ? null : form.locality.trim(),
      city: form.city.trim(),
      stateCode: form.stateCode.trim(),
      postalCode: form.postalCode.trim(),
      latitude: form.latitude.trim() === "" ? null : form.latitude.trim(),
      longitude: form.longitude.trim() === "" ? null : form.longitude.trim(),
      instructions: form.instructions.trim(),
      expectedRevision: form.expectedRevision,
    });
    setPending(false);
    if (!result.ok) {
      if (result.code === "STORE_CONFLICT") {
        const refreshed = await getStorePickupProfile(outletId);
        if (refreshed.ok) {
          setForm(formFromProfile(refreshed.data.profile));
          setView({ kind: "ready", profile: refreshed.data.profile });
        }
        const conflict =
          "This pickup profile changed elsewhere. Fields were refreshed — review and save again.";
        setError(conflict);
        announce(conflict);
        return;
      }
      const failed =
        result.code === "STORE_REQUEST_INVALID"
          ? "Pickup profile could not be saved. Check the fields and try again."
          : "Pickup profile could not be saved.";
      setError(failed);
      announce(failed);
      return;
    }
    setForm(formFromProfile(result.data.profile));
    setView({ kind: "ready", profile: result.data.profile });
    setMessage("Pickup profile saved.");
    announce("Pickup profile saved.");
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return (
      <p aria-live="polite" data-testid="store-pickup-profile-loading">
        Loading pickup profile…
      </p>
    );
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-pickup-profile-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-pickup-profile-forbidden">
        You do not have permission to view the pickup profile for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-pickup-profile-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      data-testid="store-pickup-profile"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
      aria-labelledby={`${formId}-heading`}
    >
      <div>
        <h2 id={`${formId}-heading`} className="font-body text-[18px] font-semibold">
          Pickup profile
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Customer-facing pickup location. Pickup stays off until this profile exists and is
          enabled. Coordinates are optional.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          data-testid="store-pickup-profile-enabled"
          checked={form.enabled}
          disabled={!canManage || pending}
          onChange={(event) => updateField("enabled", event.target.checked)}
          className="h-4 w-4 focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)]"
        />
        <span>Enable customer pickup at this outlet</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--text-secondary)]">Display name</span>
          <input
            data-testid="store-pickup-profile-display-name"
            value={form.displayName}
            disabled={!canManage || pending}
            required
            onChange={(event) => updateField("displayName", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--text-secondary)]">Address line 1</span>
          <input
            data-testid="store-pickup-profile-address-1"
            value={form.addressLine1}
            disabled={!canManage || pending}
            required
            onChange={(event) => updateField("addressLine1", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--text-secondary)]">Address line 2 (optional)</span>
          <input
            data-testid="store-pickup-profile-address-2"
            value={form.addressLine2}
            disabled={!canManage || pending}
            onChange={(event) => updateField("addressLine2", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Locality (optional)</span>
          <input
            data-testid="store-pickup-profile-locality"
            value={form.locality}
            disabled={!canManage || pending}
            onChange={(event) => updateField("locality", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">City</span>
          <input
            data-testid="store-pickup-profile-city"
            value={form.city}
            disabled={!canManage || pending}
            required
            onChange={(event) => updateField("city", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">State code</span>
          <input
            data-testid="store-pickup-profile-state"
            value={form.stateCode}
            disabled={!canManage || pending}
            required
            onChange={(event) => updateField("stateCode", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Postal code</span>
          <input
            data-testid="store-pickup-profile-postal"
            value={form.postalCode}
            disabled={!canManage || pending}
            required
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            onChange={(event) => updateField("postalCode", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Latitude (optional)</span>
          <input
            data-testid="store-pickup-profile-lat"
            value={form.latitude}
            disabled={!canManage || pending}
            onChange={(event) => updateField("latitude", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-secondary)]">Longitude (optional)</span>
          <input
            data-testid="store-pickup-profile-lng"
            value={form.longitude}
            disabled={!canManage || pending}
            onChange={(event) => updateField("longitude", event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--text-secondary)]">Pickup instructions</span>
          <textarea
            data-testid="store-pickup-profile-instructions"
            value={form.instructions}
            disabled={!canManage || pending}
            required
            rows={3}
            onChange={(event) => updateField("instructions", event.target.value)}
            className={`${fieldClassName} min-h-[5.5rem] py-2`}
          />
        </label>
      </div>

      <p className="text-sm text-[var(--text-secondary)]" data-testid="store-pickup-profile-revision">
        Profile revision: {view.profile ? view.profile.revision : "none (create)"}
      </p>

      {canManage ? (
        <Button
          type="submit"
          data-testid="store-pickup-profile-save"
          disabled={pending}
          aria-busy={pending}
        >
          Save pickup profile
        </Button>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          You can view this profile but do not have permission to update it.
        </p>
      )}

      {message ? (
        <p aria-live="polite" data-testid="store-pickup-profile-success" className="text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" data-testid="store-pickup-profile-error-msg" className="text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
