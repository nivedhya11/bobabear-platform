"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchAdminSession } from "@/lib/administration/api";
import { resolveOperationsNavItems } from "@/lib/operations/navigation";
import { cn } from "@/lib/utils";

type NavState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; items: readonly Readonly<{ href: string; label: string; current?: boolean }>[] }>;

export function OperationsWorkspaceNav() {
  const pathname = usePathname() ?? "/workforce/operations/";
  const [state, setState] = useState<NavState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAdminSession();
      if (cancelled) return;
      const capabilities =
        result.ok && result.data.session.capabilities
          ? result.data.session.capabilities
          : {};
      setState({
        kind: "ready",
        items: resolveOperationsNavItems(capabilities, pathname),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (state.kind === "loading" || state.items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Operations workspace" className="mb-6 border-b border-[var(--enterprise-border)]">
      <ul className="flex flex-wrap gap-1">
        {state.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus)]",
                item.current
                  ? "border-b-2 border-[var(--enterprise-accent)] text-[var(--enterprise-fg)]"
                  : "text-[var(--enterprise-muted)] hover:text-[var(--enterprise-fg)]",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
