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
    <nav aria-label="Store sections" className="border-b border-[var(--enterprise-border)]">
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium outline-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus)]",
                item.current
                  ? "border-b-2 border-[var(--enterprise-accent)] text-[var(--enterprise-fg)]"
                  : "text-[var(--enterprise-muted)] hover:text-[var(--enterprise-fg)]",
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
