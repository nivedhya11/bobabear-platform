"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useStepUpMutation } from "@/components/workforce/useStepUpMutation";
import {
  createAdminMembership,
  listAdministrationMembershipsClient,
  type AdministrationMembership,
} from "@/lib/administration/api";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      items: AdministrationMembership[];
      more: boolean;
      nextCursor: string | null;
      notice: string | null;
    }>;

function membershipTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "invited") return "info" as const;
  if (status === "suspended") return "warning" as const;
  if (status === "revoked" || status === "expired") return "danger" as const;
  return "neutral" as const;
}

export function AdministrationMembershipsClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [form, setForm] = useState({
    workforceEmail: "",
    scopeType: "outlet",
    brandId: "",
    organizationId: "",
    territoryId: "",
    outletId: "",
    status: "invited",
  });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { runWithStepUp, dialog: stepUpDialog } = useStepUpMutation();

  const load = useCallback(async (cursor?: string, append = false) => {
    if (!append) setView({ kind: "loading" });
    const result = await listAdministrationMembershipsClient({ cursor });
    if (!result.ok) {
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setView({ kind: "unauthorized" });
        return;
      }
      if (result.status === 403) {
        setView({ kind: "forbidden" });
        return;
      }
      setView({ kind: "error", message: "Memberships could not be loaded." });
      return;
    }
    setView((prev) => {
      const prior = append && prev.kind === "ready" ? prev.items : [];
      return {
        kind: "ready",
        items: [...prior, ...result.data.items],
        more: result.data.more,
        nextCursor: result.data.nextCursor,
        notice: append && prev.kind === "ready" ? prev.notice : null,
      };
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  async function onCreate() {
    setBusy(true);
    setActionError(null);
    const result = await runWithStepUp("CLASS_ACCESS_MUTATION", (proofId) => {
      const body = {
        workforceEmail: form.workforceEmail,
        scopeType: form.scopeType,
        brandId: form.brandId || undefined,
        organizationId: form.organizationId || undefined,
        territoryId: form.territoryId || undefined,
        outletId: form.outletId || undefined,
        status: form.status,
      };
      return proofId
        ? createAdminMembership(body, { stepUpProofId: proofId })
        : createAdminMembership(body);
    });
    setBusy(false);
    if (!result.ok) {
      setActionError(result.code);
      return;
    }
    await load();
    setView((prev) =>
      prev.kind === "ready" ? { ...prev, notice: "Membership created." } : prev,
    );
  }

  if (view.kind === "loading") {
    return <LoadingState label="Loading workforce memberships…" />;
  }
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-memberships-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return <p data-testid="admin-memberships-forbidden">Not authorized to read memberships.</p>;
  }
  if (view.kind === "error") {
    return <p data-testid="admin-memberships-error">{view.message}</p>;
  }

  return (
    <div data-testid="admin-memberships" className="space-y-6">
      <PageHeader
        title="Workforce"
        description="Create and manage workforce memberships within your authorized scopes."
      />
      {view.notice ? (
        <Alert tone="success" title="Saved">
          {view.notice}
        </Alert>
      ) : null}
      {actionError ? (
        <Alert tone="danger" title="Create failed">
          {actionError}
        </Alert>
      ) : null}

      <section className="space-y-3" aria-labelledby="membership-create-heading">
        <h2 id="membership-create-heading" className="text-lg font-medium">
          Create membership
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm" htmlFor="membership-email">
            Workforce email
            <input
              id="membership-email"
              className="mt-1 w-full border px-2 py-1"
              value={form.workforceEmail}
              onChange={(event) => setForm({ ...form, workforceEmail: event.target.value })}
            />
          </label>
          <label className="text-sm" htmlFor="membership-scope">
            Scope type
            <select
              id="membership-scope"
              className="mt-1 w-full border px-2 py-1"
              value={form.scopeType}
              onChange={(event) => setForm({ ...form, scopeType: event.target.value })}
            >
              <option value="platform">platform</option>
              <option value="brand">brand</option>
              <option value="organization">organization</option>
              <option value="territory">territory</option>
              <option value="outlet">outlet</option>
            </select>
          </label>
          <label className="text-sm" htmlFor="membership-brand">
            Brand ID
            <input
              id="membership-brand"
              className="mt-1 w-full border px-2 py-1"
              value={form.brandId}
              onChange={(event) => setForm({ ...form, brandId: event.target.value })}
            />
          </label>
          <label className="text-sm" htmlFor="membership-org">
            Organization ID
            <input
              id="membership-org"
              className="mt-1 w-full border px-2 py-1"
              value={form.organizationId}
              onChange={(event) => setForm({ ...form, organizationId: event.target.value })}
            />
          </label>
          <label className="text-sm" htmlFor="membership-terr">
            Territory ID
            <input
              id="membership-terr"
              className="mt-1 w-full border px-2 py-1"
              value={form.territoryId}
              onChange={(event) => setForm({ ...form, territoryId: event.target.value })}
            />
          </label>
          <label className="text-sm" htmlFor="membership-outlet">
            Outlet ID
            <input
              id="membership-outlet"
              className="mt-1 w-full border px-2 py-1"
              value={form.outletId}
              onChange={(event) => setForm({ ...form, outletId: event.target.value })}
            />
          </label>
        </div>
        <Button type="button" disabled={busy} onClick={() => void onCreate()}>
          Create membership
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="membership-list-heading">
        <h2 id="membership-list-heading" className="text-lg font-medium">
          Memberships
        </h2>
        {view.items.length === 0 ? (
          <p data-testid="admin-memberships-empty">No memberships in scope.</p>
        ) : (
          <ul className="space-y-2">
            {view.items.map((membership) => (
              <li
                key={membership.id}
                className="flex flex-col gap-2 rounded border border-[var(--enterprise-border,#D6C39A)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{membership.memberLabel}</p>
                  <p className="text-sm">
                    {membership.scopeType} · {membership.workforceUserId}
                  </p>
                  <StatusBadge tone={membershipTone(membership.status)}>
                    {membership.status}
                  </StatusBadge>
                </div>
                <Button asChild variant="secondary">
                  <a
                    href={`/workforce/admin/memberships/detail/?membershipId=${encodeURIComponent(membership.id)}`}
                  >
                    Open
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {view.more && view.nextCursor ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void load(view.nextCursor!, true)}
          >
            Load more
          </Button>
        ) : null}
      </section>
      {stepUpDialog}
    </div>
  );
}
