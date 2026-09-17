"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { Button } from "@/components/ui/Button";
import { getOperationalStatus } from "@/lib/operations/operational-status";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      service: string;
      uptimeSeconds: number;
    }>;

export function AdministrationSystemClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  const loadStatus = useCallback(async (cancelled: () => boolean) => {
    setView({ kind: "loading" });
    const result = await getOperationalStatus();
    if (cancelled()) return;
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setView({ kind: "unauthorized" });
        return;
      }
      if (result.status === 403 || result.code === "ORDER_UNAUTHORIZED") {
        setView({ kind: "forbidden" });
        return;
      }
      setView({ kind: "error", message: "Operational status could not be loaded." });
      return;
    }
    setView({
      kind: "ready",
      service: result.data.service,
      uptimeSeconds: result.data.uptimeSeconds,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadStatus(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadStatus, reloadToken]);

  const retry = () => setReloadToken((token) => token + 1);
  const opsAuthorized = view.kind === "ready";

  return (
    <div data-testid="admin-system" className="space-y-6">
      <PageHeader
        title="System"
        description="Compose Ops operational status and hand off to Operations. Admin is not an Ops workflow engine."
      />
      {view.kind === "loading" ? <LoadingState label="Loading operational status…" /> : null}
      {view.kind === "unauthorized" ? (
        <Alert tone="warning" title="Sign-in required">
          Workforce sign-in is required to inspect operational status.
        </Alert>
      ) : null}
      {view.kind === "forbidden" ? (
        <Alert tone="warning" title="Operational status unavailable">
          order.read is required for Ops operational-status. No fabricated healthy status is shown.
        </Alert>
      ) : null}
      {view.kind === "error" ? (
        <Alert tone="danger" title="Status error">
          {view.message}
        </Alert>
      ) : null}
      {view.kind === "ready" ? (
        <div className="space-y-2 text-sm">
          <p>
            Service: <strong>{view.service}</strong>
          </p>
          <p>Uptime seconds: {view.uptimeSeconds}</p>
          <p>Source: GET /api/operations/v1/operational-status (Ops-owned).</p>
        </div>
      ) : null}
      {view.kind === "error" || view.kind === "ready" ? (
        <Button type="button" variant="secondary" data-testid="admin-system-retry" onClick={retry}>
          {view.kind === "error" ? "Retry status" : "Reload status"}
        </Button>
      ) : null}
      {opsAuthorized ? (
        <Button asChild data-testid="admin-open-operations">
          <a href="/workforce/operations/">Open Operations</a>
        </Button>
      ) : view.kind !== "loading" ? (
        <p className="text-sm text-[var(--enterprise-text-secondary,#5C4B24)]" data-testid="admin-open-operations-unavailable">
          Open Operations is unavailable until Ops operational-status authorization succeeds.
        </p>
      ) : null}
    </div>
  );
}
