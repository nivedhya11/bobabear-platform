"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { fetchAdminSession } from "@/lib/administration/api";
import { signOutWorkforce } from "@/lib/workforce-auth/client";
import { hasAnyCapability, ADMINISTRATION_ENTRY_PERMISSIONS } from "@/lib/workforce-hub/destinations";
import { workforceLoginUrlWithReturn } from "@/lib/workforce-hub/return-to";
import { SideNavigation } from "@/components/enterprise/SideNavigation";
import { TopBar } from "@/components/enterprise/TopBar";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { enterpriseSurfaceClass } from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";

type ShellState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; workforceUserId: string; capabilities: Record<string, boolean> }>;

function adminNavItems(pathname: string, capabilities: Record<string, boolean>) {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const items = [
    { href: "/workforce/admin/", label: "Overview", current: normalized === "/workforce/admin/" },
    { href: "/workforce/admin/resources/", label: "Resources", current: normalized.startsWith("/workforce/admin/resources/") },
  ];
  if (capabilities["access.membership.read"] === true) {
    items.push({
      href: "/workforce/admin/memberships/",
      label: "Memberships",
      current: normalized.startsWith("/workforce/admin/memberships/"),
    });
  }
  if (capabilities["access.audit.read"] === true) {
    items.push({
      href: "/workforce/admin/audit/",
      label: "Access audit",
      current: normalized.startsWith("/workforce/admin/audit/"),
    });
  }
  return items;
}

export function AdministrationAppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "/workforce/admin/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [state, setState] = useState<ShellState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAdminSession();
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          window.location.assign(workforceLoginUrlWithReturn(pathname));
          return;
        }
        setState({ kind: "ready", workforceUserId: "", capabilities: {} });
        return;
      }
      setState({
        kind: "ready",
        workforceUserId: result.data.session.workforceUserId,
        capabilities: result.data.session.capabilities,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navItems = useMemo(
    () => (state.kind === "ready" ? adminNavItems(pathname, state.capabilities) : []),
    [pathname, state],
  );

  async function handleSignOut() {
    await signOutWorkforce();
    window.location.assign("/workforce/login/");
  }

  const canAccessAdmin =
    state.kind === "ready" && hasAnyCapability(state.capabilities, ADMINISTRATION_ENTRY_PERMISSIONS);

  return (
    <div className={enterpriseSurfaceClass} data-surface="administration">
      <TopBar
        productLabel="Boba Bear Administration"
        contextLabel="Platform access & organization"
        workforceUserId={state.kind === "ready" ? state.workforceUserId : undefined}
        showMenuButton
        onOpenNavigation={() => setMobileOpen(true)}
        onSignOut={state.kind === "ready" && state.workforceUserId ? () => void handleSignOut() : undefined}
        secondaryAction={
          state.kind === "ready" && state.capabilities["order.read"] === true ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <a href="/workforce/operations/">Open Operations</a>
            </Button>
          ) : null
        }
      />
      <div className="mx-auto flex w-full max-w-7xl">
        <SideNavigation
          items={navItems}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          ariaLabel="Administration navigation"
        />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {state.kind === "loading" ? (
            <LoadingState />
          ) : !canAccessAdmin ? (
            <div data-testid="admin-shell-denied" className="space-y-3 text-sm">
              <p>You do not have administration access for this account.</p>
              <Button asChild variant="secondary">
                <a href="/workforce/">Back to workforce</a>
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
