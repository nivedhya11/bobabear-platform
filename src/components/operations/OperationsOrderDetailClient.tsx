"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { Button } from "@/components/ui/Button";
import { getWorkforceOrder, isOperationsOrderUuid } from "@/lib/operations/orders";
import type { OperationsOrderDetail } from "@/lib/operations/types";

type DetailView =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{ kind: "ready"; order: OperationsOrderDetail }>;

type FetchedView = Exclude<DetailView, { kind: "missing" | "loading" }>;

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

export function OperationsOrderDetailClient() {
  const searchParams = useSearchParams();
  const rawOrderId = searchParams.get("orderId")?.trim() ?? "";
  const orderId = isOperationsOrderUuid(rawOrderId) ? rawOrderId : "";
  const [fetched, setFetched] = useState<Readonly<{ orderId: string; view: FetchedView }> | null>(
    null,
  );

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      const result = await getWorkforceOrder(orderId);
      if (cancelled) return;
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

  const view: DetailView = !orderId
    ? { kind: "missing" }
    : fetched?.orderId === orderId
      ? fetched.view
      : { kind: "loading" };

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

        {view.kind === "loading" ? <p aria-live="polite" data-testid="operations-detail-loading">Loading order…</p> : null}
        {view.kind === "missing" ? <DetailMessage testId="operations-detail-missing" message="Choose an order from Operations to view its details." /> : null}
        {view.kind === "unauthorized" ? <DetailMessage testId="operations-detail-unauthorized" message="Sign in with your workforce account to view operations orders." signIn /> : null}
        {view.kind === "forbidden" ? <DetailMessage testId="operations-detail-forbidden" message="You do not have access to view this order." /> : null}
        {view.kind === "not-found" ? <DetailMessage testId="operations-detail-not-found" message="Order not found." /> : null}
        {view.kind === "error" ? <DetailMessage testId="operations-detail-error" message="The order could not be loaded. Try again from Operations." /> : null}
        {view.kind === "ready" ? <OrderDetail order={view.order} /> : null}
      </div>
    </main>
  );
}

function DetailMessage({ testId, message, signIn = false }: Readonly<{ testId: string; message: string; signIn?: boolean }>) {
  return (
    <section role="alert" data-testid={testId} className="border border-[var(--border-subtle)] p-5 flex flex-col gap-4">
      <p className="font-body text-[15px] text-[var(--text-secondary)]">{message}</p>
      <Button asChild variant="outline"><a href={signIn ? "/workforce/login/" : "/workforce/operations/"}>{signIn ? "Workforce sign in" : "Back to Operations"}</a></Button>
    </section>
  );
}

function OrderDetail({ order }: Readonly<{ order: OperationsOrderDetail }>) {
  const destination = order.destination;
  return (
    <div className="flex flex-col gap-8" data-testid="operations-order-detail">
      <section className="grid gap-5 md:grid-cols-2" aria-labelledby="operations-order-summary">
        <h2 id="operations-order-summary" className="sr-only">Order summary</h2>
        <DetailList title="Order" values={[["Order number", order.orderNumber], ["Order ID", order.orderId], ["Status", orderStatusLabel(order.status)], ["Revision", order.revision], ["Created", formatTime(order.createdAt)], ["Updated", formatTime(order.updatedAt)]]} />
        <DetailList title="Outlet" values={[["Name", order.outlet.name], ["Code", order.outlet.code], ["Outlet ID", order.outlet.outletId], ["Brand ID", order.outlet.brandId]]} />
      </section>

      <section aria-labelledby="operations-destination"><h2 id="operations-destination" className="font-body text-[18px] font-semibold">Destination</h2><dl className="mt-3 grid gap-2 font-body text-[14px]"><div><dt className="text-[var(--text-secondary)]">Recipient</dt><dd>{destination.recipientName}</dd></div><div><dt className="text-[var(--text-secondary)]">Contact</dt><dd>{destination.recipientPhone}</dd></div><div><dt className="text-[var(--text-secondary)]">Address</dt><dd>{[destination.addressLine1, destination.addressLine2, destination.landmark, destination.locality, `${destination.city}, ${destination.stateCode} ${destination.postalCode}`, destination.label].filter(Boolean).map((part) => <div key={part}>{part}</div>)}</dd></div></dl></section>

      <section aria-labelledby="operations-items"><h2 id="operations-items" className="font-body text-[18px] font-semibold">Items</h2><ul className="mt-3 flex flex-col gap-3">{order.lines.map((line, index) => <li key={`${line.productName}-${index}`} className="border border-[var(--border-subtle)] p-4"><p className="font-body font-semibold">{line.quantity} × {line.productName}</p><p className="font-body text-[14px] text-[var(--text-secondary)]">Variant: {line.variantName}</p>{line.modifiers.length > 0 ? <ul className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">{line.modifiers.map((modifier, modifierIndex) => <li key={`${modifier.groupName}-${modifier.optionName}-${modifierIndex}`}>{modifier.groupName}: {modifier.optionName} × {modifier.quantity}</li>)}</ul> : null}<p className="mt-2 font-body">Line total: {formatPaise(line.lineTotalMinor)}</p></li>)}</ul></section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Payment and lifecycle details">
        <DetailList title="Payment" values={[["Grand total", formatPaise(order.money.grandTotalMinor)], ["Currency", order.money.currency], ["Payment provenance", order.paymentProvenanceKind]]} />
        <DetailList title="Lifecycle" values={[["Accepted", formatTime(order.acceptedAt)], ["Accepted by", order.acceptedByWorkforceUserId ?? "—"], ["Fulfilled", formatTime(order.fulfilledAt)], ["Fulfilled by", order.fulfilledByWorkforceUserId ?? "—"], ["Cancelled", formatTime(order.cancelledAt)], ["Cancelled by", order.cancelledByWorkforceUserId ?? "—"], ["Cancellation reason", order.cancellationReasonCode ?? "—"]]} />
      </section>
      <Button asChild variant="outline"><a href="/workforce/operations/">Back to Operations</a></Button>
    </div>
  );
}

function DetailList({ title, values }: Readonly<{ title: string; values: readonly (readonly [string, string])[] }>) {
  return <section><h2 className="font-body text-[18px] font-semibold">{title}</h2><dl className="mt-3 grid gap-2 font-body text-[14px]">{values.map(([label, value]) => <div key={label}><dt className="text-[var(--text-secondary)]">{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}
