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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

function NavLinks({
  items,
  onNavigate,
}: Readonly<{ items: readonly NavItem[]; onNavigate?: () => void }>) {
  return (
    <>
      {items.map((item) => (
        <a
          key={`${item.href}:${item.label}`}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          onClick={onNavigate}
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
    </>
  );
}

export function SideNavigation({
  items,
  mobileOpen,
  onMobileClose,
  ariaLabel,
  drawerId,
  variant = "both",
}: Readonly<{
  items: readonly NavItem[];
  mobileOpen: boolean;
  onMobileClose: () => void;
  ariaLabel: string;
  drawerId: string;
  variant?: "desktop" | "mobile" | "both";
}>) {
  const desktopNavId = useId();
  const mobileNavId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showDesktop = variant === "desktop" || variant === "both";
  const showMobile = variant === "mobile" || variant === "both";

  useEffect(() => {
    if (showMobile && mobileOpen) closeButtonRef.current?.focus();
  }, [mobileOpen, showMobile]);

  useEffect(() => {
    if (!showMobile || !mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileClose();
        return;
      }
      if (event.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusable = focusableElements(root);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (active instanceof Node && !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose, showMobile]);

  return (
    <>
      {showDesktop ? (
        <aside className="hidden w-60 shrink-0 border-r border-[var(--enterprise-border,#d8ddd0)] bg-[var(--enterprise-bg-panel,#ffffff)] lg:block">
          <nav id={desktopNavId} aria-label={ariaLabel} className="flex flex-col gap-1 p-3">
            <NavLinks items={items} />
          </nav>
        </aside>
      ) : null}
      {showMobile ? (
        <div
          id={drawerId}
          className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "block" : "hidden")}
          hidden={!mobileOpen}
        >
          <button
            type="button"
            aria-label="Close navigation backdrop"
            className="absolute inset-0 bg-black/40"
            tabIndex={-1}
            onClick={onMobileClose}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal={mobileOpen}
            aria-label={ariaLabel}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--enterprise-border,#d8ddd0)] bg-[var(--enterprise-bg-panel,#ffffff)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--enterprise-border,#d8ddd0)] px-3 py-2">
              <p className="text-sm font-semibold">Navigation</p>
              <Button ref={closeButtonRef} type="button" variant="ghost" size="sm" onClick={onMobileClose}>
                Close
              </Button>
            </div>
            <nav id={mobileNavId} aria-label={ariaLabel} className="flex flex-col gap-1 p-3">
              <NavLinks items={items} onNavigate={onMobileClose} />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
