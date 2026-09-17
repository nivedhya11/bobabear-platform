"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminConfirmDialog } from "@/components/administration/AdminConfirmDialog";
import { Alert } from "@/components/enterprise/Alert";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
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
      subjectLabel: string | null;
      actionError: string | null;
      notice: string | null;
    }>;

type PendingAction =
  | Readonly<{ type: "transition"; toStatus: string; label: string; consequence: string }>
  | Readonly<{ type: "grant"; roleKey: string }>
  | Readonly<{ type: "revoke-role"; assignmentId: string; roleKey: string }>
  | null;

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
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!membershipId) return;
    const membershipResult = await getAdminMembership(membershipId);
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
      membershipId,
    };
    if (typeof membership.brandId === "string") resourceQuery.brandId = membership.brandId;
    if (typeof membership.organizationId === "string") {
      resourceQuery.organizationId = membership.organizationId;
    }
    if (typeof membership.territoryId === "string") resourceQuery.territoryId = membership.territoryId;
    if (typeof membership.outletId === "string") resourceQuery.outletId = membership.outletId;
    if (String(membership.scopeType) === "legal_entity" && typeof membership.legalEntityId === "string") {
      resourceQuery.legalEntityId = membership.legalEntityId;
    }
    const permissionsResult = await fetchEffectivePermissions(resourceQuery);
    const permissions = permissionsResult.ok ? permissionsResult.data.permissions : [];
    const subjectLabel =
      permissionsResult.ok && permissionsResult.data.subject
        ? permissionsResult.data.subject.memberLabel
        : typeof membership.memberLabel === "string"
          ? membership.memberLabel
          : null;
    setView({
      kind: "ready",
      membership,
      assignments,
      permissions,
      subjectLabel,
      actionError: null,
      notice: null,
    });
  }

  useEffect(() => {
    if (!membershipId) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load by membershipId
  }, [membershipId]);

  if (view.kind === "missing") {
    return (
      <p data-testid="admin-membership-detail-missing">membershipId query parameter is required.</p>
    );
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
    return (
      <p data-testid="admin-membership-detail-forbidden">Not authorized for this membership.</p>
    );
  }
  if (view.kind === "error") {
    return <p data-testid="admin-membership-detail-error">{view.message}</p>;
  }

  const status = String(view.membership.status);
  const targetLabel =
    view.subjectLabel ??
    `${String(view.membership.workforceUserId)} @ ${String(view.membership.scopeType)}`;

  async function runPending() {
    if (!membershipId || !pending || view.kind !== "ready") return;
    setBusy(true);
    if (pending.type === "transition") {
      const result = await transitionMembership(membershipId, pending.toStatus);
      setBusy(false);
      if (!result.ok) {
        setView({ ...view, actionError: result.code });
        return;
      }
      setPending(null);
      await reload();
      setView((prev) =>
        prev.kind === "ready"
          ? { ...prev, notice: `Membership ${pending.toStatus}.`, actionError: null }
          : prev,
      );
      return;
    }
    if (pending.type === "grant") {
      const result = await grantMembershipRole(membershipId, pending.roleKey);
      setBusy(false);
      if (!result.ok) {
        setView({ ...view, actionError: result.code });
        return;
      }
      setPending(null);
      await reload();
      setView((prev) =>
        prev.kind === "ready" ? { ...prev, notice: "Role granted.", actionError: null } : prev,
      );
      return;
    }
    const result = await revokeRoleAssignment(pending.assignmentId);
    setBusy(false);
    if (!result.ok) {
      setView({ ...view, actionError: result.code });
      return;
    }
    setPending(null);
    await reload();
    setView((prev) =>
      prev.kind === "ready" ? { ...prev, notice: "Role revoked.", actionError: null } : prev,
    );
  }

  return (
    <div data-testid="admin-membership-detail" className="space-y-6">
      <div>
        <p className="font-medium">{targetLabel}</p>
        <p className="text-sm">
          {String(view.membership.workforceUserId)} @ {String(view.membership.scopeType)}
        </p>
        <StatusBadge
          tone={
            status === "active"
              ? "success"
              : status === "invited"
                ? "info"
                : status === "suspended"
                  ? "warning"
                  : "danger"
          }
        >
          {status}
        </StatusBadge>
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "invited" ? (
            <>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "active",
                    label: "Activate membership",
                    consequence: "Member becomes active and may receive grants.",
                  })
                }
              >
                Activate
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "revoked",
                    label: "Revoke invitation",
                    consequence: "Invitation is revoked (terminal). Distinct from Expire.",
                  })
                }
              >
                Revoke
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "expired",
                    label: "Expire invitation",
                    consequence:
                      "Invitation expires (terminal invited→expired). Distinct from Revoke.",
                  })
                }
              >
                Expire
              </Button>
            </>
          ) : null}
          {status === "active" ? (
            <>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "suspended",
                    label: "Suspend membership",
                    consequence: "Member access is suspended until reactivated.",
                  })
                }
              >
                Suspend
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "revoked",
                    label: "Revoke membership",
                    consequence: "Membership is revoked (terminal).",
                  })
                }
              >
                Revoke membership
              </Button>
            </>
          ) : null}
          {status === "suspended" ? (
            <>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "active",
                    label: "Reactivate membership",
                    consequence: "Suspended member becomes active again.",
                  })
                }
              >
                Activate
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setPending({
                    type: "transition",
                    toStatus: "revoked",
                    label: "Revoke membership",
                    consequence: "Membership is revoked (terminal).",
                  })
                }
              >
                Revoke membership
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Role assignments</h2>
        <ul className="space-y-2">
          {view.assignments.map((item) => (
            <li key={String(item.id)} className="flex flex-wrap items-center gap-3">
              <span>
                {String(item.roleKey)}
                {item.revokedAt ? " (revoked)" : ""}
              </span>
              {!item.revokedAt ? (
                <Button
                  type="button"
                  onClick={() =>
                    setPending({
                      type: "revoke-role",
                      assignmentId: String(item.id),
                      roleKey: String(item.roleKey),
                    })
                  }
                >
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
          <Button
            type="button"
            onClick={() => setPending({ type: "grant", roleKey })}
          >
            Grant
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Managed-subject effective permissions</h2>
        <p className="text-sm text-[var(--enterprise-text-secondary,#5C4B24)]">
          Subject: {view.subjectLabel ?? "managed member"} (not the signed-in caller)
        </p>
        <p data-testid="admin-effective-permissions" className="text-sm">
          {view.permissions.length === 0 ? "None visible." : view.permissions.join(", ")}
        </p>
        <Button type="button" variant="secondary" className="mt-2" onClick={() => void reload()}>
          Reload diagnostic
        </Button>
      </div>

      {view.notice ? (
        <Alert tone="success" title="Success">
          {view.notice}
        </Alert>
      ) : null}
      {view.actionError ? (
        <p data-testid="admin-membership-action-error">Action denied: {view.actionError}</p>
      ) : null}

      <AdminConfirmDialog
        open={pending !== null}
        title={
          pending?.type === "transition"
            ? pending.label
            : pending?.type === "grant"
              ? "Grant role"
              : "Revoke role"
        }
        targetLabel={targetLabel}
        scopeLabel={String(view.membership.scopeType)}
        consequenceLabel={
          pending?.type === "transition"
            ? pending.consequence
            : pending?.type === "grant"
              ? `Grant ${pending.roleKey} within delegation ceiling.`
              : pending
                ? `Revoke ${pending.roleKey} from this membership.`
                : ""
        }
        confirmLabel={
          pending?.type === "transition"
            ? pending.toStatus === "expired"
              ? "Expire"
              : "Confirm"
            : pending?.type === "grant"
              ? "Grant role"
              : "Revoke role"
        }
        busy={busy}
        error={view.actionError}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
        onConfirm={() => void runPending()}
      />
    </div>
  );
}
