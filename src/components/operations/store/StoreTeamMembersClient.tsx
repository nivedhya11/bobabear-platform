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

import { StoreConfirmationDialog } from "./StoreConfirmationDialog";
import { useStoreOutlet } from "./StoreOutletContext";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready"; items: readonly AdministrationMembership[] }>;

type ConfirmAction = Readonly<{
  membershipId: string;
  memberLabel: string;
  toStatus: "suspended" | "revoked";
}>;

function membershipStatusLabel(status: string): string {
  if (status === "invited") return "Invited";
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  if (status === "revoked") return "Revoked";
  if (status === "expired") return "Expired";
  return status;
}

function memberDisplayLabel(item: AdministrationMembership): string {
  const label = typeof item.memberLabel === "string" ? item.memberLabel.trim() : "";
  if (label.length > 0) return label;
  return "Workforce member";
}

export function StoreTeamMembersClient() {
  const { outletId, selectedOutlet, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["access.membership.manage"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [workforceEmail, setWorkforceEmail] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
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
    const email = workforceEmail.trim();
    if (!email) {
      setActionError("Enter a workforce email.");
      return;
    }
    setPending(true);
    setActionError(null);
    announce("Creating membership…");
    const result = await createAdminMembership({
      workforceEmail: email,
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
    setWorkforceEmail("");
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
      setConfirmAction(null);
      return;
    }
    announce("Membership updated.");
    setConfirmAction(null);
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
          {view.items.map((item) => {
            const label = memberDisplayLabel(item);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium" data-testid={`store-team-member-label-${item.id}`}>
                    {label}
                  </p>
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
                      data-testid={`store-team-suspend-${item.id}`}
                      disabled={pending}
                      onClick={() =>
                        setConfirmAction({
                          membershipId: item.id,
                          memberLabel: label,
                          toStatus: "suspended",
                        })
                      }
                    >
                      Suspend
                    </Button>
                  ) : null}
                  {canManage && (item.status === "active" || item.status === "suspended") ? (
                    <Button
                      type="button"
                      variant="destructive"
                      data-testid={`store-team-revoke-${item.id}`}
                      disabled={pending}
                      onClick={() =>
                        setConfirmAction({
                          membershipId: item.id,
                          memberLabel: label,
                          toStatus: "revoked",
                        })
                      }
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <h3 className="font-medium">Invite team member</h3>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-secondary)]">Workforce email</span>
            <input
              data-testid="store-team-create-email"
              type="email"
              autoComplete="off"
              value={workforceEmail}
              disabled={pending}
              onChange={(event) => setWorkforceEmail(event.target.value)}
              className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]"
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

      {actionError && !confirmAction ? (
        <p role="alert" data-testid="store-team-action-error" className="text-sm">
          {actionError}
        </p>
      ) : null}

      {confirmAction ? (
        <StoreConfirmationDialog
          title={
            confirmAction.toStatus === "suspended"
              ? `Suspend ${confirmAction.memberLabel}?`
              : `Revoke ${confirmAction.memberLabel}?`
          }
          description={
            confirmAction.toStatus === "suspended"
              ? `${confirmAction.memberLabel} will lose active outlet access until reactivated.`
              : `${confirmAction.memberLabel}'s membership for this outlet will be revoked.`
          }
          confirmLabel={
            confirmAction.toStatus === "suspended" ? "Confirm suspend" : "Confirm revoke"
          }
          destructive={confirmAction.toStatus === "revoked"}
          pending={pending}
          error={actionError}
          onConfirm={() => void onTransition(confirmAction.membershipId, confirmAction.toStatus)}
          onDismiss={() => {
            if (pending) return;
            setConfirmAction(null);
            setActionError(null);
          }}
        />
      ) : null}
    </div>
  );
}
