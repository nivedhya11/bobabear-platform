"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { fetchAdminSession } from "@/lib/administration/api";
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
    return <p data-testid="admin-loading">Loading administration…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <div data-testid="admin-unauthorized" className="space-y-3">
        <p>Workforce sign-in is required for administration.</p>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "error") {
    return <p data-testid="admin-error">{view.message}</p>;
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
      <p className="text-sm text-neutral-600">Signed in as {view.workforceUserId}</p>
      <ul className="space-y-2">
        {links
          .filter((link) => link.show)
          .map((link) => (
            <li key={link.href}>
              <a className={cn("underline underline-offset-4")} href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
      </ul>
      {!view.capabilities["access.membership.read"] && !view.capabilities["access.audit.read"] ? (
        <p data-testid="admin-limited">No administration read capabilities on platform scope.</p>
      ) : null}
    </div>
  );
}
