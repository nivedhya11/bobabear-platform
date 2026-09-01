"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { Alert } from "@/components/enterprise/Alert";
import { fetchAdminSession } from "@/lib/administration/api";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";
import { cn } from "@/lib/utils";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      workforceUserId: string;
      capabilities: Record<string, boolean>;
    }>;

export function AdministrationHubClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAdminSession();
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setView({ kind: "unauthorized" });
          return;
        }
        setView({ kind: "error", message: "Administration session could not be loaded." });
        return;
      }
      setView({
        kind: "ready",
        workforceUserId: result.data.session.workforceUserId,
        capabilities: result.data.session.capabilities,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return <LoadingState label="Loading administration…" />;
  }
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-unauthorized" className="space-y-3">
        <Alert tone="warning" title="Sign-in required">
          Workforce sign-in is required for administration.
        </Alert>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "error") {
    return <Alert tone="danger">{view.message}</Alert>;
  }

  const links = [
    { href: "/workforce/admin/resources/", label: "Resources", show: true },
    {
      href: "/workforce/admin/memberships/",
      label: "Memberships",
      show: view.capabilities["access.membership.read"] === true,
    },
    {
      href: "/workforce/admin/audit/",
      label: "Access audit",
      show: view.capabilities["access.audit.read"] === true,
    },
  ];

  return (
    <div data-testid="admin-hub" className="space-y-6">
      <PageHeader
        title="Administration overview"
        description="Manage organization resources, memberships, and access audit from this workspace."
      />
      <p className="text-sm text-[var(--enterprise-text-secondary,#4b5542)]">
        Signed in as <span className="font-medium">{view.workforceUserId}</span>
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links
          .filter((link) => link.show)
          .map((link) => (
            <li key={link.href}>
              <a
                className={cn(enterprisePanelClass, "block px-4 py-3 text-sm font-semibold hover:shadow-sm focus-ring")}
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
      </ul>
      {!view.capabilities["access.membership.read"] && !view.capabilities["access.audit.read"] ? (
        <Alert tone="info" title="Limited administration scope">
          No membership or audit read capabilities are currently granted on your platform scope.
        </Alert>
      ) : null}
    </div>
  );
}
