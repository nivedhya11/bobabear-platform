"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OperationsDeliveryPanel } from "@/components/operations/OperationsDeliveryPanel";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { listWorkforceOrders } from "@/lib/operations/orders";
import type { OperationsOrderSummary } from "@/lib/operations/types";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{ kind: "ready"; items: readonly OperationsOrderSummary[]; selectedOrderId: string | null }>;

export function OperationsDeliveryWorkspaceClient() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listWorkforceOrders({ status: "ACCEPTED", limit: 50 });
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setState({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403 || result.code === "ORDER_UNAUTHORIZED") {
          setState({ kind: "forbidden" });
          return;
        }
        setState({ kind: "error" });
        return;
      }
      setState({
        kind: "ready",
        items: result.data.items,
        selectedOrderId: result.data.items[0]?.orderId ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <p aria-live="polite">Loading delivery workspace…</p>;
  if (state.kind === "unauthorized") {
    return (
      <p role="alert">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (state.kind === "forbidden") {
    return <p role="alert">You do not have permission to view delivery work.</p>;
  }
  if (state.kind === "error") {
    return <p role="alert">Delivery workspace could not be loaded.</p>;
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,16rem)_1fr]" data-testid="operations-delivery-workspace">
      <section aria-labelledby="delivery-queue-heading">
        <h2 id="delivery-queue-heading" className="text-lg font-semibold">
          Accepted orders
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manual Dehradun delivery mode. Select an order to manage booking and tracking.
        </p>
        {state.items.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">No accepted orders in the queue.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {state.items.map((order) => (
              <li key={order.orderId}>
                <button
                  type="button"
                  className="w-full min-h-11 rounded border border-[var(--border-subtle)] px-3 py-2 text-left text-sm"
                  aria-pressed={state.selectedOrderId === order.orderId}
                  onClick={() => setState({ ...state, selectedOrderId: order.orderId })}
                >
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="block text-[var(--text-secondary)]">
                    {orderStatusLabel(order.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="delivery-detail-heading">
        <h2 id="delivery-detail-heading" className="text-lg font-semibold">
          Delivery actions
        </h2>
        {state.selectedOrderId ? (
          <>
            <p className="mt-1 text-sm">
              <Link
                href={`/workforce/operations/orders/detail/?orderId=${encodeURIComponent(state.selectedOrderId)}`}
                className="underline"
              >
                Open full order
              </Link>
            </p>
            <OperationsDeliveryPanel orderId={state.selectedOrderId} />
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Select an order to continue.</p>
        )}
      </section>
    </div>
  );
}
