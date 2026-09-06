"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getStoreOperatingState,
  operatingStateLabel,
  pauseStoreOutlet,
  resumeStoreOutlet,
  suspendStoreOutlet,
  unsuspendStoreOutlet,
  type StoreOperatingState,
} from "@/lib/operations/store";

import { StoreConfirmationDialog } from "./StoreConfirmationDialog";
import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; operating: StoreOperatingState }>;

type PendingAction = "pause" | "resume" | "suspend" | "unsuspend" | null;

export function StoreOperatingStatusClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canPause = capabilities?.["outlet.operating_state.pause"] === true;
  const canSuspend = capabilities?.["outlet.operating_state.suspend"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [confirmAction, setConfirmAction] = useState<PendingAction>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await getStoreOperatingState(outletId);
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
        setView({ kind: "error", message: "Operating status could not be loaded." });
        return;
      }
      setView({
        kind: "ready",
        operating: {
          controlState: result.data.controlState,
          effectiveState: result.data.effectiveState,
          timezone: result.data.timezone,
          pausedUntil: result.data.pausedUntil,
          code: result.data.code,
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  async function runAction(action: Exclude<PendingAction, null>) {
    if (!outletId) return;
    setPending(true);
    setActionError(null);
    announce("Updating operating status…");
    const result =
      action === "pause"
        ? await pauseStoreOutlet(outletId, {})
        : action === "resume"
          ? await resumeStoreOutlet(outletId, {})
          : action === "suspend"
            ? await suspendStoreOutlet(outletId, {})
            : await unsuspendStoreOutlet(outletId, {});
    setPending(false);
    if (!result.ok) {
      const message = "Operating status could not be updated.";
      setActionError(message);
      announce(message);
      return;
    }
    setConfirmAction(null);
    announce("Operating status updated.");
    setReloadToken((n) => n + 1);
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return (
      <p aria-live="polite" data-testid="store-operating-status-loading">
        Loading operating status…
      </p>
    );
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-operating-status-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-operating-status-forbidden">
        You do not have permission to view operating status for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-operating-status-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  const control = view.operating.controlState;
  const effective = view.operating.effectiveState;

  return (
    <div className="flex flex-col gap-4" data-testid="store-operating-status">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--text-secondary)]">Effective status</dt>
          <dd data-testid="store-operating-effective">{operatingStateLabel(effective)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Control state</dt>
          <dd data-testid="store-operating-control">
            {control ? operatingStateLabel(control) : "Not set"}
          </dd>
        </div>
        {view.operating.pausedUntil ? (
          <div>
            <dt className="text-[var(--text-secondary)]">Paused until</dt>
            <dd>{view.operating.pausedUntil}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {canPause && control !== "paused" && control !== "suspended" ? (
          <Button type="button" data-testid="store-operating-pause" onClick={() => setConfirmAction("pause")}>
            Pause ordering
          </Button>
        ) : null}
        {canPause && control === "paused" ? (
          <Button type="button" data-testid="store-operating-resume" onClick={() => setConfirmAction("resume")}>
            Resume ordering
          </Button>
        ) : null}
        {canSuspend && control !== "suspended" ? (
          <Button
            type="button"
            variant="destructive"
            data-testid="store-operating-suspend"
            onClick={() => setConfirmAction("suspend")}
          >
            Suspend outlet
          </Button>
        ) : null}
        {canSuspend && control === "suspended" ? (
          <Button
            type="button"
            data-testid="store-operating-unsuspend"
            onClick={() => setConfirmAction("unsuspend")}
          >
            Unsuspend outlet
          </Button>
        ) : null}
      </div>

      {confirmAction ? (
        <StoreConfirmationDialog
          title={
            confirmAction === "pause"
              ? "Pause ordering?"
              : confirmAction === "resume"
                ? "Resume ordering?"
                : confirmAction === "suspend"
                  ? "Suspend this outlet?"
                  : "Unsuspend this outlet?"
          }
          description={
            confirmAction === "pause"
              ? "Customers will not be able to place new orders while the outlet is paused."
              : confirmAction === "resume"
                ? "The outlet will return to accepting orders according to its schedule."
                : confirmAction === "suspend"
                  ? "Suspension is a high-impact control. Ordering stays blocked until an authorized operator unsuspends."
                  : "The outlet will leave suspended control and return toward accepting orders."
          }
          confirmLabel={
            confirmAction === "pause"
              ? "Confirm pause"
              : confirmAction === "resume"
                ? "Confirm resume"
                : confirmAction === "suspend"
                  ? "Confirm suspend"
                  : "Confirm unsuspend"
          }
          destructive={confirmAction === "suspend"}
          pending={pending}
          error={actionError}
          onConfirm={() => void runAction(confirmAction)}
          onDismiss={() => {
            if (pending) return;
            setConfirmAction(null);
            setActionError(null);
          }}
        />
      ) : null}
    </div>
  );
}
