"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminConfirmDialog } from "@/components/administration/AdminConfirmDialog";
import { Alert } from "@/components/enterprise/Alert";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { Button } from "@/components/ui/Button";
import {
  createAdministrationResource,
  listAdministrationResourceClient,
  updateAdministrationResource,
  type AdministrationResource,
} from "@/lib/administration/api";

type ResourceKind = "brands" | "organizations" | "territories" | "legal-entities" | "outlets";

const KINDS: ReadonlyArray<{ kind: ResourceKind; label: string }> = [
  { kind: "brands", label: "Brands" },
  { kind: "organizations", label: "Organizations" },
  { kind: "territories", label: "Territories" },
  { kind: "legal-entities", label: "Legal entities" },
  { kind: "outlets", label: "Outlets" },
];

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      items: AdministrationResource[];
      more: boolean;
      nextCursor: string | null;
      notice: string | null;
    }>;

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "inactive") return "warning" as const;
  return "neutral" as const;
}

export function AdministrationResourcesClient() {
  const [resourceKind, setResourceKind] = useState<ResourceKind>("brands");
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    brandId: "",
    organizationId: "",
    territoryId: "",
    legalEntityId: "",
  });
  const [editName, setEditName] = useState("");
  const [selected, setSelected] = useState<AdministrationResource | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<AdministrationResource | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (!append) setView({ kind: "loading" });
      const result = await listAdministrationResourceClient(resourceKind, { cursor });
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403) {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Organization resources could not be loaded." });
        return;
      }
      setView((prev) => {
        const priorItems =
          append && prev.kind === "ready" ? prev.items : ([] as AdministrationResource[]);
        return {
          kind: "ready",
          items: [...priorItems, ...result.data.items],
          more: result.data.more,
          nextCursor: result.data.nextCursor,
          notice: append && prev.kind === "ready" ? prev.notice : null,
        };
      });
    },
    [resourceKind],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void load();
  }, [load]);

  async function onCreate() {
    setBusy(true);
    setActionError(null);
    const body: Record<string, unknown> = {
      code: createForm.code,
      name: createForm.name,
    };
    if (resourceKind !== "brands") body.brandId = createForm.brandId;
    if (resourceKind === "legal-entities" || resourceKind === "outlets") {
      body.organizationId = createForm.organizationId;
    }
    if (resourceKind === "outlets") {
      body.territoryId = createForm.territoryId;
      body.legalEntityId = createForm.legalEntityId;
    }
    const result = await createAdministrationResource(resourceKind, body);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.code);
      return;
    }
    setCreateForm({
      code: "",
      name: "",
      brandId: "",
      organizationId: "",
      territoryId: "",
      legalEntityId: "",
    });
    await load();
    setView((prev) =>
      prev.kind === "ready" ? { ...prev, notice: "Resource created." } : prev,
    );
  }

  async function onUpdate() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    const result = await updateAdministrationResource(resourceKind, selected.id, {
      name: editName || selected.name,
      expectedRevision: selected.revision ?? "1",
    });
    setBusy(false);
    if (!result.ok) {
      if (result.code === "ADMIN_CONFLICT") {
        setActionError("Stale revision — reload the resource and retry.");
        await load();
        return;
      }
      setActionError(result.code);
      return;
    }
    setSelected(result.data.item);
    setEditName(result.data.item.name);
    await load();
    setView((prev) =>
      prev.kind === "ready" ? { ...prev, notice: "Resource updated." } : prev,
    );
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) return;
    setBusy(true);
    setActionError(null);
    const result = await updateAdministrationResource(resourceKind, pendingDeactivate.id, {
      status: "inactive",
      expectedRevision: pendingDeactivate.revision ?? "1",
    });
    setBusy(false);
    if (!result.ok) {
      if (result.code === "ADMIN_CONFLICT") {
        setActionError("Stale revision — reload and retry deactivate.");
        setPendingDeactivate(null);
        await load();
        return;
      }
      setActionError(result.code);
      return;
    }
    setPendingDeactivate(null);
    await load();
    setView((prev) =>
      prev.kind === "ready" ? { ...prev, notice: "Resource deactivated." } : prev,
    );
  }

  if (view.kind === "loading") return <LoadingState label="Loading organization…" />;
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-resources-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p data-testid="admin-resources-forbidden">
        You are not authorized to read organization resources in scope.
      </p>
    );
  }
  if (view.kind === "error") {
    return <ErrorState message={view.message} onRetry={() => void load()} />;
  }

  return (
    <div data-testid="admin-resources" className="space-y-6">
      <PageHeader
        title="Organization"
        description="Browse and maintain brands, organizations, territories, legal entities, and outlets."
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Resource type">
        {KINDS.map((entry) => (
          <Button
            key={entry.kind}
            type="button"
            variant={resourceKind === entry.kind ? "primary" : "secondary"}
            onClick={() => {
              setResourceKind(entry.kind);
              setSelected(null);
            }}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {view.notice ? (
        <Alert tone="success" title="Saved">
          {view.notice}
        </Alert>
      ) : null}
      {actionError ? (
        <Alert tone="danger" title="Action failed">
          {actionError}
        </Alert>
      ) : null}

      <section className="space-y-3" aria-labelledby="org-list-heading">
        <h2 id="org-list-heading" className="text-lg font-medium">
          {KINDS.find((k) => k.kind === resourceKind)?.label}
        </h2>
        {view.items.length === 0 ? (
          <p data-testid="admin-resources-empty">No resources visible in your scope.</p>
        ) : (
          <ul className="space-y-2">
            {view.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded border border-[var(--enterprise-border,#D6C39A)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {item.code} — {item.name}
                  </p>
                  <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                  <span className="ml-2 text-xs text-[var(--enterprise-text-secondary,#5C4B24)]">
                    rev {String(item.revision ?? "1")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSelected(item);
                      setEditName(item.name);
                    }}
                  >
                    Edit
                  </Button>
                  {item.status === "active" ? (
                    <Button type="button" onClick={() => setPendingDeactivate(item)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void updateAdministrationResource(resourceKind, item.id, {
                          status: "active",
                          expectedRevision: item.revision ?? "1",
                        }).then((result) => {
                          if (!result.ok) {
                            setActionError(
                              result.code === "ADMIN_CONFLICT"
                                ? "Stale revision — reload and retry."
                                : result.code,
                            );
                            return load();
                          }
                          return load();
                        })
                      }
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {view.more && view.nextCursor ? (
          <Button type="button" variant="secondary" onClick={() => void load(view.nextCursor!, true)}>
            Load more
          </Button>
        ) : null}
      </section>

      {selected ? (
        <section className="space-y-3" aria-labelledby="org-edit-heading">
          <h2 id="org-edit-heading" className="text-lg font-medium">
            Update {selected.code}
          </h2>
          <label className="block text-sm" htmlFor="org-edit-name">
            Name
            <input
              id="org-edit-name"
              className="mt-1 w-full border px-2 py-1"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void onUpdate()}>
            Save update
          </Button>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="org-create-heading">
        <h2 id="org-create-heading" className="text-lg font-medium">
          Create
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm" htmlFor="org-create-code">
            Code
            <input
              id="org-create-code"
              className="mt-1 w-full border px-2 py-1"
              value={createForm.code}
              onChange={(event) => setCreateForm({ ...createForm, code: event.target.value })}
            />
          </label>
          <label className="text-sm" htmlFor="org-create-name">
            Name
            <input
              id="org-create-name"
              className="mt-1 w-full border px-2 py-1"
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
            />
          </label>
          {resourceKind !== "brands" ? (
            <label className="text-sm" htmlFor="org-create-brand">
              Brand ID
              <input
                id="org-create-brand"
                className="mt-1 w-full border px-2 py-1"
                value={createForm.brandId}
                onChange={(event) => setCreateForm({ ...createForm, brandId: event.target.value })}
              />
            </label>
          ) : null}
          {resourceKind === "legal-entities" || resourceKind === "outlets" ? (
            <label className="text-sm" htmlFor="org-create-org">
              Organization ID
              <input
                id="org-create-org"
                className="mt-1 w-full border px-2 py-1"
                value={createForm.organizationId}
                onChange={(event) =>
                  setCreateForm({ ...createForm, organizationId: event.target.value })
                }
              />
            </label>
          ) : null}
          {resourceKind === "outlets" ? (
            <>
              <label className="text-sm" htmlFor="org-create-terr">
                Territory ID
                <input
                  id="org-create-terr"
                  className="mt-1 w-full border px-2 py-1"
                  value={createForm.territoryId}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, territoryId: event.target.value })
                  }
                />
              </label>
              <label className="text-sm" htmlFor="org-create-le">
                Legal entity ID
                <input
                  id="org-create-le"
                  className="mt-1 w-full border px-2 py-1"
                  value={createForm.legalEntityId}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, legalEntityId: event.target.value })
                  }
                />
              </label>
            </>
          ) : null}
        </div>
        <Button type="button" disabled={busy} onClick={() => void onCreate()}>
          Create
        </Button>
      </section>

      <AdminConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate resource"
        targetLabel={
          pendingDeactivate
            ? `${pendingDeactivate.code} — ${pendingDeactivate.name}`
            : ""
        }
        scopeLabel={resourceKind}
        consequenceLabel="Soft-deactivate only. Hard delete is not available. Dependent browse surfaces may hide this resource."
        confirmLabel="Deactivate"
        busy={busy}
        error={actionError}
        onCancel={() => {
          if (!busy) setPendingDeactivate(null);
        }}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
