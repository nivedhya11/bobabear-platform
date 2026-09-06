"use client";

import { useEffect, useState } from "react";

import {
  getOperationalStatus,
  type OperationsOperationalStatus,
} from "@/lib/operations/operational-status";

type StatusState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{ kind: "ready"; status: OperationsOperationalStatus }>;

function workerSummary(workers: unknown): string {
  if (!Array.isArray(workers) || workers.length === 0) return "No background workers reported.";
  return workers
    .map((worker) => {
      if (typeof worker !== "object" || worker === null) return "Worker";
      const record = worker as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "Worker";
      const healthy = record.healthy === true ? "healthy" : "attention needed";
      return `${name}: ${healthy}`;
    })
    .join("; ");
}

export function OperationsStatusClient() {
  const [state, setState] = useState<StatusState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getOperationalStatus();
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
      setState({ kind: "ready", status: result.data });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <p aria-live="polite">Loading operational status…</p>;
  if (state.kind === "unauthorized") {
    return (
      <p role="alert">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (state.kind === "forbidden") {
    return <p role="alert">You do not have permission to view operational status.</p>;
  }
  if (state.kind === "error") {
    return <p role="alert">Operational status could not be loaded.</p>;
  }

  const uptimeMinutes = Math.floor(state.status.uptimeSeconds / 60);

  return (
    <div className="flex flex-col gap-6" data-testid="operations-status">
      <section aria-labelledby="status-summary-heading">
        <h2 id="status-summary-heading" className="text-lg font-semibold">
          Service health
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-secondary)]">Service</dt>
            <dd>{state.status.service}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Uptime</dt>
            <dd>{uptimeMinutes} minutes</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--text-secondary)]">Workers</dt>
            <dd>{workerSummary(state.status.workers)}</dd>
          </div>
        </dl>
      </section>
      <p className="text-sm text-[var(--text-secondary)]">
        This view shows safe operational context only. Secrets and internal stack traces are never
        exposed here.
      </p>
    </div>
  );
}
