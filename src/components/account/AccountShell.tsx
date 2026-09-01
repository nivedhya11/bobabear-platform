"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useCustomerChromeSession } from "@/lib/customer-auth/chrome-session";

const PROFILE_HREF = "/account/profile/";
const ADDRESSES_HREF = "/account/addresses/";
const ORDERS_HREF = "/order/orders/";

function navLinkClass(active: boolean): string {
  return cn(
    "font-body text-[14px] font-semibold px-3 py-2 rounded-md focus-ring",
    active
      ? "text-[var(--text-label)] bg-[var(--interactive-ghost-hover)]"
      : "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]",
  );
}

export function AccountShell(props: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useCustomerChromeSession();
  const profileActive = pathname.startsWith("/account/profile");
  const addressesActive = pathname.startsWith("/account/addresses");
  const ordersActive = pathname.startsWith("/order/orders");

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {props.eyebrow ?? "Boba Bear · My BOBA"}
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            {props.title}
          </h1>
        </header>

        <nav aria-label="Account navigation" className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] pb-3">
          <a href={PROFILE_HREF} aria-current={profileActive ? "page" : undefined} className={navLinkClass(profileActive)}>
            Profile
          </a>
          <a
            href={ADDRESSES_HREF}
            aria-current={addressesActive ? "page" : undefined}
            className={navLinkClass(addressesActive)}
          >
            Addresses
          </a>
          <a href={ORDERS_HREF} aria-current={ordersActive ? "page" : undefined} className={navLinkClass(ordersActive)}>
            Orders
          </a>
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(navLinkClass(false), "cursor-pointer")}
          >
            Sign out
          </button>
        </nav>

        {props.children}
      </div>
    </main>
  );
}
