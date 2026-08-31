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

function deliveryBasePayload(delivery: OperationsDeliveryDetail["delivery"]) {
  return {
    deliveryId: delivery.id,
    expectedRevision: delivery.revision,
  };
}

export function OperationsDeliveryPanel(props: Readonly<{ orderId: string }>) {
  const { orderId } = props;
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [providerLabel, setProviderLabel] = useState("dehradun-courier");
  const [externalBookingReference, setExternalBookingReference] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("https://track.example.com/uat");
  const [assignmentKey, setAssignmentKey] = useState("rider-uat-1");
  const [courierReference, setCourierReference] = useState("");
  const [handoffReference, setHandoffReference] = useState("pickup-uat-1");
  const [proofReference, setProofReference] = useState("proof-uat-1");
  const [failureCode, setFailureCode] = useState("NO_BOOKING");
  const [failureReason, setFailureReason] = useState("Courier unavailable");
  const [cancellationCode, setCancellationCode] = useState("COURIER_CANCEL");
  const [cancellationReason, setCancellationReason] = useState("External booking cancelled");
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
  const base = deliveryBasePayload(d);
  const commands = detail.permittedCommands;
  const hint = externalBookingHint(d.status);
  const has = (command: string) => commands.includes(command);

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

      {has("BEGIN_MANUAL_BOOKING") ? (
        <div className="flex flex-wrap items-end gap-2">
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
                ...base,
                provider: providerLabel.trim(),
              })
            }
          >
            Begin manual booking
          </Button>
        </div>
      ) : null}

      {has("CONFIRM_MANUAL_BOOKING") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Confirm manual booking</p>
          <label className="flex flex-col gap-1 text-sm">
            External booking reference
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={externalBookingReference}
              onChange={(e) => setExternalBookingReference(e.target.value)}
              placeholder="EXT-123"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tracking URL (HTTPS)
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("confirm-manual-booking", {
                ...base,
                externalBookingReference: externalBookingReference.trim() || undefined,
                trackingUrl: trackingUrl.trim() || undefined,
              })
            }
          >
            Confirm manual booking
          </Button>
        </div>
      ) : null}

      {has("RESOLVE_MANUAL_BOOKING_FAILURE") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Resolve booking failure</p>
          <label className="flex flex-col gap-1 text-sm">
            Failure code
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={failureCode}
              onChange={(e) => setFailureCode(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Failure reason
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("resolve-manual-booking-failure", {
                ...base,
                failureCode: failureCode.trim(),
                failureReason: failureReason.trim(),
                inactiveBookingConfirmed: true,
              })
            }
          >
            Resolve booking failure
          </Button>
        </div>
      ) : null}

      {has("RESOLVE_MANUAL_BOOKING_CANCELLATION") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Resolve booking cancellation</p>
          <label className="flex flex-col gap-1 text-sm">
            Cancellation code
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={cancellationCode}
              onChange={(e) => setCancellationCode(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cancellation reason
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("resolve-manual-booking-cancellation", {
                ...base,
                cancellationCode: cancellationCode.trim(),
                cancellationReason: cancellationReason.trim(),
                inactiveBookingConfirmed: true,
              })
            }
          >
            Resolve booking cancellation
          </Button>
        </div>
      ) : null}

      {has("RECORD_ASSIGNMENT") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Record assignment</p>
          <label className="flex flex-col gap-1 text-sm">
            Assignment key
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={assignmentKey}
              onChange={(e) => setAssignmentKey(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Courier reference (optional)
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={courierReference}
              onChange={(e) => setCourierReference(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("record-assignment", {
                ...base,
                provider: (d.provider ?? providerLabel).trim(),
                assignmentKey: assignmentKey.trim(),
                courierReference: courierReference.trim() || undefined,
              })
            }
          >
            Record assignment
          </Button>
        </div>
      ) : null}

      {has("CONFIRM_PICKUP") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Confirm pickup</p>
          <label className="flex flex-col gap-1 text-sm">
            Handoff reference
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={handoffReference}
              onChange={(e) => setHandoffReference(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("confirm-pickup", {
                ...base,
                handoffReference: handoffReference.trim(),
              })
            }
          >
            Confirm pickup
          </Button>
        </div>
      ) : null}

      {has("CONFIRM_DELIVERY") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Confirm delivery</p>
          <label className="flex flex-col gap-1 text-sm">
            Proof reference
            <input
              className="rounded border border-[var(--border-subtle)] px-2 py-1"
              value={proofReference}
              onChange={(e) => setProofReference(e.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("confirm-delivery", {
                ...base,
                proofReference: proofReference.trim(),
              })
            }
          >
            Confirm delivery
          </Button>
        </div>
      ) : null}

      {has("REPORT_DELIVERY_FAILURE") ? (
        <div className="space-y-2 rounded-sm border border-[var(--border-subtle)] p-3">
          <p className="text-sm font-medium">Report delivery failure</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("report-failure", {
                ...base,
                failureCode: failureCode.trim(),
                failureReason: failureReason.trim(),
              })
            }
          >
            Report delivery failure
          </Button>
        </div>
      ) : null}

      {has("CANCEL_DELIVERY") ? (
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void run("cancel", {
              ...base,
              cancellationCode: cancellationCode.trim(),
              cancellationReason: cancellationReason.trim(),
            })
          }
        >
          Cancel delivery
        </Button>
      ) : null}

      {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}
    </section>
  );
}
