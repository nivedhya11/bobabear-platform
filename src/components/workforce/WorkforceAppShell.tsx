"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { fetchAdminSession } from "@/lib/administration/api";
import { signOutWorkforce } from "@/lib/workforce-auth/client";
import { resolveAuthorizedDestinations } from "@/lib/workforce-hub/destinations";
import { workforceLoginUrlWithReturn } from "@/lib/workforce-hub/return-to";
import { SideNavigation } from "@/components/enterprise/SideNavigation";
import { TopBar } from "@/components/enterprise/TopBar";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { enterpriseSurfaceClass } from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";

type ShellState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; workforceUserId: string; capabilities: Record<string, boolean> }>;

export function WorkforceAppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "/workforce/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [state, setState] = useState<ShellState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAdminSession();
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          if (!pathname.startsWith("/workforce/login")) {
            window.location.assign(workforceLoginUrlWithReturn(pathname));
          }
          setState({ kind: "ready", workforceUserId: "", capabilities: {} });
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

  const navItems = useMemo(() => {
    const destinations = state.kind === "ready" ? resolveAuthorizedDestinations(state.capabilities) : [];
    const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
    return [
      { href: "/workforce/", label: "Applications", current: normalized === "/workforce/" },
      ...destinations.map((destination) => ({
        href: destination.href,
        label: destination.label,
        current: normalized.startsWith(destination.href),
      })),
    ];
  }, [pathname, state]);

  const isLogin = pathname.startsWith("/workforce/login");

  async function handleSignOut() {
    await signOutWorkforce();
    window.location.assign("/workforce/login/");
  }

  if (isLogin) {
    return (
      <div className={enterpriseSurfaceClass} data-surface="workforce-login">
        <TopBar productLabel="Boba Bear Workforce" contextLabel="Sign in" />
        <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={enterpriseSurfaceClass} data-surface="workforce">
      <TopBar
        productLabel="Boba Bear Workforce"
        contextLabel="Operations & franchise tools"
        workforceUserId={state.kind === "ready" ? state.workforceUserId : undefined}
        showMenuButton
        onOpenNavigation={() => setMobileOpen(true)}
        onSignOut={state.kind === "ready" && state.workforceUserId ? () => void handleSignOut() : undefined}
        secondaryAction={
          state.kind === "ready" &&
          resolveAuthorizedDestinations(state.capabilities).some((d) => d.id === "administration") ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <a href="/workforce/admin/">Administration</a>
            </Button>
          ) : null
        }
      />
      <div className="mx-auto flex w-full max-w-7xl">
        <SideNavigation
          items={navItems}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          ariaLabel="Workforce navigation"
        />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {state.kind === "loading" ? <LoadingState /> : children}
        </main>
      </div>
    </div>
  );
}
