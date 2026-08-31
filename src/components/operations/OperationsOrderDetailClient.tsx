"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { OperationsDeliveryPanel } from "@/components/operations/OperationsDeliveryPanel";
import { OperationsLifecycleConfirmationDialog } from "@/components/operations/OperationsLifecycleConfirmationDialog";
import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { Button } from "@/components/ui/Button";
import {
  acceptWorkforceOrder,
  cancelWorkforceOrder,
  fulfilWorkforceOrder,
  getWorkforceOrder,
  isOperationsOrderUuid,
} from "@/lib/operations/orders";
import type {
  OperationsCancellationReasonCode,
  OperationsLifecycleAction,
  OperationsOrderDetail,
  OperationsOrderMutationResult,
} from "@/lib/operations/types";

type DetailView =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{ kind: "ready"; order: OperationsOrderDetail }>;

type FetchedView = Exclude<DetailView, { kind: "missing" | "loading" }>;

type PendingAction = Readonly<{
  action: OperationsLifecycleAction;
  orderId: string;
}>;

type ConfirmingState = Readonly<{
  action: OperationsLifecycleAction;
  error: string | null;
}>;

function formatTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function failureView(result: Readonly<{ status: number; code: string }>): FetchedView {
  if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
    return { kind: "unauthorized" };
  }
  if (result.status === 403 || result.code === "ORDER_UNAUTHORIZED") {
    return { kind: "forbidden" };
  }
  if (result.status === 404 || result.code === "ORDER_NOT_FOUND") {
    return { kind: "not-found" };
  }
  return { kind: "error" };
}

function eligibleActions(status: string): readonly OperationsLifecycleAction[] {
  if (status === "PLACED") return ["ACCEPT", "CANCEL"];
  if (status === "ACCEPTED") return ["FULFIL", "CANCEL"];
  return [];
}

function successAnnouncement(action: OperationsLifecycleAction, orderNumber: string): string {
  if (action === "ACCEPT") return `Order ${orderNumber} accepted.`;
  if (action === "FULFIL") return `Order ${orderNumber} fulfilled.`;
  return `Order ${orderNumber} cancelled.`;
}

function mutationErrorMessage(code: string): string {
  if (code === "WORKFORCE_AUTH_REQUIRED") {
    return "Sign in with your workforce account to continue.";
  }
  if (code === "ORDER_UNAUTHORIZED") {
    return "You do not have permission to perform this action.";
  }
  if (code === "ORDER_NOT_FOUND") {
    return "Order not found.";
  }
  if (code === "ORDER_CANCELLATION_REASON_INVALID" || code === "ORDER_REQUEST_INVALID") {
    return "The request was not valid. Check the details and try again.";
  }
  if (code === "ORDER_CONFLICT") {
    return "This order changed since you loaded it. Refreshing current status…";
  }
  if (
    code === "ORDER_ACCEPT_NOT_ALLOWED" ||
    code === "ORDER_FULFIL_NOT_ALLOWED" ||
    code === "ORDER_CANCEL_NOT_ALLOWED"
  ) {
    return "This action is no longer available for the current order status. Refreshing…";
  }
  if (code === "NETWORK_ERROR") {
    return "The network connection was interrupted before the result was confirmed. Refresh order status before trying again.";
  }
  if (code === "INVALID_RESPONSE") {
    return "The server response could not be verified. Refresh order status before trying again.";
  }
  return "The action could not be completed. Refresh order status before trying again.";
}

function applyMutationProjection(
  order: OperationsOrderDetail,
  mutation: OperationsOrderMutationResult,
): OperationsOrderDetail {
  return {
    ...order,
    status: mutation.status,
    revision: mutation.revision,
    updatedAt: mutation.updatedAt,
    acceptedAt: mutation.acceptedAt !== undefined ? mutation.acceptedAt : order.acceptedAt,
    fulfilledAt: mutation.fulfilledAt !== undefined ? mutation.fulfilledAt : order.fulfilledAt,
    cancelledAt: mutation.cancelledAt !== undefined ? mutation.cancelledAt : order.cancelledAt,
    cancellationReasonCode:
      mutation.cancellationReasonCode !== undefined
        ? mutation.cancellationReasonCode
        : order.cancellationReasonCode,
  };
}

export function OperationsOrderDetailClient() {
  const searchParams = useSearchParams();
  const rawOrderId = searchParams.get("orderId")?.trim() ?? "";
  const orderId = isOperationsOrderUuid(rawOrderId) ? rawOrderId : "";
  const [fetched, setFetched] = useState<Readonly<{ orderId: string; view: FetchedView }> | null>(
    null,
  );
  const [confirming, setConfirming] = useState<ConfirmingState | null>(null);
  const [cancellationReasonCode, setCancellationReasonCode] = useState<
    OperationsCancellationReasonCode | ""
  >("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [mutationAlert, setMutationAlert] = useState<string | null>(null);
  const fetchGenerationRef = useRef(0);
  const mutationEpochRef = useRef(0);
  const displayedOrderIdRef = useRef(orderId);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    displayedOrderIdRef.current = orderId;
    mutationEpochRef.current += 1;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const generation = ++fetchGenerationRef.current;
    let cancelled = false;
    void (async () => {
      const result = await getWorkforceOrder(orderId);
      if (cancelled || !mountedRef.current) return;
      if (generation !== fetchGenerationRef.current) return;
      if (result.ok) {
        setFetched({ orderId, view: { kind: "ready", order: result.data.order } });
        return;
      }
      setFetched({ orderId, view: failureView(result) });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refetchDetail = async (targetOrderId: string): Promise<boolean> => {
    const generation = ++fetchGenerationRef.current;
    const result = await getWorkforceOrder(targetOrderId);
    if (!mountedRef.current || generation !== fetchGenerationRef.current) return false;
    if (displayedOrderIdRef.current !== targetOrderId) return false;
    if (result.ok) {
      setFetched({ orderId: targetOrderId, view: { kind: "ready", order: result.data.order } });
      return true;
    }
    if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
      setFetched({ orderId: targetOrderId, view: { kind: "unauthorized" } });
      return false;
    }
    if (result.status === 403 || result.code === "ORDER_UNAUTHORIZED") {
      setFetched({ orderId: targetOrderId, view: { kind: "forbidden" } });
      return false;
    }
    if (result.status === 404 || result.code === "ORDER_NOT_FOUND") {
      setFetched({ orderId: targetOrderId, view: { kind: "not-found" } });
      return false;
    }
    setMutationAlert(
      "The order status could not be refreshed. Use Refresh to load the current order.",
    );
    return false;
  };

  const view: DetailView = !orderId
    ? { kind: "missing" }
    : fetched?.orderId === orderId
      ? fetched.view
      : { kind: "loading" };

  const mutationPendingForOrder =
    pendingAction !== null && pendingAction.orderId === orderId ? pendingAction.action : null;
  const activeConfirming = confirming !== null && fetched?.orderId === orderId ? confirming : null;
  const activeMutationAlert =
    mutationAlert !== null && fetched?.orderId === orderId ? mutationAlert : null;
  const activeStatusMessage = fetched?.orderId === orderId || !orderId ? statusMessage : "";

  const openConfirm = (action: OperationsLifecycleAction) => {
    if (mutationPendingForOrder) return;
    setMutationAlert(null);
    setCancellationReasonCode("");
    setConfirming({ action, error: null });
  };

  const dismissConfirm = () => {
    if (mutationPendingForOrder) return;
    setConfirming(null);
    setCancellationReasonCode("");
  };

  const runMutation = async () => {
    if (!confirming || view.kind !== "ready" || mutationPendingForOrder) return;
    if (view.order.orderId !== orderId) return;

    const action = confirming.action;
    if (action === "CANCEL" && cancellationReasonCode === "") {
      setConfirming({ action, error: "Select a cancellation reason before confirming." });
      return;
    }

    const revision = view.order.revision;
    const targetOrderId = view.order.orderId;
    const mutationEpoch = mutationEpochRef.current;
    setPendingAction({ action, orderId: targetOrderId });
    setConfirming({ action, error: null });
    setStatusMessage("Updating order…");

    const result =
      action === "ACCEPT"
        ? await acceptWorkforceOrder(targetOrderId, revision)
        : action === "FULFIL"
          ? await fulfilWorkforceOrder(targetOrderId, revision)
          : await cancelWorkforceOrder(
              targetOrderId,
              revision,
              cancellationReasonCode as OperationsCancellationReasonCode,
            );

    if (!mountedRef.current) return;

    const responseStillCurrent =
      mutationEpoch === mutationEpochRef.current &&
      displayedOrderIdRef.current === targetOrderId;

    setPendingAction((current) =>
      current && current.orderId === targetOrderId && current.action === action ? null : current,
    );

    if (!responseStillCurrent || !mountedRef.current) return;

    if (result.ok) {
      setFetched((current) => {
        if (!current || current.orderId !== targetOrderId || current.view.kind !== "ready") {
          return current;
        }
        return {
          orderId: targetOrderId,
          view: {
            kind: "ready",
            order: applyMutationProjection(current.view.order, result.data.order),
          },
        };
      });
      const announcement = successAnnouncement(action, result.data.order.orderNumber);
      setStatusMessage(announcement);
      setMutationAlert(null);
      setConfirming(null);
      setCancellationReasonCode("");
      await refetchDetail(targetOrderId);
      if (mountedRef.current && displayedOrderIdRef.current === targetOrderId) {
        setStatusMessage(announcement);
      }
      return;
    }

    if (result.code === "WORKFORCE_AUTH_REQUIRED" || result.status === 401) {
      setConfirming(null);
      setFetched({ orderId: targetOrderId, view: { kind: "unauthorized" } });
      setStatusMessage("Sign in required.");
      return;
    }

    if (result.code === "ORDER_UNAUTHORIZED" || result.status === 403) {
      const message = mutationErrorMessage(result.code);
      setConfirming({ action, error: message });
      setStatusMessage(message);
      return;
    }

    if (result.code === "ORDER_NOT_FOUND" || result.status === 404) {
      setConfirming(null);
      setFetched({ orderId: targetOrderId, view: { kind: "not-found" } });
      setStatusMessage("Order not found.");
      return;
    }

    const message = mutationErrorMessage(result.code);
    const needsRefresh =
      result.code === "ORDER_CONFLICT" ||
      result.code === "ORDER_ACCEPT_NOT_ALLOWED" ||
      result.code === "ORDER_FULFIL_NOT_ALLOWED" ||
      result.code === "ORDER_CANCEL_NOT_ALLOWED";

    if (needsRefresh) {
      setConfirming(null);
      setMutationAlert(message);
      setStatusMessage(message);
      await refetchDetail(targetOrderId);
      return;
    }

    setConfirming({ action, error: message });
    setStatusMessage(message);
  };

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[960px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Workforce Operations
          </p>
          <h1 className="font-display text-[clamp(32px,7vw,52px)] leading-[0.95] text-[var(--text-primary)]">
            Order detail
          </h1>
        </header>

        <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="operations-detail-live-status">
          {activeStatusMessage}
        </p>

        {view.kind === "loading" ? (
          <p aria-live="polite" data-testid="operations-detail-loading">
            Loading order…
          </p>
        ) : null}
        {view.kind === "missing" ? (
          <DetailMessage
            testId="operations-detail-missing"
            message="Choose an order from Operations to view its details."
          />
        ) : null}
        {view.kind === "unauthorized" ? (
          <DetailMessage
            testId="operations-detail-unauthorized"
            message="Sign in with your workforce account to view operations orders."
            signIn
          />
        ) : null}
        {view.kind === "forbidden" ? (
          <DetailMessage
            testId="operations-detail-forbidden"
            message="You do not have access to view this order."
          />
        ) : null}
        {view.kind === "not-found" ? (
          <DetailMessage testId="operations-detail-not-found" message="Order not found." />
        ) : null}
        {view.kind === "error" ? (
          <DetailMessage
            testId="operations-detail-error"
            message="The order could not be loaded. Try again from Operations."
          />
        ) : null}
        {view.kind === "ready" ? (
          <OrderDetail
            order={view.order}
            mutationPending={mutationPendingForOrder !== null}
            mutationAlert={activeMutationAlert}
            onAccept={() => openConfirm("ACCEPT")}
            onFulfil={() => openConfirm("FULFIL")}
            onCancel={() => openConfirm("CANCEL")}
            onRefresh={() => {
              void refetchDetail(orderId);
            }}
          />
        ) : null}

        {activeConfirming && view.kind === "ready" ? (
          <OperationsLifecycleConfirmationDialog
            action={activeConfirming.action}
            orderNumber={view.order.orderNumber}
            pending={mutationPendingForOrder !== null}
            error={activeConfirming.error}
            cancellationReasonCode={cancellationReasonCode}
            onCancellationReasonChange={setCancellationReasonCode}
            onConfirm={() => {
              void runMutation();
            }}
            onDismiss={dismissConfirm}
          />
        ) : null}
      </div>
    </main>
  );
}

function DetailMessage({
  testId,
  message,
  signIn = false,
}: Readonly<{ testId: string; message: string; signIn?: boolean }>) {
  return (
    <section
      role="alert"
      data-testid={testId}
      className="border border-[var(--border-subtle)] p-5 flex flex-col gap-4"
    >
      <p className="font-body text-[15px] text-[var(--text-secondary)]">{message}</p>
      <Button asChild variant="outline">
        <a href={signIn ? "/workforce/login/" : "/workforce/operations/"}>
          {signIn ? "Workforce sign in" : "Back to Operations"}
        </a>
      </Button>
    </section>
  );
}

function OrderDetail({
  order,
  mutationPending,
  mutationAlert,
  onAccept,
  onFulfil,
  onCancel,
  onRefresh,
}: Readonly<{
  order: OperationsOrderDetail;
  mutationPending: boolean;
  mutationAlert: string | null;
  onAccept: () => void;
  onFulfil: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}>) {
  const destination = order.destination;
  const actions = eligibleActions(order.status);

  return (
    <div className="flex flex-col gap-8" data-testid="operations-order-detail">
      <section className="grid gap-5 md:grid-cols-2" aria-labelledby="operations-order-summary">
        <h2 id="operations-order-summary" className="sr-only">
          Order summary
        </h2>
        <DetailList
          title="Order"
          values={[
            ["Order number", order.orderNumber],
            ["Order ID", order.orderId],
            ["Status", orderStatusLabel(order.status)],
            ["Revision", order.revision],
            ["Created", formatTime(order.createdAt)],
            ["Updated", formatTime(order.updatedAt)],
          ]}
        />
        <DetailList
          title="Outlet"
          values={[
            ["Name", order.outlet.name],
            ["Code", order.outlet.code],
            ["Outlet ID", order.outlet.outletId],
            ["Brand ID", order.outlet.brandId],
          ]}
        />
      </section>

      <section aria-labelledby="operations-destination">
        <h2 id="operations-destination" className="font-body text-[18px] font-semibold">
          Destination
        </h2>
        <dl className="mt-3 grid gap-2 font-body text-[14px]">
          <div>
            <dt className="text-[var(--text-secondary)]">Recipient</dt>
            <dd>{destination.recipientName}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Contact</dt>
            <dd>{destination.recipientPhone}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Address</dt>
            <dd>
              {[
                destination.addressLine1,
                destination.addressLine2,
                destination.landmark,
                destination.locality,
                `${destination.city}, ${destination.stateCode} ${destination.postalCode}`,
                destination.label,
              ]
                .filter(Boolean)
                .map((part) => (
                  <div key={part}>{part}</div>
                ))}
            </dd>
          </div>
        </dl>
      </section>

      <OperationsDeliveryPanel orderId={order.orderId} />

      <section aria-labelledby="operations-items">
        <h2 id="operations-items" className="font-body text-[18px] font-semibold">
          Items
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {order.lines.map((line, index) => (
            <li key={`${line.productName}-${index}`} className="border border-[var(--border-subtle)] p-4">
              <p className="font-body font-semibold">
                {line.quantity} × {line.productName}
              </p>
              <p className="font-body text-[14px] text-[var(--text-secondary)]">
                Variant: {line.variantName}
              </p>
              {line.modifiers.length > 0 ? (
                <ul className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
                  {line.modifiers.map((modifier, modifierIndex) => (
                    <li key={`${modifier.groupName}-${modifier.optionName}-${modifierIndex}`}>
                      {modifier.groupName}: {modifier.optionName} × {modifier.quantity}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 font-body">Line total: {formatPaise(line.lineTotalMinor)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Payment and lifecycle details">
        <DetailList
          title="Payment"
          values={[
            ["Grand total", formatPaise(order.money.grandTotalMinor)],
            ["Currency", order.money.currency],
            ["Payment provenance", order.paymentProvenanceKind],
          ]}
        />
        <DetailList
          title="Lifecycle"
          values={[
            ["Accepted", formatTime(order.acceptedAt)],
            ["Accepted by", order.acceptedByWorkforceUserId ?? "—"],
            ["Fulfilled", formatTime(order.fulfilledAt)],
            ["Fulfilled by", order.fulfilledByWorkforceUserId ?? "—"],
            ["Cancelled", formatTime(order.cancelledAt)],
            ["Cancelled by", order.cancelledByWorkforceUserId ?? "—"],
            ["Cancellation reason", order.cancellationReasonCode ?? "—"],
          ]}
        />
      </section>

      {mutationAlert ? (
        <p role="alert" data-testid="operations-mutation-alert" className="font-body text-[15px]">
          {mutationAlert}
        </p>
      ) : null}

      {actions.length > 0 ? (
        <section
          aria-label="Order lifecycle actions"
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          data-testid="operations-lifecycle-actions"
        >
          {actions.includes("ACCEPT") ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={mutationPending}
              onClick={onAccept}
            >
              Accept
            </Button>
          ) : null}
          {actions.includes("FULFIL") ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={mutationPending}
              onClick={onFulfil}
            >
              Fulfil
            </Button>
          ) : null}
          {actions.includes("CANCEL") ? (
            <Button
              type="button"
              variant="destructive"
              size="md"
              disabled={mutationPending}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" size="md" disabled={mutationPending} onClick={onRefresh}>
          Refresh
        </Button>
        <Button asChild variant="outline">
          <a href="/workforce/operations/">Back to Operations</a>
        </Button>
      </div>
    </div>
  );
}

function DetailList({
  title,
  values,
}: Readonly<{ title: string; values: readonly (readonly [string, string])[] }>) {
  return (
    <section>
      <h2 className="font-body text-[18px] font-semibold">{title}</h2>
      <dl className="mt-3 grid gap-2 font-body text-[14px]">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[var(--text-secondary)]">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
