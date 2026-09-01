"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { enterpriseFocusRingClass } from "./enterprise-tokens";

export type NavItem = Readonly<{
  href: string;
  label: string;
  current?: boolean;
}>;

export function SideNavigation({
  items,
  mobileOpen,
  onMobileClose,
  ariaLabel,
}: Readonly<{
  items: readonly NavItem[];
  mobileOpen: boolean;
  onMobileClose: () => void;
  ariaLabel: string;
}>) {
  const navId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mobileOpen) closeButtonRef.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose]);

  const navBody = (
    <nav id={navId} aria-label={ariaLabel} className="flex flex-col gap-1 p-3">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          onClick={onMobileClose}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            enterpriseFocusRingClass,
            item.current
              ? "bg-[var(--enterprise-nav-active-bg,#e8efe2)] text-[var(--enterprise-text-primary,#1a2210)]"
              : "text-[var(--enterprise-text-secondary,#4b5542)] hover:bg-[var(--enterprise-nav-hover-bg,#eef2ea)] hover:text-[var(--enterprise-text-primary,#1a2210)]",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-[var(--enterprise-border,#d8ddd0)] bg-[var(--enterprise-bg-panel,#ffffff)] lg:block">
        {navBody}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--enterprise-border,#d8ddd0)] bg-[var(--enterprise-bg-panel,#ffffff)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--enterprise-border,#d8ddd0)] px-3 py-2">
              <p className="text-sm font-semibold">Navigation</p>
              <Button ref={closeButtonRef} type="button" variant="ghost" size="sm" onClick={onMobileClose}>
                Close
              </Button>
            </div>
            {navBody}
          </div>
        </div>
      ) : null}
    </>
  );
}
