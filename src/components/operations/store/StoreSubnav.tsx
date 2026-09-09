"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { resolveStoreSubnavItems } from "@/lib/operations/store-navigation";
import { cn } from "@/lib/utils";

import { useStoreOutlet } from "./StoreOutletContext";

export function StoreSubnav() {
  const pathname = usePathname() ?? "/workforce/operations/store/";
  const { capabilities, outletId } = useStoreOutlet();
  const items = resolveStoreSubnavItems(capabilities, pathname, outletId);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Store sections"
      className="border-b border-[var(--enterprise-border,#3D6026)]"
    >
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium outline-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]",
                item.current
                  ? "border-b-2 border-[var(--enterprise-accent,#A8D832)] text-[var(--enterprise-fg,#FAF3E2)]"
                  : "text-[var(--enterprise-muted,#C4D4A8)] hover:text-[var(--enterprise-fg,#FAF3E2)]",
              )}
              data-testid={`store-subnav-${item.id}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
