"use client";

/**
 * Nav — §9 Navigation · Boba Bear Design System
 *
 * Desktop (≥ 1024 px)
 *   Brand mark left · links centred · [circle theme toggle | Access the Drop] right
 *   Links: font-body 14 px / 600 · ghost-hover fill · active = text-label colour
 *   Scrollspy: IntersectionObserver on top→access section IDs.
 *
 * Mobile (< 1024 px)
 *   Brand mark left · circle hamburger right
 *   Full-screen drawer slides in from top (translateY -100% → 0).
 *   Drawer links: font-display 42 px with mono number tags.
 *   Closes on link click, Escape key, or the back-arrow button.
 *
 * Theme: reads/writes `light` class on <html> via MutationObserver +
 *   useSyncExternalStore — no SSR mismatch, no setState-in-effect.
 */

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu, ArrowLeft, Sun, Moon, ArrowUpRight } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Drops",   href: "#drops",   id: "drops",   num: "01" },
  { label: "Menu",    href: "#bar",     id: "menu",    num: "02" },
  { label: "Merch",   href: "#merch",   id: "merch",   num: "03" },
  { label: "Artists", href: "#artists", id: "artists", num: "04" },
  { label: "Order",   href: "/order",   id: "order",   num: "05" },
] as const;

const SECTION_IDS = [
  "top", "drops", "bar", "plates", "sweet", "merch", "artists", "access",
] as const;

// Scrollspy mapping — sub-section id → nav link id used for highlight
const SECTION_TO_LINK: Record<string, string> = {
  bar:    "menu",
  plates: "menu",
  sweet:  "menu",
};

// ── Theme store ───────────────────────────────────────────────────────────────
// Reads/subscribes to the `light` class on <html> via MutationObserver so
// React never needs a setState-in-effect and SSR always defaults to dark.

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes:      true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

const getThemeSnapshot  = () => document.documentElement.classList.contains("light");
const getServerSnapshot = () => false; // SSR default — dark

// ── Component ─────────────────────────────────────────────────────────────────

export function Nav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId,   setActiveId]   = useState<string>("top");

  const isLight = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  const toggleTheme = () => {
    const next = !isLight;
    document.documentElement.classList.toggle("light", next);
    // Persist so the choice survives reloads / route changes (read by the
    // bootstrap script in app/layout.tsx).
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* localStorage blocked — fall back to in-session only */
    }
  };

  // Drawer focus management refs: the dialog element + the control to restore
  // focus to when it closes.
  const drawerRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Resolved nav-link id for highlight (collapses bar/plates/sweet → "menu")
  const activeLinkId = SECTION_TO_LINK[activeId] ?? activeId;

  // The nav links are in-page hash anchors that only resolve on the homepage.
  // On any other route (e.g. /privacy) prefix "/" so a click returns home and
  // then scrolls to the section; the brand mark goes straight to "/".
  const pathname = usePathname();
  const onHome = pathname === "/";
  const sectionHref = (href: string) => {
    if (href.startsWith("/")) return href;
    return onHome ? href : `/${href}`;
  };
  const homeHref = onHome ? "#top" : "/";

  // ── Scrollspy ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else                      visible.delete(entry.target.id);
        }
        // Pick the LAST visible section in document order — i.e. the one
        // furthest down that's currently crossing the detection band. Using
        // the first match would lag a section behind (the previous section
        // lingers in the band, so "Merch" would still read while you're in
        // "Artists"). Scanning from the end fixes that off-by-one.
        let next: string | undefined;
        for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
          if (visible.has(SECTION_IDS[i])) { next = SECTION_IDS[i]; break; }
        }
        if (next) setActiveId(next);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // ── Drawer: focus management, focus trap, Escape, scroll lock ──────────────
  // A modal dialog must (a) move focus inside on open, (b) keep Tab focus
  // trapped within while open, and (c) restore focus to the trigger on close.

  useEffect(() => {
    if (!drawerOpen) {
      document.documentElement.style.overflow = "";
      return;
    }

    // Lock background scroll while the drawer is open.
    document.documentElement.style.overflow = "hidden";

    // Remember what had focus (the hamburger) so we can restore it on close.
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const drawer = drawerRef.current;
    const focusables = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Move focus into the dialog.
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active instanceof HTMLElement && drawer && !drawer.contains(active)) {
        // Focus escaped the dialog — pull it back in.
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [drawerOpen]);

  // Restore focus to the trigger when the drawer closes (skipped on first mount,
  // where nothing was stored).
  useEffect(() => {
    if (!drawerOpen && lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Sticky header bar ──────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40",
          "h-14 lg:h-16",
          // Frosted glass — 86 % opacity per spec; color-mix via Tailwind /opacity
          "bg-page/[0.86] backdrop-blur-[14px]",
          "border-b border-border-subtle",
        )}
      >
        <div className="mx-auto max-w-[1280px] h-full px-3 md:px-8 lg:px-12">

          {/* ── Desktop layout (≥ lg) — LOCKED ──────────────────────────
              Brand left · links centred · [theme | Access Drop] right. */}
          <div className="hidden lg:flex items-center justify-between gap-8 h-full">

            {/* Brand mark — text-only logo */}
            <a
              href={homeHref}
              aria-label={onHome ? "Boba Bear — scroll to top" : "Boba Bear — home"}
              className="shrink-0 flex items-center gap-2.5 focus-ring rounded-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logos/boba-bear-text.svg"
                alt="Boba Bear"
                decoding="async"
                className="h-[42px] w-auto select-none"
                draggable={false}
              />
            </a>

            {/* Centre links */}
            <nav aria-label="Main navigation">
              <ul className="flex items-center gap-0.5" role="list">
                {NAV_LINKS.map(({ label, href, id }) => (
                  <li key={id}>
                    <a
                      href={sectionHref(href)}
                      aria-current={activeLinkId === id ? "true" : undefined}
                      className={cn(
                        "font-body font-semibold text-[14px] leading-none",
                        "px-3 py-1 rounded-md inline-block",
                        "transition-colors duration-[150ms] ease-out focus-ring",
                        activeLinkId === id
                          ? "text-[var(--text-label)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
                      )}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Right slot — theme toggle + sign-in link + primary CTA */}
            <div className="flex items-center gap-2 shrink-0">
              <CircleThemeButton isLight={isLight} onClick={toggleTheme} />
              <a
                href="/order/orders/"
                className={cn(
                  "font-body font-semibold text-[14px] leading-none",
                  "px-3 py-1 rounded-md inline-block",
                  "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
                  "transition-colors duration-[150ms] ease-out focus-ring",
                )}
              >
                Orders
              </a>
              <a
                href="/login"
                className={cn(
                  "font-body font-semibold text-[14px] leading-none",
                  "px-3 py-1 rounded-md inline-block",
                  "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
                  "transition-colors duration-[150ms] ease-out focus-ring",
                )}
              >
                Sign in
              </a>
              <Button asChild variant="primary" size="md">
                <a href="/order">
                  Order now
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
                </a>
              </Button>
            </div>
          </div>

          {/* ── Mobile layout (< lg) — hamburger · logo · [theme + CTA] ──
              Hamburger left, text logo dead-centre (absolutely positioned so
              the asymmetric side groups never knock it off-centre), theme
              toggle + Access Drop CTA on the right. */}
          <div className="relative flex lg:hidden items-center justify-between h-full">

            {/* Left — hamburger (sm-scale circle, 32px) */}
	    <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              className={cn(
                "flex items-center justify-center shrink-0",
                "h-8 w-8 rounded-full border border-[var(--border-strong)]",
                "text-[var(--text-primary)] hover:border-[var(--border-focus)]",
                "transition-colors duration-[150ms] ease-out focus-ring cursor-pointer",
              )}
            >
              <Menu size={16} strokeWidth={2} />
            </button>
	    <CircleThemeButton isLight={isLight} onClick={toggleTheme} className="h-8 w-8" />
	    </div>

            {/* Centre — text logo, pinned to the dead centre of the bar */}
            <a
              href={homeHref}
              aria-label={onHome ? "Boba Bear — scroll to top" : "Boba Bear — home"}
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                "flex items-center focus-ring rounded-sm",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logos/boba-bear-text.svg"
                alt="Boba Bear"
                decoding="async"
                className="h-[38px] w-auto select-none"
                draggable={false}
              />
            </a>

            {/* Right — theme toggle + owned-order CTA (both sm-scale, 32px) */}
              <Button asChild variant="primary" size="sm">
                <a href="/order">Order now</a>
              </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen drawer ───────────────────────────────── */}
      {/* Slides in from top: translateY(-100%) → translateY(0) over 400ms */}
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        inert={!drawerOpen}
        className={cn(
          "fixed inset-0 z-[60] lg:hidden flex flex-col",
          "bg-[var(--bg-surface-sunken)] backdrop-blur-[20px]",
          // Slide from top — 400ms with specified cubic-bezier
          "transition-transform duration-[400ms]",
          "[transition-timing-function:cubic-bezier(0.7,0,0.2,1)]",
          drawerOpen ? "translate-y-0" : "-translate-y-full",
        )}
      >
        {/* Drawer top row — mirrors the mobile header bar: a back-arrow button
            on the left (same sm-scale circle as the hamburger it replaces) and
            the text logo pinned dead-centre (same size + position as the bar). */}
        <div className="relative h-14 px-3 flex items-center border-b border-[var(--border-subtle)] shrink-0">

          {/* Left — go-back arrow (closes the drawer); matches the hamburger */}
          <button
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className={cn(
              "flex items-center justify-center shrink-0",
              "h-8 w-8 rounded-full border border-[var(--border-strong)]",
              "text-[var(--text-primary)] hover:border-[var(--border-focus)]",
              "transition-colors duration-[150ms] ease-out focus-ring cursor-pointer",
            )}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>

          {/* Centre — text logo, pinned to the dead centre of the row */}
          <a
            href={homeHref}
            onClick={closeDrawer}
            aria-label={onHome ? "Boba Bear — scroll to top" : "Boba Bear — home"}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "flex items-center focus-ring rounded-sm",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logos/boba-bear-text.svg"
              alt="Boba Bear"
              decoding="async"
              className="h-[38px] w-auto select-none"
              draggable={false}
            />
          </a>
        </div>

        {/* Drawer link stack */}
        <nav
          aria-label="Mobile navigation"
          className="flex-1 overflow-y-auto px-6 pt-10"
        >
          <ul className="flex flex-col" role="list">
            {NAV_LINKS.map(({ label, href, id, num }) => (
              <li key={id}>
                <a
                  href={sectionHref(href)}
                  onClick={closeDrawer}
                  aria-current={activeLinkId === id ? "page" : undefined}
                  className={cn(
                    "flex items-baseline justify-between pb-3 mb-3",
                    "border-b border-[var(--border-subtle)]",
                    "transition-colors duration-[150ms] ease-out focus-ring rounded-sm",
                    activeLinkId === id
                      ? "text-[var(--text-label)]"
                      : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  <span className="font-display text-[30px] leading-tight">{label}</span>
                  <span className="font-mono text-[11px] tracking-widest text-[var(--text-tertiary)] opacity-50 pb-1">
                    {num}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Drawer bottom — full-width CTA + sign-in link (theme toggle now
            lives in the bar) */}
        <div className="shrink-0 px-6 pb-10 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-3">
          <Button
            asChild
            variant="primary"
            size="lg"
            className="w-full justify-center"
          >
            <a href="/order" onClick={closeDrawer}>
              Order now
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
            </a>
          </Button>
          <a
            href="/order/orders/"
            onClick={closeDrawer}
            className={cn(
              "font-body font-semibold text-[14px] text-center py-2 rounded-md",
              "text-[var(--text-primary)] hover:text-[var(--text-label)]",
              "transition-colors duration-[150ms] ease-out focus-ring",
            )}
          >
            Orders
          </a>
          <a
            href="/login"
            onClick={closeDrawer}
            className={cn(
              "font-body font-semibold text-[14px] text-center py-2 rounded-md",
              "text-[var(--text-primary)] hover:text-[var(--text-label)]",
              "transition-colors duration-[150ms] ease-out focus-ring",
            )}
          >
            Sign in
          </a>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CircleThemeButton({
  isLight,
  onClick,
  className,
}: {
  isLight: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex items-center justify-center",
        "h-[38px] w-[38px] rounded-full border border-[var(--border-strong)]",
        "text-[var(--text-primary)] hover:border-[var(--border-focus)]",
        "transition-colors duration-[150ms] ease-out focus-ring cursor-pointer",
        className,
      )}
    >
      {isLight
        ? <Moon size={16} strokeWidth={2} />
        : <Sun  size={16} strokeWidth={2} />
      }
    </button>
  );
}
