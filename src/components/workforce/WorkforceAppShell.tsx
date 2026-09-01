"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { fetchAdminSession } from "@/lib/administration/api";
import { signOutWorkforce } from "@/lib/workforce-auth/client";
import { applicationNavItems } from "@/lib/workforce-hub/destinations";
import { resolveSignedInLabel } from "@/lib/workforce-hub/identity";
import { workforceLoginUrlWithReturn } from "@/lib/workforce-hub/return-to";
import { classifyPortalSessionResult } from "@/lib/workforce-hub/session-result";
import { SideNavigation } from "@/components/enterprise/SideNavigation";
import { TopBar } from "@/components/enterprise/TopBar";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { enterpriseSurfaceClass } from "@/components/enterprise/enterprise-tokens";

type ShellState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{
      kind: "ready";
      signedInLabel: string;
      capabilities: Record<string, boolean>;
    }>;

export function WorkforceAppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "/workforce/";
  const drawerId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [state, setState] = useState<ShellState>({ kind: "loading" });

  const closeNavigation = useCallback(() => {
    setMobileOpen(false);
    queueMicrotask(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAdminSession();
      if (cancelled) return;
      const outcome = classifyPortalSessionResult(result);
      if (outcome === "authentication_required") {
        if (!pathname.startsWith("/workforce/login")) {
          window.location.assign(workforceLoginUrlWithReturn(pathname));
        }
        setState({ kind: "ready", signedInLabel: "", capabilities: {} });
        return;
      }
      if (outcome === "service_failure" || !result.ok) {
        setState({ kind: "error" });
        return;
      }
      const projectedLabel = result.data.session.signedInLabel?.trim() ?? "";
      setState({
        kind: "ready",
        signedInLabel: resolveSignedInLabel({
          email: projectedLabel.includes("@") ? projectedLabel : undefined,
          workforceUserId: result.data.session.workforceUserId,
        }),
        capabilities: result.data.session.capabilities,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navItems = useMemo(() => {
    const capabilities = state.kind === "ready" ? state.capabilities : {};
    return [...applicationNavItems(pathname, capabilities, "workforce")];
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
      <div {...(mobileOpen ? { inert: true } : {})}>
        <TopBar
          productLabel="Boba Bear Workforce"
          contextLabel="Operations & franchise tools"
          signedInLabel={state.kind === "ready" && state.signedInLabel ? state.signedInLabel : undefined}
          showMenuButton
          navigationExpanded={mobileOpen}
          navigationId={drawerId}
          menuButtonRef={menuButtonRef}
          onOpenNavigation={() => setMobileOpen(true)}
          onSignOut={state.kind === "ready" && state.signedInLabel ? () => void handleSignOut() : undefined}
        />
        <div className="mx-auto flex w-full max-w-7xl">
          <SideNavigation
            items={navItems}
            mobileOpen={false}
            onMobileClose={closeNavigation}
            ariaLabel="Workforce navigation"
            drawerId={`${drawerId}-desktop`}
            variant="desktop"
          />
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
            {state.kind === "loading" ? (
              <LoadingState />
            ) : state.kind === "error" ? (
              <ErrorState
                message="Workforce session could not be loaded. Navigation may be incomplete until this is resolved."
                onRetry={() => window.location.reload()}
              />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
      <SideNavigation
        items={navItems}
        mobileOpen={mobileOpen}
        onMobileClose={closeNavigation}
        ariaLabel="Workforce navigation"
        drawerId={drawerId}
        variant="mobile"
      />
    </div>
  );
}
