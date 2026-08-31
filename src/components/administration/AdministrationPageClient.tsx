"use client";

import { useEffect, useState } from "react";

import {
  getAdministrationMembershipClient,
  getAdministrationSession,
  listAdministrationAuditEventsClient,
  listAdministrationMembershipsClient,
  listAdministrationResourceClient,
  listAdministrationRoleAssignmentsClient,
  type AdministrationMembership,
  type AdministrationResource,
  type AdministrationSession,
} from "@/lib/administration/api";

export type AdministrationView = "hub" | "resources" | "memberships" | "membership-detail" | "audit";

type LoadedData =
  | { kind: "hub" }
  | { kind: "resources"; groups: Array<{ kind: string; items: AdministrationResource[] }> }
  | { kind: "memberships"; items: AdministrationMembership[] }
  | { kind: "membership-detail"; membership: AdministrationMembership; assignments: Array<{ id: string; roleKey: string; revokedAt: string | null }> }
  | { kind: "audit"; items: Array<{ id: string; occurredAt: string; action: string; targetType: string; targetId: string }> };

const RESOURCE_PERMISSIONS = [
  ["brands", "brand.read"],
  ["organizations", "organization.read"],
  ["territories", "territory.read"],
  ["legal-entities", "legal_entity.read"],
  ["outlets", "outlet.read"],
] as const;

function requiredPermission(view: AdministrationView): string | null {
  if (view === "memberships" || view === "membership-detail") return "access.membership.read";
  if (view === "audit") return "access.audit.read";
  return null;
}

export function AdministrationPageClient({ view }: Readonly<{ view: AdministrationView }>) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "signed-out" }
    | { kind: "forbidden" }
    | { kind: "error" }
    | { kind: "ready"; session: AdministrationSession; data: LoadedData }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessionResult = await getAdministrationSession();
      if (cancelled) return;
      if (!sessionResult.ok) {
        setState(sessionResult.status === 401 ? { kind: "signed-out" } : { kind: "error" });
        return;
      }
      const session = sessionResult.data.session;
      const permission = requiredPermission(view);
      if (permission && !session.permissions.includes(permission)) {
        setState({ kind: "forbidden" });
        return;
      }
      try {
        let data: LoadedData;
        if (view === "hub") data = { kind: "hub" };
        else if (view === "resources") {
          const allowed = RESOURCE_PERMISSIONS.filter(([, key]) => session.permissions.includes(key));
          if (allowed.length === 0) {
            setState({ kind: "forbidden" });
            return;
          }
          const results = await Promise.all(allowed.map(async ([kind]) => ({ kind, result: await listAdministrationResourceClient(kind) })));
          if (results.some(({ result }) => !result.ok)) throw new Error("resource list failed");
          data = {
            kind: "resources",
            groups: results.map(({ kind, result }) => ({ kind, items: result.ok ? result.data.items : [] })),
          };
        } else if (view === "memberships") {
          const result = await listAdministrationMembershipsClient();
          if (!result.ok) throw result;
          data = { kind: "memberships", items: result.data.items };
        } else if (view === "membership-detail") {
          const membershipId = new URLSearchParams(window.location.search).get("membershipId");
          if (!membershipId) throw new Error("missing membership");
          const membership = await getAdministrationMembershipClient(membershipId);
          if (!membership.ok) throw membership;
          const assignments = session.permissions.includes("access.role_assignment.read")
            ? await listAdministrationRoleAssignmentsClient(membershipId)
            : null;
          if (assignments && !assignments.ok) throw assignments;
          data = { kind: "membership-detail", membership: membership.data.membership, assignments: assignments?.ok ? assignments.data.items : [] };
        } else {
          const result = await listAdministrationAuditEventsClient();
          if (!result.ok) throw result;
          data = { kind: "audit", items: result.data.items };
        }
        if (!cancelled) setState({ kind: "ready", session, data });
      } catch (error) {
        if (cancelled) return;
        const status = typeof error === "object" && error && "status" in error ? (error as { status: number }).status : 0;
        setState(status === 403 ? { kind: "forbidden" } : status === 401 ? { kind: "signed-out" } : { kind: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [view]);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[960px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Boba Bear · Workforce Administration</p>
          <h1 className="font-display text-[clamp(32px,7vw,52px)] capitalize text-[var(--text-primary)]">{view.replace("-", " ")}</h1>
        </header>
        {state.kind === "loading" ? <p data-testid="admin-loading">Loading administration…</p> : null}
        {state.kind === "signed-out" ? <section role="alert" data-testid="admin-unauthorized"><p>Sign in with your workforce account.</p><a href="/workforce/login/">Workforce sign in</a></section> : null}
        {state.kind === "forbidden" ? <section role="alert" data-testid="admin-forbidden"><p>You do not have permission to view this administration area.</p></section> : null}
        {state.kind === "error" ? <section role="alert" data-testid="admin-error"><p>Administration could not be loaded. Try again.</p></section> : null}
        {state.kind === "ready" ? <AdministrationContent session={state.session} data={state.data} /> : null}
      </div>
    </main>
  );
}

function AdministrationContent({ session, data }: Readonly<{ session: AdministrationSession; data: LoadedData }>) {
  if (data.kind === "hub") {
    const links = [
      ["/workforce/admin/resources/", "Resources", RESOURCE_PERMISSIONS.some(([, p]) => session.permissions.includes(p))],
      ["/workforce/admin/memberships/", "Memberships", session.permissions.includes("access.membership.read")],
      ["/workforce/admin/audit/", "Audit", session.permissions.includes("access.audit.read")],
    ] as const;
    return <nav aria-label="Administration"><ul className="grid gap-4 sm:grid-cols-3">{links.filter(([, , visible]) => visible).map(([href, label]) => <li key={href}><a className="block border border-[var(--border-subtle)] p-5" href={href}>{label}</a></li>)}</ul></nav>;
  }
  if (data.kind === "resources") return <div className="flex flex-col gap-8">{data.groups.map((group) => <section key={group.kind}><h2 className="font-display text-2xl capitalize">{group.kind.replace("-", " ")}</h2><ul>{group.items.map((item) => <li className="border-b border-[var(--border-subtle)] py-3" key={item.id}>{item.name} · {item.code} · {item.status}</li>)}</ul></section>)}</div>;
  if (data.kind === "memberships") return <ul>{data.items.map((item) => <li className="border-b border-[var(--border-subtle)] py-3" key={item.id}><a href={`/workforce/admin/memberships/detail/?membershipId=${encodeURIComponent(item.id)}`}>{item.workforceUserId}</a> · {item.scopeType} · {item.status}</li>)}</ul>;
  if (data.kind === "membership-detail") return <div className="flex flex-col gap-6"><section><h2 className="font-display text-2xl">Membership</h2><p>{data.membership.workforceUserId} · {data.membership.scopeType} · {data.membership.status}</p></section><section><h2 className="font-display text-2xl">Role assignments</h2><ul>{data.assignments.map((item) => <li key={item.id}>{item.roleKey}{item.revokedAt ? " · revoked" : ""}</li>)}</ul></section></div>;
  return <ul>{data.items.map((item) => <li className="border-b border-[var(--border-subtle)] py-3" key={item.id}>{new Date(item.occurredAt).toLocaleString()} · {item.action} · {item.targetType} {item.targetId}</li>)}</ul>;
}
