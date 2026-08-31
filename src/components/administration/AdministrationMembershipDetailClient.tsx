"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  fetchEffectivePermissions,
  getAdminMembership,
  grantMembershipRole,
  listMembershipRoleAssignments,
  revokeRoleAssignment,
  transitionMembership,
} from "@/lib/administration/api";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      membership: Record<string, unknown>;
      assignments: readonly Record<string, unknown>[];
      permissions: readonly string[];
      actionError: string | null;
    }>;

function membershipIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("membershipId");
}

export function AdministrationMembershipDetailClient() {
  const membershipId = useMemo(() => membershipIdFromLocation(), []);
  const [view, setView] = useState<ViewState>(
    membershipId ? { kind: "loading" } : { kind: "missing" },
  );
  const [roleKey, setRoleKey] = useState("outlet_manager");

  useEffect(() => {
    if (!membershipId) return;
    let cancelled = false;
    void (async () => {
      const membershipResult = await getAdminMembership(membershipId);
      if (cancelled) return;
      if (!membershipResult.ok) {
        if (membershipResult.status === 401 || membershipResult.code === "WORKFORCE_AUTH_REQUIRED") {
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
      const membership = membershipResult.data.membership;
      const assignmentsResult = await listMembershipRoleAssignments(membershipId);
      const assignments =
        assignmentsResult.ok ? (assignmentsResult.data.items as Record<string, unknown>[]) : [];
      const resourceQuery: Record<string, string> = {
        resourceType: String(membership.scopeType),
      };
      if (typeof membership.brandId === "string") resourceQuery.brandId = membership.brandId;
      if (typeof membership.organizationId === "string") {
        resourceQuery.organizationId = membership.organizationId;
      }
      if (typeof membership.territoryId === "string") resourceQuery.territoryId = membership.territoryId;
      if (typeof membership.outletId === "string") resourceQuery.outletId = membership.outletId;
      const permissionsResult = await fetchEffectivePermissions(resourceQuery);
      const permissions = permissionsResult.ok ? permissionsResult.data.permissions : [];
      setView({
        kind: "ready",
        membership,
        assignments,
        permissions,
        actionError: null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [membershipId]);

  if (view.kind === "missing") {
    return <p data-testid="admin-membership-detail-missing">membershipId query parameter is required.</p>;
  }
  if (view.kind === "loading") return <p data-testid="admin-membership-detail-loading">Loading…</p>;
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-membership-detail-unauthorized" className="space-y-3">
        <p>Sign in required.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "forbidden") {
    return <p data-testid="admin-membership-detail-forbidden">Not authorized for this membership.</p>;
  }
  if (view.kind === "error") return <p data-testid="admin-membership-detail-error">{view.message}</p>;

  async function onTransition(toStatus: string) {
    if (!membershipId || view.kind !== "ready") return;
    const result = await transitionMembership(membershipId, toStatus);
    if (!result.ok) {
      setView({ ...view, actionError: result.code });
      return;
    }
    setView({ ...view, membership: result.data.membership, actionError: null });
  }

  async function onGrant() {
    if (!membershipId || view.kind !== "ready") return;
    const result = await grantMembershipRole(membershipId, roleKey);
    if (!result.ok) {
      setView({ ...view, actionError: result.code });
      return;
    }
    const refreshed = await listMembershipRoleAssignments(membershipId);
    setView({
      ...view,
      assignments: refreshed.ok ? (refreshed.data.items as Record<string, unknown>[]) : view.assignments,
      actionError: null,
    });
  }

  async function onRevoke(assignmentId: string) {
    if (view.kind !== "ready") return;
    const result = await revokeRoleAssignment(assignmentId);
    if (!result.ok) {
      setView({ ...view, actionError: result.code });
      return;
    }
    setView({
      ...view,
      assignments: view.assignments.filter((item) => String(item.id) !== assignmentId),
      actionError: null,
    });
  }

  return (
    <div data-testid="admin-membership-detail" className="space-y-6">
      <div>
        <p>
          {String(view.membership.workforceUserId)} @ {String(view.membership.scopeType)} (
          {String(view.membership.status)})
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onTransition("active")}>
            Activate
          </Button>
          <Button type="button" onClick={() => void onTransition("suspended")}>
            Suspend
          </Button>
          <Button type="button" onClick={() => void onTransition("revoked")}>
            Revoke membership
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Role assignments</h2>
        <ul className="space-y-2">
          {view.assignments.map((item) => (
            <li key={String(item.id)} className="flex items-center gap-3">
              <span>
                {String(item.roleKey)}
                {item.revokedAt ? " (revoked)" : ""}
              </span>
              {!item.revokedAt ? (
                <Button type="button" onClick={() => void onRevoke(String(item.id))}>
                  Revoke role
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="role-key">Grant role</label>
          <select
            id="role-key"
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
            className="border px-2 py-1"
          >
            <option value="outlet_manager">outlet_manager</option>
            <option value="kitchen_operator">kitchen_operator</option>
            <option value="delivery_coordinator">delivery_coordinator</option>
            <option value="brand_admin">brand_admin</option>
            <option value="platform_super_admin">platform_super_admin</option>
          </select>
          <Button type="button" onClick={() => void onGrant()}>
            Grant
          </Button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-medium">Effective permissions (membership scope)</h2>
        <p data-testid="admin-effective-permissions" className="text-sm">
          {view.permissions.length === 0 ? "None visible." : view.permissions.join(", ")}
        </p>
      </div>
      {view.actionError ? (
        <p data-testid="admin-membership-action-error">Action denied: {view.actionError}</p>
      ) : null}
    </div>
  );
}
