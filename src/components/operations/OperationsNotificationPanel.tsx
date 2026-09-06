"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getOrderNotifications,
  notificationStatusLabel,
  resendOrderNotification,
  type OperationsNotificationItem,
} from "@/lib/operations/notifications";

type PanelState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "hidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly OperationsNotificationItem[] }>;

function errorMessage(code: string): string {
  if (code === "NOTIFICATION_RESEND_NOT_ALLOWED") {
    return "This notification cannot be resent from its current status.";
  }
  if (code === "NOTIFICATION_INVALID_INPUT") {
    return "A resend reason is required.";
  }
  if (code === "NETWORK_ERROR") {
    return "The network connection was interrupted before the result was confirmed.";
  }
  return "Notification support could not be updated. Try again.";
}

export function OperationsNotificationPanel({ orderId }: Readonly<{ orderId: string }>) {
  const reasonId = useId();
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [resendTarget, setResendTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function refresh() {
    const result = await getOrderNotifications(orderId);
    if (!mountedRef.current) return;
    if (!result.ok) {
      if (
        result.status === 403 ||
        result.code === "NOTIFICATION_UNAUTHORIZED" ||
        result.code === "NOTIFICATION_NOT_FOUND"
      ) {
        setState({ kind: "hidden" });
        return;
      }
      setState({ kind: "error", message: errorMessage(result.code) });
      return;
    }
    setState({ kind: "ready", items: result.data.items });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getOrderNotifications(orderId);
      if (cancelled || !mountedRef.current) return;
      if (!result.ok) {
        if (
          result.status === 403 ||
          result.code === "NOTIFICATION_UNAUTHORIZED" ||
          result.code === "NOTIFICATION_NOT_FOUND"
        ) {
          setState({ kind: "hidden" });
          return;
        }
        setState({ kind: "error", message: errorMessage(result.code) });
        return;
      }
      setState({ kind: "ready", items: result.data.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function submitResend() {
    if (!resendTarget || busy) return;
    if (reason.trim().length === 0) {
      setAlert("A resend reason is required.");
      return;
    }
    setBusy(true);
    setAlert(null);
    setStatusMessage("Resending notification…");
    const result = await resendOrderNotification(orderId, resendTarget, reason.trim());
    if (!mountedRef.current) return;
    setBusy(false);
    if (!result.ok) {
      setAlert(errorMessage(result.code));
      setStatusMessage("Resend failed.");
      return;
    }
    setResendTarget(null);
    setReason("");
    setStatusMessage("Notification resent.");
    await refresh();
  }

  if (state.kind === "loading" || state.kind === "hidden") return null;
  if (state.kind === "error") {
    return (
      <section className="mt-8" aria-labelledby="notification-heading">
        <h2 id="notification-heading" className="text-lg font-semibold text-[var(--enterprise-fg)]">
          Notifications
        </h2>
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-labelledby="notification-heading">
      <h2 id="notification-heading" className="text-lg font-semibold text-[var(--enterprise-fg)]">
        Notifications
      </h2>
      <p className="mt-1 text-sm text-[var(--enterprise-muted)]">
        Order-related customer notifications. Free-form messaging is not available.
      </p>
      {state.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--enterprise-muted)]">No notifications for this order.</p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label="Notification history">
          {state.items.map((item) => (
            <li
              key={item.notificationRequestId}
              className="rounded border border-[var(--enterprise-border)] px-3 py-2 text-sm"
            >
              <p className="font-medium">
                {item.semanticType.replaceAll("_", " ")} · {notificationStatusLabel(item.status)}
              </p>
              <p className="text-[var(--enterprise-muted)]">
                Channel: {item.channel} · Attempts: {item.attemptCount}
              </p>
              {item.reviewReason || item.suppressionReason ? (
                <p className="text-[var(--enterprise-muted)]">
                  {item.reviewReason ?? item.suppressionReason}
                </p>
              ) : null}
              {item.resendPermitted ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setResendTarget(item.notificationRequestId);
                      setAlert(null);
                    }}
                  >
                    Resend
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {resendTarget ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitResend();
          }}
        >
          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium">
              Resend reason
            </label>
            <input
              id={reasonId}
              name="reason"
              required
              className="mt-1 w-full min-h-11 rounded border border-[var(--enterprise-border)] px-3"
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {alert ? (
            <p className="text-sm text-red-700" role="alert">
              {alert}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {statusMessage}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || reason.trim().length === 0} aria-busy={busy}>
              {busy ? "Sending…" : "Confirm resend"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setResendTarget(null);
                setReason("");
                setAlert(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
