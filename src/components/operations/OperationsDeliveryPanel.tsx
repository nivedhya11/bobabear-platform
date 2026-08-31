"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getWorkforceDelivery,
  postDeliveryCommand,
  type OperationsDeliveryDetail,
} from "@/lib/operations/delivery";

type PanelState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "empty" }>
  | Readonly<{ kind: "ready"; detail: OperationsDeliveryDetail }>
  | Readonly<{ kind: "error"; message: string }>;

function externalBookingHint(status: string): string | null {
  if (status === "REQUESTED") {
    return "Begin manual booking in BOBA before attempting external courier booking.";
  }
  if (status === "BOOKING_OUTCOME_UNKNOWN") {
    return "External booking may now be attempted. Resolve definitively once outcome is known.";
  }
  return null;
}

export function OperationsDeliveryPanel(props: Readonly<{ orderId: string }>) {
  const { orderId } = props;
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [providerLabel, setProviderLabel] = useState("dehradun-courier");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    const result = await getWorkforceDelivery(orderId);
    if (!result.ok) {
      setState({ kind: "error", message: "Delivery details could not be loaded." });
      return;
    }
    if (!result.data.delivery) {
      setState({ kind: "empty" });
      return;
    }
    setState({ kind: "ready", detail: result.data.delivery });
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getWorkforceDelivery(orderId);
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: "error", message: "Delivery details could not be loaded." });
        return;
      }
      if (!result.data.delivery) {
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "ready", detail: result.data.delivery });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function run(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const result = await postDeliveryCommand(orderId, action, payload);
    setBusy(false);
    if (!result.ok) {
      if (result.code === "DELIVERY_REVISION_CONFLICT" || result.code === "DELIVERY_STATE_CONFLICT") {
        setMessage("Delivery changed since load. Refreshing…");
        await reload();
        return;
      }
      setMessage("Command could not be completed.");
      return;
    }
    setMessage("Updated.");
    await reload();
  }

  if (state.kind === "loading") {
    return <p className="text-sm text-[var(--text-secondary)]">Loading delivery…</p>;
  }
  if (state.kind === "empty") {
    return (
      <section className="space-y-3 rounded-md border border-[var(--border-subtle)] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Delivery
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">No active delivery request.</p>
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void run("arrange", {
              requestFingerprint: `ops-${orderId.slice(0, 8)}`,
            })
          }
        >
          Arrange delivery
        </Button>
        {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}
      </section>
    );
  }
  if (state.kind === "error") {
    return <p className="text-sm text-[var(--text-secondary)]">{state.message}</p>;
  }

  const { detail } = state;
  const d = detail.delivery;
  const hint = externalBookingHint(d.status);
  const canBegin = detail.permittedCommands.includes("BEGIN_MANUAL_BOOKING");
  const canConfirm = detail.permittedCommands.includes("CONFIRM_MANUAL_BOOKING");

  return (
    <section className="space-y-3 rounded-md border border-[var(--border-subtle)] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        Delivery
      </h2>
      <dl className="grid gap-1 text-sm">
        <div>
          <dt className="text-[var(--text-tertiary)]">Status</dt>
          <dd>{d.status}</dd>
        </div>
        {d.bookingCorrelationId ? (
          <div>
            <dt className="text-[var(--text-tertiary)]">Booking correlation</dt>
            <dd className="font-mono text-xs">{d.bookingCorrelationId}</dd>
          </div>
        ) : null}
        {d.provider ? (
          <div>
            <dt className="text-[var(--text-tertiary)]">Provider</dt>
            <dd>{d.provider}</dd>
          </div>
        ) : null}
        {detail.trackingUrl ? (
          <div>
            <dt className="text-[var(--text-tertiary)]">Tracking</dt>
            <dd>
              <a href={detail.trackingUrl} target="_blank" rel="noreferrer">
                Track
              </a>
            </dd>
          </div>
        ) : null}
        {detail.activeAssignment ? (
          <div>
            <dt className="text-[var(--text-tertiary)]">Assignment</dt>
            <dd>{detail.activeAssignment.assignmentKey}</dd>
          </div>
        ) : null}
      </dl>
      {hint ? (
        <p className="rounded-sm bg-[var(--surface-muted)] p-2 text-sm text-[var(--text-secondary)]">
          {hint}
        </p>
      ) : null}
      {canBegin ? (
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Provider label
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={providerLabel}
              onChange={(e) => setProviderLabel(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("begin-manual-booking", {
                deliveryId: d.id,
                expectedRevision: d.revision,
                provider: providerLabel.trim(),
              })
            }
          >
            Begin manual booking
          </Button>
        </div>
      ) : null}
      {canConfirm ? (
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void run("confirm-manual-booking", {
              deliveryId: d.id,
              expectedRevision: d.revision,
            })
          }
        >
          Confirm manual booking
        </Button>
      ) : null}
      {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}
    </section>
  );
}
