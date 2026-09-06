"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { listWorkforceOrders } from "@/lib/operations/orders";
import { getOperationalStatus } from "@/lib/operations/operational-status";
import type { OperationsOrderSummary } from "@/lib/operations/types";

type TodayState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      actionable: readonly OperationsOrderSummary[];
      outletName: string | null;
      serviceLabel: string;
      uptimeSeconds: number | null;
    }>;

function ageLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function OperationsTodayClient() {
  const [state, setState] = useState<TodayState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [ordersResult, statusResult] = await Promise.all([
        listWorkforceOrders({ limit: 50 }),
        getOperationalStatus(),
      ]);
      if (cancelled) return;
      if (!ordersResult.ok) {
        if (ordersResult.status === 401 || ordersResult.code === "WORKFORCE_AUTH_REQUIRED") {
          setState({ kind: "unauthorized" });
          return;
        }
        setState({ kind: "error", message: "Today could not be loaded." });
        return;
      }
      const actionable = ordersResult.data.items.filter(
        (item) => item.status === "PLACED" || item.status === "ACCEPTED",
      );
      const outletName = ordersResult.data.items[0]?.outlet?.name ?? null;
      setState({
        kind: "ready",
        actionable,
        outletName,
        serviceLabel:
          statusResult.ok && typeof statusResult.data.service === "string"
            ? statusResult.data.service
            : "Operations",
        uptimeSeconds: statusResult.ok ? statusResult.data.uptimeSeconds : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <p aria-live="polite">Loading today’s work…</p>;
  }
  if (state.kind === "unauthorized") {
    return (
      <p role="alert">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (state.kind === "error") {
    return <p role="alert">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-8" data-testid="operations-today">
      <section aria-labelledby="today-context-heading">
        <h2 id="today-context-heading" className="text-lg font-semibold">
          Current context
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-secondary)]">Store</dt>
            <dd>{state.outletName ?? "Authorized outlet context from live orders"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Operations service</dt>
            <dd>
              {state.serviceLabel}
              {state.uptimeSeconds !== null ? ` · up ${Math.floor(state.uptimeSeconds / 60)} min` : ""}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="today-actionable-heading">
        <h2 id="today-actionable-heading" className="text-lg font-semibold">
          Orders needing attention
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Only open placed and accepted orders are shown. No invented sales or performance metrics.
        </p>
        {state.actionable.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">No open orders right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
            {state.actionable.map((order) => (
              <li key={order.orderId} className="py-3">
                <Link
                  href={`/workforce/operations/orders/detail/?orderId=${encodeURIComponent(order.orderId)}`}
                  className="flex flex-col gap-1 focus-visible:outline focus-visible:outline-2"
                >
                  <span className="font-semibold">
                    {order.orderNumber} · {orderStatusLabel(order.status)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Age {ageLabel(order.createdAt)} · {formatPaise(order.money.grandTotalMinor)}
                    {order.outlet?.name ? ` · ${order.outlet.name}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
