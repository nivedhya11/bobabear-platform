"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { listWorkforceOrders } from "@/lib/operations/orders";
import type { OperationsOrderSummary } from "@/lib/operations/types";
import { WORKFORCE_ORDER_STATUSES } from "@/lib/operations/types";
import { cn } from "@/lib/utils";

type ListFilters = Readonly<{
  status: string;
  orderNumber: string;
}>;

const EMPTY_FILTERS: ListFilters = Object.freeze({ status: "", orderNumber: "" });

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly OperationsOrderSummary[]; nextCursor: string | null }>;

function filtersToQuery(filters: ListFilters): { status?: string; orderNumber?: string } {
  return {
    ...(filters.status.length > 0 ? { status: filters.status } : {}),
    ...(filters.orderNumber.trim().length > 0 ? { orderNumber: filters.orderNumber.trim() } : {}),
  };
}

function genericErrorMessage(code: string): string {
  if (code === "NETWORK_ERROR") return "A network problem prevented loading orders. Try again.";
  if (code === "INVALID_RESPONSE") return "The order list could not be loaded. Try again.";
  return "The order list could not be loaded. Try again.";
}

export function OperationsOrderListClient() {
  const statusFilterId = useId();
  const orderNumberFilterId = useId();
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading orders…");

  const fetchFirstPage = useCallback(async (activeFilters: ListFilters) => {
    setView({ kind: "loading" });
    setStatusMessage("Loading orders…");
    const result = await listWorkforceOrders(filtersToQuery(activeFilters));
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setView({ kind: "unauthorized" });
        setStatusMessage("Sign in required.");
        return;
      }
      const message = genericErrorMessage(result.code);
      setView({ kind: "error", message });
      setStatusMessage(message);
      return;
    }
    setView({
      kind: "ready",
      items: result.data.items,
      nextCursor: result.data.nextCursor,
    });
    setStatusMessage(
      result.data.items.length === 0 ? "No orders found." : `${result.data.items.length} orders loaded.`,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listWorkforceOrders(filtersToQuery(EMPTY_FILTERS));
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          setStatusMessage("Sign in required.");
          return;
        }
        const message = genericErrorMessage(result.code);
        setView({ kind: "error", message });
        setStatusMessage(message);
        return;
      }
      setView({
        kind: "ready",
        items: result.data.items,
        nextCursor: result.data.nextCursor,
      });
      setStatusMessage(
        result.data.items.length === 0 ? "No orders found." : `${result.data.items.length} orders loaded.`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = () => {
    void fetchFirstPage(filters);
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void fetchFirstPage(filters);
  };

  const handleLoadMore = async () => {
    if (view.kind !== "ready" || !view.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setStatusMessage("Loading more orders…");
    const result = await listWorkforceOrders({
      ...filtersToQuery(filters),
      cursor: view.nextCursor,
    });
    setLoadingMore(false);
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setView({ kind: "unauthorized" });
        setStatusMessage("Sign in required.");
        return;
      }
      const message = genericErrorMessage(result.code);
      setView({ kind: "error", message });
      setStatusMessage(message);
      return;
    }
    setView({
      kind: "ready",
      items: [...view.items, ...result.data.items],
      nextCursor: result.data.nextCursor,
    });
    setStatusMessage(`${view.items.length + result.data.items.length} orders loaded.`);
  };

  const items = view.kind === "ready" ? view.items : [];
  const nextCursor = view.kind === "ready" ? view.nextCursor : null;
  const isLoading = view.kind === "loading";

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[960px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Boba Bear · Workforce Operations
            </p>
            <h1 className="font-display text-[clamp(32px,7vw,52px)] leading-[0.95] text-[var(--text-primary)]">
              Orders
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleRefresh}
            disabled={isLoading || loadingMore}
            aria-busy={isLoading}
          >
            Refresh
          </Button>
        </header>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          onSubmit={handleFilterSubmit}
          aria-label="Order filters"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={statusFilterId} className="font-body text-[13px] text-[var(--text-secondary)]">
              Status
            </label>
            <select
              id={statusFilterId}
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className={cn(
                "h-11 px-3 rounded-sm w-full",
                "bg-transparent text-[var(--text-primary)]",
                "border border-[var(--border-strong)]",
                "font-body text-[14px]",
                "focus:border-[var(--interactive-secondary)] focus:outline-none",
                "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
              )}
            >
              <option value="">All statuses</option>
              {WORKFORCE_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={orderNumberFilterId} className="font-body text-[13px] text-[var(--text-secondary)]">
              Order number
            </label>
            <input
              id={orderNumberFilterId}
              type="search"
              value={filters.orderNumber}
              onChange={(event) => setFilters((current) => ({ ...current, orderNumber: event.target.value }))}
              autoComplete="off"
              className={cn(
                "h-11 px-3 rounded-sm w-full",
                "bg-transparent text-[var(--text-primary)]",
                "border border-[var(--border-strong)]",
                "font-body text-[14px]",
                "placeholder:text-[var(--text-tertiary)]",
                "focus:border-[var(--interactive-secondary)] focus:outline-none",
                "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
              )}
              placeholder="ORD-…"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="md" disabled={isLoading || loadingMore}>
              Apply filters
            </Button>
          </div>
        </form>

        {view.kind === "unauthorized" ? (
          <section
            role="alert"
            data-testid="operations-unauthorized"
            className="border border-[var(--border-subtle)] p-5 flex flex-col gap-4"
          >
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Sign in with your workforce account to view operations orders.
            </p>
            <Button asChild variant="primary">
              <a href="/workforce/login/">Workforce sign in</a>
            </Button>
          </section>
        ) : null}

        {view.kind === "error" ? (
          <section
            role="alert"
            data-testid="operations-error"
            className="border border-[var(--border-subtle)] p-5 flex flex-col gap-4"
          >
            <p className="font-body text-[15px] text-[var(--text-secondary)]">{view.message}</p>
            <Button type="button" variant="secondary" onClick={handleRefresh}>
              Try again
            </Button>
          </section>
        ) : null}

        {isLoading ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]" data-testid="operations-loading">
            Loading orders…
          </p>
        ) : null}

        {!isLoading && view.kind === "ready" && items.length === 0 ? (
          <div className="flex flex-col gap-3" data-testid="operations-empty">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">No orders match the current filters.</p>
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto" data-testid="operations-table">
              <table className="w-full border-collapse font-body text-[14px]">
                <caption className="sr-only">Operations order list</caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left">
                    <th scope="col" className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      Order
                    </th>
                    <th scope="col" className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      Status
                    </th>
                    <th scope="col" className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      Outlet
                    </th>
                    <th scope="col" className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      Created
                    </th>
                    <th scope="col" className="py-3 font-semibold text-[var(--text-primary)]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((order) => (
                    <tr key={order.orderId} className="border-b border-[var(--border-subtle)]">
                      <td className="py-3 pr-4 text-[var(--text-primary)]">
                        <a
                          href={`/workforce/operations/orders/detail/?orderId=${encodeURIComponent(order.orderId)}`}
                          className="focus:outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
                          aria-label={`View details for order ${order.orderNumber}`}
                        >
                          {order.orderNumber}
                        </a>
                      </td>
                      <td className="py-3 pr-4" data-testid={`order-status-${order.orderId}`}>
                        {orderStatusLabel(order.status)}
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">{order.outlet.name}</td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3">{formatPaise(order.money.grandTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden flex flex-col gap-4" data-testid="operations-list">
              {items.map((order) => (
                <li
                  key={order.orderId}
                  className="border border-[var(--border-subtle)] p-4 flex flex-col gap-2"
                >
                  <a
                    href={`/workforce/operations/orders/detail/?orderId=${encodeURIComponent(order.orderId)}`}
                    className="font-body text-[15px] font-semibold text-[var(--text-primary)] focus:outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
                    aria-label={`View details for order ${order.orderNumber}`}
                  >
                    {order.orderNumber}
                  </a>
                  <p className="font-body text-[13px] text-[var(--text-secondary)]">
                    {order.outlet.name}
                  </p>
                  <p className="font-body text-[13px] text-[var(--text-secondary)]">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                  </p>
                  <p className="font-body text-[14px]">{formatPaise(order.money.grandTotalMinor)}</p>
                  <p>{orderStatusLabel(order.status)}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {!isLoading && nextCursor ? (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              aria-busy={loadingMore}
              data-testid="operations-load-more"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
