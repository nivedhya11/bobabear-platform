"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createAdminMembership,
  listAdminMembershipsFiltered,
  transitionMembership,
  type AdministrationMembership,
} from "@/lib/administration/api";
import { appendOutletId } from "@/lib/operations/store-navigation";

import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly AdministrationMembership[] }>;

function membershipStatusLabel(status: string): string {
  if (status === "invited") return "Invited";
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  if (status === "revoked") return "Revoked";
  if (status === "expired") return "Expired";
  return status;
}

export function StoreTeamMembersClient() {
  const { outletId, selectedOutlet, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["access.membership.manage"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [workforceUserId, setWorkforceUserId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const result = await listAdminMembershipsFiltered(outletId);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (result.status === 403) {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Team members could not be loaded." });
        return;
      }
      setView({ kind: "ready", items: result.data.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  async function onCreate() {
    if (!selectedOutlet || !canManage) return;
    if (!selectedOutlet.brandId || !selectedOutlet.organizationId || !selectedOutlet.territoryId) {
      setActionError("Outlet hierarchy context is incomplete for creating a membership.");
      return;
    }
    const userId = workforceUserId.trim();
    if (!userId) {
      setActionError("Enter a workforce user id.");
      return;
    }
    setPending(true);
    setActionError(null);
    announce("Creating membership…");
    const result = await createAdminMembership({
      workforceUserId: userId,
      scopeType: "outlet",
      brandId: selectedOutlet.brandId,
      organizationId: selectedOutlet.organizationId,
      territoryId: selectedOutlet.territoryId,
      outletId: selectedOutlet.id,
      status: "invited",
    });
    setPending(false);
    if (!result.ok) {
      const message = "Membership could not be created.";
      setActionError(message);
      announce(message);
      return;
    }
    setWorkforceUserId("");
    announce("Membership created.");
    setReloadToken((n) => n + 1);
  }

  async function onTransition(membershipId: string, toStatus: string) {
    if (!canManage) return;
    setPending(true);
    setActionError(null);
    announce("Updating membership…");
    const result = await transitionMembership(membershipId, toStatus);
    setPending(false);
    if (!result.ok) {
      const message = "Membership status could not be updated.";
      setActionError(message);
      announce(message);
      return;
    }
    announce("Membership updated.");
    setReloadToken((n) => n + 1);
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return <p aria-live="polite" data-testid="store-team-loading">Loading team…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-team-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-team-forbidden">
        You do not have permission to view team members for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-team-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="store-team-members">
      {view.items.length === 0 ? (
        <p data-testid="store-team-empty" className="text-sm text-[var(--text-secondary)]">
          No memberships for this outlet yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {view.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{item.workforceUserId}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status: {membershipStatusLabel(item.status)} · Scope: outlet
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-11 items-center underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus)]"
                  href={appendOutletId(
                    `/workforce/operations/store/team/access/?membershipId=${encodeURIComponent(item.id)}`,
                    outletId,
                  )}
                >
                  Manage access
                </a>
                {canManage && item.status === "invited" ? (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void onTransition(item.id, "active")}
                  >
                    Activate
                  </Button>
                ) : null}
                {canManage && item.status === "active" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void onTransition(item.id, "suspended")}
                  >
                    Suspend
                  </Button>
                ) : null}
                {canManage && (item.status === "active" || item.status === "suspended") ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => void onTransition(item.id, "revoked")}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <h3 className="font-medium">Invite team member</h3>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-secondary)]">Workforce user id</span>
            <input
              data-testid="store-team-create-user"
              value={workforceUserId}
              disabled={pending}
              onChange={(event) => setWorkforceUserId(event.target.value)}
              className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
            />
          </label>
          <p className="text-sm text-[var(--text-secondary)]">
            Membership scope is fixed to this outlet.
          </p>
          <Button
            type="button"
            data-testid="store-team-create"
            disabled={pending}
            onClick={() => void onCreate()}
          >
            Create membership
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" data-testid="store-team-action-error" className="text-sm">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
