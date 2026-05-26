/**
 * Footer — editorial closer for the landing page.
 *
 * Five-column desktop grid:
 *   1. Brand    — full Boba Bear logo (mascot + wordmark lockup),
 *                 italic tagline, and a quiet "Follow @boba.bearofficial"
 *                 link with an Instagram glyph.
 *   2. The Menu — chapter links (Bar, Plates, Sweet, Vegan / gluten).
 *   3. The Bear — brand-side links (Artists, Press, Careers).
 *   4. Find Us  — address, hours, phone (each on its own line).
 *   5. Newsletter — italic blurb + bordered signup card.
 *
 * Bottom strip carries copyright, legal links, and a "made in Delhi · by
 * humans" credit in mono uppercase.
 *
 * Mounted in app/layout.tsx so it renders on every route.
 */

import { FooterNewsletter } from "@/components/FooterNewsletter";
import { Reveal } from "@/components/motion/Reveal";
import { Instagram, MapPin, Clock, Phone, Mail } from "@/components/icons";
import { CONTACT } from "@/lib/site";

// ── Data ─────────────────────────────────────────────────────────────────────

// `disabled` marks links whose destination doesn't exist yet — they render
// inert (no navigation) so they never hit a 404, but keep their hover styling.
// Section links are root-relative ("/#bar") so they work from any route:
// on the homepage the browser scrolls to the fragment; from /privacy etc. it
// returns home first, then scrolls.
const MENU_LINKS = [
  { label: "Boba drinks",    href: "/#bar",    disabled: false },
  { label: "K-Street",       href: "/#plates", disabled: false },
  { label: "Beary sweet",    href: "/#sweet",  disabled: false },
  { label: "Vegan / gluten", href: "/#menu",   disabled: true  },
] as const;

const BEAR_LINKS = [
  { label: "Artists", href: "/#artists", disabled: false },
  { label: "Press",   href: "/press",    disabled: true  },
  { label: "Careers", href: "/careers",  disabled: true  },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy",       href: "/privacy",       disabled: false },
  { label: "Terms",         href: "/terms",         disabled: true  },
  { label: "Accessibility", href: "/accessibility", disabled: true  },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

// ── Sub-components ─────────────────────────────────────────────────────────

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
      {children}
    </p>
  );
}

/** Footer link. When `disabled` (its page isn't live yet) it renders as inert
 *  text — no href, so a click goes nowhere and never hits a 404 — while the
 *  hover styling from `className` is preserved. */
function FooterLink({
  href,
  disabled,
  className,
  children,
}: {
  href: string;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    // Not live yet → inert, visibly de-emphasised, and non-hoverable so it
    // never reads as a working link.
    return (
      <span
        role="link"
        aria-disabled="true"
        className={`${className} opacity-40 pointer-events-none`}
      >
        {children}
      </span>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** "Find Us" row — a leading icon paired with one or more address lines.
 *  The icon sits in a box exactly one line tall and is centred within it, so it
 *  aligns to the first text line whether the row is one line (hours, phone) or
 *  two (address). */
function FindUsRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 flex h-6 items-center text-[var(--text-tertiary)]">
        {icon}
      </span>
      <span className="font-body text-[14px] leading-6 text-[var(--text-secondary)]">
        {children}
      </span>
    </div>
  );
}

/** Quiet inline Instagram link — replaces the loud pill on small screens. */
function FollowLink() {
  return (
    <a
      href="https://instagram.com/boba.bearofficial"
      target="_blank"
      rel="noopener"
      className={[
        "inline-flex items-center gap-2",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.16em]",
        "text-[var(--text-secondary)]",
        "hover:text-[var(--interactive-secondary)]",
        "transition-colors duration-[150ms] ease-out",
        "focus-ring rounded-sm",
      ].join(" ")}
    >
      <Instagram size={16} strokeWidth={1.9} aria-hidden />
      Follow @boba.bearofficial
    </a>
  );
}

/** Mobile / tablet footer — single centred column, < lg only. */
function MobileFooter() {
  return (
    <div className="lg:hidden mx-auto max-w-[460px] px-5 py-14 flex flex-col items-center text-center gap-9">

      {/* Full logo — mascot + wordmark lockup */}
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logos/boba-bear-full-logo.svg"
          alt="Boba Bear"
          loading="lazy"
          decoding="async"
          className="w-[150px] h-auto drop-shadow-md select-none"
          draggable={false}
        />
        <p className="font-heading italic text-[15px] text-[var(--text-secondary)] leading-[1.45] max-w-[280px]">
          Indo-Korean kitchen, boba bar &amp; merch. IST. 2026 · Dehradun.
        </p>
      </div>

      {/* Join the community — the primary action */}
      <div className="w-full flex flex-col gap-4 text-left">
        <ColHeading>Join the circle</ColHeading>
        <FooterNewsletter />
      </div>

      {/* Quiet Instagram follow */}
      <FollowLink />

      {/* Required link lists */}
      <div className="w-full grid grid-cols-2 gap-x-6 gap-y-5 text-left pt-9 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col gap-4">
          <ColHeading>The Menu</ColHeading>
          <ul className="flex flex-col gap-3">
            {MENU_LINKS.map(({ label, href, disabled }) => (
              <li key={href}>
                <FooterLink
                  href={href}
                  disabled={disabled}
                  className="font-body text-body-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
                >
                  {label}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <ColHeading>The Bear</ColHeading>
          <ul className="flex flex-col gap-3">
            {BEAR_LINKS.map(({ label, href, disabled }) => (
              <li key={href}>
                <FooterLink
                  href={href}
                  disabled={disabled}
                  className="font-body text-body-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
                >
                  {label}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Find us */}
      <address className="not-italic w-full flex flex-col gap-4 text-left pt-9 border-t border-[var(--border-subtle)]">
        <ColHeading>Find Us</ColHeading>
        <FindUsRow icon={<MapPin size={16} strokeWidth={1.75} aria-hidden />}>
          ISBT · Dehradun 248001
        </FindUsRow>
        <FindUsRow icon={<Clock size={16} strokeWidth={1.75} aria-hidden />}>
          12pm — 12am
        </FindUsRow>
        <FindUsRow icon={<Phone size={16} strokeWidth={1.75} aria-hidden />}>
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
          >
            {CONTACT.phoneDisplay}
          </a>
        </FindUsRow>
        <FindUsRow icon={<Mail size={16} strokeWidth={1.75} aria-hidden />}>
          <a
            href={`mailto:${CONTACT.email}`}
            className="hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out break-all"
          >
            {CONTACT.email}
          </a>
        </FindUsRow>
      </address>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-[var(--bg-page)] border-t border-[var(--border-subtle)]">

      {/* ── Mobile / tablet footer (< lg) ────────────────────────────────
          Centred editorial stack: full logo (mascot + wordmark), community
          form as the hero action, a quiet Instagram link, then the required
          link lists + address. The desktop grid below is untouched. */}
      <Reveal as="div" y={20} className="lg:hidden">
        <MobileFooter />
      </Reveal>

      {/* ── Desktop footer (≥ lg) — single compact row, three zones ────────
          Brand lockup · link groups · community form, aligned on one row so
          the footer stays tight. Mirrors the mobile content; reads premium.
          The whole row rises in as you reach the end of the issue (motion). */}
      <Reveal as="div" y={20} className="hidden lg:block">
      <div className="lg:grid grid-cols-12 gap-x-10 items-start max-w-[1240px] mx-auto px-14 py-14">

        {/* Zone 1 — brand lockup */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logos/boba-bear-full-logo.svg"
            alt="Boba Bear"
            loading="lazy"
            decoding="async"
            className="w-[112px] h-auto drop-shadow-md select-none"
            draggable={false}
          />
          <p className="font-heading italic text-[14px] text-[var(--text-secondary)] leading-[1.5] max-w-[260px]">
            Indo-Korean kitchen, boba bar &amp; merch. Ist. 2026 · Dehradun.
          </p>
          <FollowLink />
        </div>

        {/* Zone 2 — link groups */}
        <div className="col-span-5 flex gap-10 xl:gap-12">
          <div className="flex flex-col gap-4">
            <ColHeading>The Menu</ColHeading>
            <ul className="flex flex-col gap-2.5">
              {MENU_LINKS.map(({ label, href, disabled }) => (
                <li key={href}>
                  <FooterLink
                    href={href}
                    disabled={disabled}
                    className="font-body text-body-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
                  >
                    {label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <ColHeading>The Bear</ColHeading>
            <ul className="flex flex-col gap-2.5">
              {BEAR_LINKS.map(({ label, href, disabled }) => (
                <li key={href}>
                  <FooterLink
                    href={href}
                    disabled={disabled}
                    className="font-body text-body-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
                  >
                    {label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <address className="not-italic flex flex-col gap-4">
            <ColHeading>Find Us</ColHeading>
            <div className="flex flex-col gap-2.5">
              <FindUsRow icon={<MapPin size={16} strokeWidth={1.75} aria-hidden />}>
                <span className="block">ISBT</span>
                <span className="block">Dehradun · 248001</span>
              </FindUsRow>
              <FindUsRow icon={<Clock size={16} strokeWidth={1.75} aria-hidden />}>
                12pm — 12am
              </FindUsRow>
              <FindUsRow icon={<Phone size={16} strokeWidth={1.75} aria-hidden />}>
                <a
                  href={`tel:${CONTACT.phoneE164}`}
                  className="hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out"
                >
                  {CONTACT.phoneDisplay}
                </a>
              </FindUsRow>
              <FindUsRow icon={<Mail size={16} strokeWidth={1.75} aria-hidden />}>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="hover:text-[var(--text-primary)] transition-colors duration-[150ms] ease-out break-all"
                >
                  {CONTACT.email}
                </a>
              </FindUsRow>
            </div>
          </address>
        </div>

        {/* Zone 3 — community form */}
        <div className="col-span-4 flex flex-col gap-3">
          <ColHeading>Join the circle</ColHeading>
          <FooterNewsletter />
        </div>

      </div>
      </Reveal>

      {/* ── Bottom strip ─────────────────────────────────────────────── */}
      <div className="border-t border-[var(--border-subtle)]">
        <div
          className={[
            "mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14",
            "py-6",
            "flex flex-col items-center text-center md:flex-row md:items-center md:text-left md:justify-between gap-3 md:gap-6",
            "font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]",
          ].join(" ")}
        >
          {/* Left — copyright */}
          <p>© {CURRENT_YEAR} Boba Bear · All rights, no apologies</p>

          {/* Center — legal */}
          <nav aria-label="Legal" className="flex items-center gap-3">
            {LEGAL_LINKS.map(({ label, href, disabled }, i) => (
              <span key={href} className="flex items-center gap-3">
                <FooterLink
                  href={href}
                  disabled={disabled}
                  className="hover:text-[var(--text-secondary)] transition-colors duration-[150ms] ease-out"
                >
                  {label}
                </FooterLink>
                {i < LEGAL_LINKS.length - 1 && (
                  <span aria-hidden="true" className="opacity-50">·</span>
                )}
              </span>
            ))}
          </nav>

          {/* Right — credit */}
          <p>Made in Bharat · By Unbothered humans</p>
        </div>
      </div>

    </footer>
  );
}
