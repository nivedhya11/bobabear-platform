"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { fetchAdminSession } from "@/lib/administration/api";
import { signOutWorkforce } from "@/lib/workforce-auth/client";
import {
  applicationNavItems,
  hasAnyCapability,
  ADMINISTRATION_ENTRY_PERMISSIONS,
  normalizeWorkforcePath,
} from "@/lib/workforce-hub/destinations";
import { resolveSignedInLabel } from "@/lib/workforce-hub/identity";
import { workforceLoginUrlWithReturn } from "@/lib/workforce-hub/return-to";
import { classifyPortalSessionResult } from "@/lib/workforce-hub/session-result";
import { AccessDenied } from "@/components/enterprise/AccessDenied";
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

function adminSectionItems(pathname: string, capabilities: Record<string, boolean>) {
  const normalized = normalizeWorkforcePath(pathname);
  const items = [
    { href: "/workforce/admin/", label: "Overview", current: normalized === "/workforce/admin/" },
    {
      href: "/workforce/admin/resources/",
      label: "Resources",
      current: normalized.startsWith("/workforce/admin/resources/"),
    },
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
        window.location.assign(workforceLoginUrlWithReturn(pathname));
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
    if (state.kind !== "ready") {
      return [...applicationNavItems(pathname, {}, "administration")];
    }
    return [
      ...applicationNavItems(pathname, state.capabilities, "administration"),
      ...adminSectionItems(pathname, state.capabilities),
    ];
  }, [pathname, state]);

  async function handleSignOut() {
    await signOutWorkforce();
    window.location.assign("/workforce/login/");
  }

  const canAccessAdmin =
    state.kind === "ready" && hasAnyCapability(state.capabilities, ADMINISTRATION_ENTRY_PERMISSIONS);

  return (
    <div className={enterpriseSurfaceClass} data-surface="administration">
      <div {...(mobileOpen ? { inert: true } : {})}>
        <TopBar
          productLabel="Boba Bear Administration"
          contextLabel="Access & organization"
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
            ariaLabel="Administration navigation"
            drawerId={`${drawerId}-desktop`}
            variant="desktop"
          />
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
            {state.kind === "loading" ? (
              <LoadingState />
            ) : state.kind === "error" ? (
              <ErrorState
                message="Administration session could not be loaded. Try again before assuming you lack access."
                onRetry={() => window.location.reload()}
              />
            ) : !canAccessAdmin ? (
              <AccessDenied
                message="You do not have administration access for this account."
                backHref="/workforce/"
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
        ariaLabel="Administration navigation"
        drawerId={drawerId}
        variant="mobile"
      />
    </div>
  );
}
