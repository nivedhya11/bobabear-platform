"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  getAdminMembership,
  grantMembershipRole,
  listAdminMembershipsFiltered,
  listMembershipRoleAssignments,
  revokeRoleAssignment,
  transitionMembership,
  type AdministrationMembership,
} from "@/lib/administration/api";

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
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      membership: AdministrationMembership | Record<string, unknown>;
      assignments: readonly Assignment[];
      members: readonly AdministrationMembership[];
    }>;

function membershipIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("membershipId");
}

function roleLabel(roleKey: string): string {
  if (roleKey === "outlet_manager") return "Outlet manager";
  if (roleKey === "kitchen_operator") return "Kitchen operator";
  if (roleKey === "delivery_coordinator") return "Delivery coordinator";
  if (roleKey === "brand_admin") return "Brand administrator";
  return roleKey.replace(/_/g, " ");
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
      const selectedId = membershipId ?? members[0]?.id ?? null;
      if (!selectedId) {
        setView({ kind: "ready", membership: {}, assignments: [], members });
        return;
      }
      if (!membershipId && members[0]) {
        setMembershipId(members[0].id);
      }
      const membershipResult = await getAdminMembership(selectedId);
      if (cancelled) return;
      if (!membershipResult.ok) {
        if (membershipResult.status === 401) {
          setView({ kind: "unauthorized" });
          return;
        }
        if (membershipResult.status === 403) {
          setView({ kind: "forbidden" });
          return;
        }
        setView({ kind: "error", message: "Membership could not be loaded." });
        return;
      }
      let assignments: Assignment[] = [];
      if (canReadAssignments) {
        const assignmentsResult = await listMembershipRoleAssignments(selectedId);
        if (assignmentsResult.ok) {
          assignments = (assignmentsResult.data.items as Assignment[]).map((item) => ({
            id: String(item.id),
            roleKey: String(item.roleKey),
            revokedAt: item.revokedAt ? String(item.revokedAt) : null,
          }));
        }
      }
      // Intentionally do NOT fetch/display current-actor effective-permissions as the
      // target member's permissions (IMP-036E).
      setView({
        kind: "ready",
        membership: membershipResult.data.membership as AdministrationMembership,
        assignments,
        members,
      });
      setActionError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [membersLoadKey, membershipId, canReadAssignments, staleOutletId, outletId]);

  async function onGrant() {
    if (!membershipId || !canGrant) return;
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

  async function onRevoke(assignmentId: string) {
    if (!canRevoke) return;
    setPending(true);
    setActionError(null);
    announce("Revoking role…");
    const result = await revokeRoleAssignment(assignmentId);
    setPending(false);
    if (!result.ok) {
      const message = "Role could not be revoked.";
      setActionError(message);
      announce(message);
      return;
    }
    announce("Role revoked.");
    setReloadToken((n) => n + 1);
  }

  async function onTransition(toStatus: string) {
    if (!membershipId || !canManageMembership) return;
    setPending(true);
    setActionError(null);
    const result = await transitionMembership(membershipId, toStatus);
    setPending(false);
    if (!result.ok) {
      setActionError("Membership status could not be updated.");
      return;
    }
    announce("Membership updated.");
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
  if (view.kind === "missing") {
    return <p data-testid="store-team-access-missing">Select a team member to manage access.</p>;
  }

  const membership = view.membership as AdministrationMembership;
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
            setMembershipId(next);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("membershipId", next);
              window.history.replaceState({}, "", `${url.pathname}${url.search}`);
            }
          }}
          className="min-h-11 rounded-sm border border-[var(--border-strong)] bg-transparent px-3 outline-none focus:shadow-[0_0_0_3px_var(--focus-ring)]"
        >
          {view.members.length === 0 ? <option value="">No members</option> : null}
          {view.members.map((item) => (
            <option key={item.id} value={item.id}>
              {item.workforceUserId} ({item.status})
            </option>
          ))}
        </select>
      </label>

      {!hasMembership ? (
        <p data-testid="store-team-access-empty">No memberships available for this outlet.</p>
      ) : (
        <>
          <p className="text-sm">
            {String(membership.workforceUserId)} · Status: {String(membership.status)}
          </p>

          {canManageMembership ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={pending} onClick={() => void onTransition("active")}>
                Activate
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void onTransition("suspended")}
              >
                Suspend membership
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => void onTransition("revoked")}
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
                        disabled={pending}
                        onClick={() => void onRevoke(item.id)}
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

      {actionError ? (
        <p role="alert" data-testid="store-team-access-action-error" className="text-sm">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
