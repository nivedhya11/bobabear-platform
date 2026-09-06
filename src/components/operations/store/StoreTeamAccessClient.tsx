"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  grantMembershipRole,
  listAdminMembershipsFiltered,
  listMembershipRoleAssignments,
  revokeRoleAssignment,
  transitionMembership,
  type AdministrationMembership,
} from "@/lib/administration/api";

import { StoreConfirmationDialog } from "./StoreConfirmationDialog";
import { useStoreOutlet } from "./StoreOutletContext";

type Assignment = Readonly<{
  id: string;
  roleKey: string;
  revokedAt: string | null;
}>;

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      membership: AdministrationMembership | null;
      assignments: readonly Assignment[];
      members: readonly AdministrationMembership[];
    }>;

type ConfirmAction =
  | Readonly<{ kind: "suspend" }>
  | Readonly<{ kind: "revoke_membership" }>
  | Readonly<{ kind: "revoke_role"; assignmentId: string; roleKey: string }>;

function membershipIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("membershipId");
}

function syncMembershipIdInUrl(next: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (next) {
    url.searchParams.set("membershipId", next);
  } else {
    url.searchParams.delete("membershipId");
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

const ROLE_LABELS: Readonly<Record<string, string>> = {
  outlet_manager: "Outlet manager",
  kitchen_operator: "Kitchen operator",
  delivery_coordinator: "Delivery coordinator",
  brand_admin: "Brand administrator",
};

function roleLabel(roleKey: string): string {
  return ROLE_LABELS[roleKey] ?? roleKey.replace(/_/g, " ");
}

function memberDisplayLabel(member: AdministrationMembership | null | undefined): string {
  if (!member) return "Workforce member";
  const label = typeof member.memberLabel === "string" ? member.memberLabel.trim() : "";
  if (label.length > 0) return label;
  return "Workforce member";
}

export function StoreTeamAccessClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canGrant = capabilities?.["access.role_assignment.grant"] === true;
  const canRevoke = capabilities?.["access.role_assignment.revoke"] === true;
  const canManageMembership = capabilities?.["access.membership.manage"] === true;
  const canReadAssignments = capabilities?.["access.role_assignment.read"] === true;
  const [membershipId, setMembershipId] = useState<string | null>(() => membershipIdFromLocation());
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [roleKey, setRoleKey] = useState("kitchen_operator");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const membersLoadKey = useMemo(
    () => `${outletId ?? ""}:${reloadToken}`,
    [outletId, reloadToken],
  );

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const listResult = await listAdminMembershipsFiltered(outletId);
      if (cancelled) return;
      if (!listResult.ok) {
        if (listResult.status === 401 || listResult.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        if (listResult.status === 403) {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Team access could not be loaded." });
        return;
      }
      const members = listResult.data.items;
      // Filtered outlet membership set is authoritative for Store Team Access.
      const selectedFromSet =
        membershipId !== null
          ? (members.find((member) => member.id === membershipId) ?? null)
          : null;
      const selected = selectedFromSet ?? members[0] ?? null;

      if (selected?.id !== membershipId) {
        // Correct stale/foreign membershipId, then let the next effect run fetch.
        setMembershipId(selected?.id ?? null);
        syncMembershipIdInUrl(selected?.id ?? null);
        return;
      }

      if (!selected) {
        setView({ kind: "ready", membership: null, assignments: [], members });
        setActionError(null);
        return;
      }

      let assignments: Assignment[] = [];
      if (canReadAssignments) {
        const assignmentsResult = await listMembershipRoleAssignments(selected.id);
        if (cancelled) return;
        if (assignmentsResult.ok) {
          assignments = (assignmentsResult.data.items as Assignment[]).map((item) => ({
            id: String(item.id),
            roleKey: String(item.roleKey),
            revokedAt: item.revokedAt ? String(item.revokedAt) : null,
          }));
        }
      }
      if (cancelled) return;
      // Intentionally do NOT fetch/display current-actor effective-permissions as the
      // target member's permissions (IMP-036E). Foreign membership detail is never fetched.
      setView({
        kind: "ready",
        membership: selected,
        assignments,
        members,
      });
      setActionError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [membersLoadKey, membershipId, canReadAssignments, staleOutletId, outletId]);

  function selectedBelongsToFilteredSet(): boolean {
    if (view.kind !== "ready" || !membershipId) return false;
    return view.members.some((member) => member.id === membershipId);
  }

  async function onGrant() {
    if (!membershipId || !canGrant || !selectedBelongsToFilteredSet()) return;
    setPending(true);
    setActionError(null);
    announce("Granting role…");
    const result = await grantMembershipRole(membershipId, roleKey);
    setPending(false);
    if (!result.ok) {
      const message = "Role could not be granted.";
      setActionError(message);
      announce(message);
      return;
    }
    announce("Role granted.");
    setReloadToken((n) => n + 1);
  }

  async function onRevokeRole(assignmentId: string) {
    if (!canRevoke || !selectedBelongsToFilteredSet()) return;
    setPending(true);
    setActionError(null);
    announce("Revoking role…");
    const result = await revokeRoleAssignment(assignmentId);
    setPending(false);
    if (!result.ok) {
      const message = "Role could not be revoked.";
      setActionError(message);
      announce(message);
      setConfirmAction(null);
      return;
    }
    announce("Role revoked.");
    setConfirmAction(null);
    setReloadToken((n) => n + 1);
  }

  async function onTransition(toStatus: string) {
    if (!membershipId || !canManageMembership || !selectedBelongsToFilteredSet()) return;
    setPending(true);
    setActionError(null);
    const result = await transitionMembership(membershipId, toStatus);
    setPending(false);
    if (!result.ok) {
      setActionError("Membership status could not be updated.");
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
    return <p aria-live="polite" data-testid="store-team-access-loading">Loading access…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-team-access-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-team-access-forbidden">
        You do not have permission to manage access for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <p role="alert" data-testid="store-team-access-error">
        {view.message}
      </p>
    );
  }

  const membership = view.membership;
  const label = memberDisplayLabel(membership);
  const hasMembership = Boolean(membership?.id);

  return (
    <div className="flex flex-col gap-4" data-testid="store-team-access">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--text-secondary)]">Team member</span>
        <select
          data-testid="store-team-access-select"
          value={membershipId ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            const allowed = view.members.some((member) => member.id === next);
            if (!allowed) return;
            setMembershipId(next);
            syncMembershipIdInUrl(next);
          }}
          className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
        >
          {view.members.length === 0 ? <option value="">No members</option> : null}
          {view.members.map((item) => (
            <option key={item.id} value={item.id}>
              {memberDisplayLabel(item)} ({item.status})
            </option>
          ))}
        </select>
      </label>

      {!hasMembership ? (
        <p data-testid="store-team-access-empty">No memberships available for this outlet.</p>
      ) : (
        <>
          <p className="text-sm" data-testid="store-team-access-member-label">
            {label} · Status: {String(membership!.status)}
          </p>

          {canManageMembership ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => void onTransition("active")}
              >
                Activate
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="store-team-access-suspend"
                disabled={pending}
                onClick={() => setConfirmAction({ kind: "suspend" })}
              >
                Suspend membership
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-testid="store-team-access-revoke-membership"
                disabled={pending}
                onClick={() => setConfirmAction({ kind: "revoke_membership" })}
              >
                Revoke membership
              </Button>
            </div>
          ) : null}

          <section aria-labelledby="store-team-roles-heading">
            <h2 id="store-team-roles-heading" className="text-lg font-semibold">
              Role assignments
            </h2>
            {view.assignments.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">No role assignments.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {view.assignments.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      {roleLabel(item.roleKey)}
                      {item.revokedAt ? " (revoked)" : ""}
                    </span>
                    {canRevoke && !item.revokedAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`store-team-access-revoke-role-${item.id}`}
                        disabled={pending}
                        onClick={() =>
                          setConfirmAction({
                            kind: "revoke_role",
                            assignmentId: item.id,
                            roleKey: item.roleKey,
                          })
                        }
                      >
                        Revoke role
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canGrant ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label htmlFor="store-team-role-key" className="text-sm">
                  Grant role
                </label>
                <select
                  id="store-team-role-key"
                  data-testid="store-team-role-key"
                  value={roleKey}
                  disabled={pending}
                  onChange={(event) => setRoleKey(event.target.value)}
                  className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-2"
                >
                  <option value="kitchen_operator">Kitchen operator</option>
                  <option value="delivery_coordinator">Delivery coordinator</option>
                  <option value="outlet_manager">Outlet manager</option>
                </select>
                <Button
                  type="button"
                  data-testid="store-team-grant"
                  disabled={pending}
                  onClick={() => void onGrant()}
                >
                  Grant
                </Button>
              </div>
            ) : null}
          </section>
        </>
      )}

      {actionError && !confirmAction ? (
        <p role="alert" data-testid="store-team-access-action-error" className="text-sm">
          {actionError}
        </p>
      ) : null}

      {confirmAction ? (
        <StoreConfirmationDialog
          title={
            confirmAction.kind === "suspend"
              ? `Suspend ${label}?`
              : confirmAction.kind === "revoke_membership"
                ? `Revoke ${label}?`
                : `Revoke role for ${label}?`
          }
          description={
            confirmAction.kind === "suspend"
              ? `${label} will lose active outlet access until reactivated.`
              : confirmAction.kind === "revoke_membership"
                ? `${label}'s membership for this outlet will be revoked.`
                : `${label} will lose the ${roleLabel(confirmAction.roleKey)} role on this outlet.`
          }
          confirmLabel={
            confirmAction.kind === "suspend"
              ? "Confirm suspend"
              : confirmAction.kind === "revoke_membership"
                ? "Confirm revoke"
                : "Confirm revoke role"
          }
          destructive={confirmAction.kind !== "suspend"}
          pending={pending}
          error={actionError}
          onConfirm={() => {
            if (confirmAction.kind === "suspend") {
              void onTransition("suspended");
            } else if (confirmAction.kind === "revoke_membership") {
              void onTransition("revoked");
            } else {
              void onRevokeRole(confirmAction.assignmentId);
            }
          }}
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
