"use client";

/**
 * Nav — unified BOBA Direct customer chrome (IMP-028A).
 *
 * Primary destinations (same on Home, /login, /privacy, /order*):
 *   Menu | Drops | Sign In or My BOBA | Cart
 *
 * Session mapping uses existing IMP-009 `fetchCustomerSession` /
 * `signOutCustomer`. Pending chrome is anonymous-safe. My BOBA is a
 * disclosure (My Orders, Sign Out), not a /my-boba route.
 */

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu, ArrowLeft, Sun, Moon, Bag } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useCustomerChromeSession } from "@/lib/customer-auth/chrome-session";
import { getActiveCart } from "@/lib/customer-commerce";
import { cartUnitCount } from "@/components/ordering/cart-presentation";
import { subscribeToCartCount } from "@/components/ordering/cart-count-sync";
import { NavDeliverToOrientation } from "@/components/ordering/DeliverToOrientation";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

const PRIMARY_NAV_LINKS = [
  { label: "Menu", href: "/order/", id: "menu", num: "01" },
  { label: "Drops", href: "/#drops", id: "drops", num: "02" },
] as const;

const CART_HREF = "/order/cart/";
const MY_ORDERS_HREF = "/order/orders/";
const PROFILE_HREF = "/account/profile/";
const ADDRESSES_HREF = "/account/addresses/";
const SIGN_IN_HREF = "/login/";

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

const getThemeSnapshot = () => document.documentElement.classList.contains("light");
const getServerSnapshot = () => false;

function chromeLinkClass(active: boolean): string {
  return cn(
    "font-body font-semibold text-[14px] leading-none",
    "px-3 py-1 rounded-md inline-block",
    "transition-colors duration-[150ms] ease-out focus-ring",
    active
      ? "text-[var(--text-label)]"
      : "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
  );
}

function isMenuPath(pathname: string): boolean {
  return pathname === "/order" || pathname === "/order/";
}

function isCartPath(pathname: string): boolean {
  return pathname.startsWith("/order/cart");
}

function isOrdersPath(pathname: string): boolean {
  return pathname.startsWith("/order/orders");
}

function isProfilePath(pathname: string): boolean {
  return pathname.startsWith("/account/profile");
}

function isAddressesPath(pathname: string): boolean {
  return pathname.startsWith("/account/addresses");
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/login/";
}

export function Nav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myBobaOpen, setMyBobaOpen] = useState(false);
  const { session, signOut } = useCustomerChromeSession();
  const authenticated = session === "authenticated";
  const [cartCount, setCartCount] = useState(0);

  const isLight = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  const toggleTheme = () => {
    const next = !isLight;
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* localStorage blocked — fall back to in-session only */
    }
  };

  const drawerRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const myBobaRef = useRef<HTMLDivElement>(null);
  const myBobaMenuId = useId();

  const pathname = usePathname();
  const onHome = pathname === "/";
  const homeHref = onHome ? "#top" : "/";
  const menuActive = isMenuPath(pathname);
  const cartActive = isCartPath(pathname);
  const ordersActive = isOrdersPath(pathname);
  const profileActive = isProfilePath(pathname);
  const addressesActive = isAddressesPath(pathname);
  const signInActive = isLoginPath(pathname);
  const orderingChrome = pathname.startsWith("/order");

  useEffect(() => {
    const cancelled = false;
    void getActiveCart(DIRECT_ORDERING_BRAND_ID, { guestToken: true }).then((result) => {
      if (!cancelled && result.ok) setCartCount(cartUnitCount(result.data.cart));
    });
    return subscribeToCartCount(setCartCount);
  }, []);

  const cartLabel = `Cart (${cartCount})`;

  useEffect(() => {
    if (!drawerOpen) {
      document.documentElement.style.overflow = "";
      return;
    }

    document.documentElement.style.overflow = "hidden";
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const drawer = drawerRef.current;
    const focusables = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

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

  useEffect(() => {
    if (!drawerOpen && lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!myBobaOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (myBobaRef.current && !myBobaRef.current.contains(event.target as Node)) {
        setMyBobaOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMyBobaOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [myBobaOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  async function handleChromeSignOut(): Promise<void> {
    await signOut();
    setMyBobaOpen(false);
    closeDrawer();
  }

  const accountControl = authenticated ? (
    <div className="relative" ref={myBobaRef}>
      <button
        type="button"
        aria-expanded={myBobaOpen}
        aria-controls={myBobaMenuId}
        aria-haspopup="true"
        onClick={() => setMyBobaOpen((open) => !open)}
        className={chromeLinkClass(myBobaOpen || ordersActive || profileActive || addressesActive)}
      >
        My BOBA
      </button>
      {myBobaOpen ? (
        <div
          id={myBobaMenuId}
          role="menu"
          aria-label="My BOBA"
          className={cn(
            "absolute right-0 top-full mt-2 z-50 min-w-[11rem]",
            "rounded-md border border-[var(--border-subtle)]",
            "bg-[var(--bg-page)] py-1 shadow-lg",
          )}
        >
          <a
            role="menuitem"
            href={PROFILE_HREF}
            className={cn(
              "block px-3 py-2 font-body font-semibold text-[14px] focus-ring rounded-sm",
              "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
            )}
          >
            Profile
          </a>
          <a
            role="menuitem"
            href={ADDRESSES_HREF}
            className={cn(
              "block px-3 py-2 font-body font-semibold text-[14px] focus-ring rounded-sm",
              "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
            )}
          >
            Addresses
          </a>
          <a
            role="menuitem"
            href={MY_ORDERS_HREF}
            className={cn(
              "block px-3 py-2 font-body font-semibold text-[14px] focus-ring rounded-sm",
              "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
            )}
          >
            My Orders
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleChromeSignOut()}
            className={cn(
              "block w-full text-left px-3 py-2 font-body font-semibold text-[14px] focus-ring rounded-sm",
              "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)] cursor-pointer",
            )}
          >
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  ) : (
    <a href={SIGN_IN_HREF} className={chromeLinkClass(signInActive)}>
      Sign In
    </a>
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40",
          "h-14 lg:h-16",
          "bg-page/[0.86] backdrop-blur-[14px]",
          "border-b border-border-subtle",
        )}
      >
        <div className={cn("mx-auto h-full px-3 md:px-8", orderingChrome ? "max-w-[1620px]" : "max-w-[1280px] lg:px-12")}>
          <div className="hidden lg:flex items-center gap-5 xl:gap-6 h-full min-w-0 flex-1">
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

            <nav
              aria-label="Main navigation"
              className="flex min-w-0 flex-1 items-center justify-between gap-5"
            >
              <ul className="flex items-center gap-0.5 shrink-0" role="list">
                {PRIMARY_NAV_LINKS.map((link) => {
                  const active = link.id === "menu" ? menuActive : false;
                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={chromeLinkClass(active)}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>

              {orderingChrome ? <NavDeliverToOrientation /> : null}

              <ul className="flex items-center gap-0.5 shrink-0" role="list">
                <li>{accountControl}</li>
                <li>
                  <a
                    href={CART_HREF}
                    aria-current={cartActive ? "page" : undefined}
                    className={cn(chromeLinkClass(cartActive), "relative inline-flex min-h-10 items-center gap-2 border border-[var(--border-strong)] px-3")}
                  >
                    <Bag aria-hidden="true" size={18} strokeWidth={1.8} />
                    <span className="sr-only">{cartLabel}</span>
                    <span aria-hidden="true" className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--interactive-secondary)] px-1 text-[11px] font-bold text-[var(--text-on-secondary)]">{cartCount}</span>
                  </a>
                </li>
              </ul>
            </nav>

            <CircleThemeButton isLight={isLight} onClick={toggleTheme} />
          </div>

          <div className="relative flex lg:hidden items-center justify-between h-full">
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

            <a
              href={CART_HREF}
              aria-current={cartActive ? "page" : undefined}
              className={cn(
                "font-body font-semibold text-[14px] leading-none shrink-0",
                "min-h-10 px-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)]",
                "transition-colors duration-[150ms] ease-out focus-ring",
                cartActive
                  ? "text-[var(--text-label)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
              )}
            >
              <Bag aria-hidden="true" size={18} strokeWidth={1.8} />
              <span aria-hidden="true" className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--interactive-secondary)] px-1 text-[11px] font-bold text-[var(--text-on-secondary)]">{cartCount}</span>
            </a>
          </div>
        </div>
      </header>

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
          "transition-transform duration-[400ms]",
          "[transition-timing-function:cubic-bezier(0.7,0,0.2,1)]",
          drawerOpen ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="relative h-14 px-3 flex items-center border-b border-[var(--border-subtle)] shrink-0">
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

        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-6 pt-10">
          <ul className="flex flex-col" role="list">
            {PRIMARY_NAV_LINKS.map((link) => {
              const active = link.id === "menu" ? menuActive : false;
              return (
                <li key={link.id}>
                  <a
                    href={link.href}
                    onClick={closeDrawer}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-baseline justify-between pb-3 mb-3 min-h-11",
                      "border-b border-[var(--border-subtle)]",
                      "transition-colors duration-[150ms] ease-out focus-ring rounded-sm",
                      active
                        ? "text-[var(--text-label)]"
                        : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                    )}
                  >
                    <span className="font-display text-[30px] leading-tight">{link.label}</span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-[11px] tracking-widest text-[var(--text-tertiary)] opacity-50 pb-1"
                    >
                      {link.num}
                    </span>
                  </a>
                </li>
              );
            })}
            <li>
              <a
                href={CART_HREF}
                onClick={closeDrawer}
                aria-current={cartActive ? "page" : undefined}
                className={cn(
                  "flex items-baseline justify-between pb-3 mb-3 min-h-11",
                  "border-b border-[var(--border-subtle)]",
                  "transition-colors duration-[150ms] ease-out focus-ring rounded-sm",
                  cartActive
                    ? "text-[var(--text-label)]"
                    : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                )}
              >
                <span className="font-display text-[30px] leading-tight">{cartLabel}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[11px] tracking-widest text-[var(--text-tertiary)] opacity-50 pb-1"
                >
                  {String(cartCount).padStart(2, "0")}
                </span>
              </a>
            </li>
            {authenticated ? (
              <li className="pt-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] mb-3">
                  My BOBA
                </p>
                <a
                  href={PROFILE_HREF}
                  onClick={closeDrawer}
                  aria-current={profileActive ? "page" : undefined}
                  className={cn(
                    "flex items-center min-h-11 pb-3 mb-3",
                    "border-b border-[var(--border-subtle)]",
                    "font-display text-[24px] leading-tight focus-ring rounded-sm",
                    profileActive
                      ? "text-[var(--text-label)]"
                      : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  Profile
                </a>
                <a
                  href={ADDRESSES_HREF}
                  onClick={closeDrawer}
                  aria-current={addressesActive ? "page" : undefined}
                  className={cn(
                    "flex items-center min-h-11 pb-3 mb-3",
                    "border-b border-[var(--border-subtle)]",
                    "font-display text-[24px] leading-tight focus-ring rounded-sm",
                    addressesActive
                      ? "text-[var(--text-label)]"
                      : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  Addresses
                </a>
                <a
                  href={MY_ORDERS_HREF}
                  onClick={closeDrawer}
                  aria-current={ordersActive ? "page" : undefined}
                  className={cn(
                    "flex items-center min-h-11 pb-3 mb-3",
                    "border-b border-[var(--border-subtle)]",
                    "font-display text-[24px] leading-tight focus-ring rounded-sm",
                    ordersActive
                      ? "text-[var(--text-label)]"
                      : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  My Orders
                </a>
                <button
                  type="button"
                  onClick={() => void handleChromeSignOut()}
                  className={cn(
                    "flex items-center min-h-11 w-full text-left",
                    "font-display text-[24px] leading-tight focus-ring rounded-sm cursor-pointer",
                    "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  Sign Out
                </button>
              </li>
            ) : (
              <li>
                <a
                  href={SIGN_IN_HREF}
                  onClick={closeDrawer}
                  aria-current={signInActive ? "page" : undefined}
                  className={cn(
                    "flex items-baseline justify-between pb-3 mb-3 min-h-11",
                    "border-b border-[var(--border-subtle)]",
                    "transition-colors duration-[150ms] ease-out focus-ring rounded-sm",
                    signInActive
                      ? "text-[var(--text-label)]"
                      : "text-[var(--text-primary)] hover:text-[var(--text-label)]",
                  )}
                >
                  <span className="font-display text-[30px] leading-tight">Sign In</span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[11px] tracking-widest text-[var(--text-tertiary)] opacity-50 pb-1"
                  >
                    04
                  </span>
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}

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
      {isLight ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
    </button>
  );
}
