"use client";

/**
 * AccessCTA — Chapter 05 · End of Issue · Start of Order
 *
 * Closing editorial chapter that converts. Three access channels
 * (Zomato, Swiggy, WhatsApp) rendered as quiet tap-targets — the
 * brand wordmark is the call-to-action; no button chrome.
 *
 * Platform URLs are the live ordering links (Zomato/Swiggy storefronts and
 * the WhatsApp deep link with a prefilled "Catch the Drop" message).
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "@/components/icons";
import {
  RevealStagger,
  RevealChild,
  EASE_OUT,
} from "@/components/motion/Reveal";
import { trackEvent } from "@/components/Analytics";

// ── Platform data ─────────────────────────────────────────────────────────────
interface Platform {
  id:        string;
  eyebrow:   string;       // "↳ Delivery via" / "↳ Ping the bear"
  wordmark:  string;       // Rendered in the display font
  color:     string;       // Brand-tinted hex
  href:      string;
  ariaLabel: string;
}

const PLATFORMS: Platform[] = [
  {
    id:        "zomato",
    eyebrow:   "Delivery via",
    wordmark:  "Zomato",
    color:     "#FF6F7E",
    href:      "https://link.zomato.com/xqzv/rshare?id=12538351530563d18",
    ariaLabel: "Order Boba Bear on Zomato (opens in new tab)",
  },
  {
    id:        "swiggy",
    eyebrow:   "Delivery via",
    wordmark:  "Swiggy",
    color:     "#FC8019",
    href:      "https://www.swiggy.com/direct/brand/730987?source=swiggy-direct&subSource=generic",
    ariaLabel: "Order Boba Bear on Swiggy (opens in new tab)",
  },
  {
    id:        "whatsapp",
    eyebrow:   "Ping the bear",
    wordmark:  "WhatsApp",
    color:     "#3CE07E",
    href:      "https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21",
    ariaLabel: "Message Boba Bear on WhatsApp (opens in new tab)",
  },
];

// ── Access card ───────────────────────────────────────────────────────────────
function AccessCard({ platform, index }: { platform: Platform; index: number }) {
  const reduce = useReducedMotion() ?? false;
  const { eyebrow, wordmark, color, href, ariaLabel } = platform;

  const card = (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={ariaLabel}
      onClick={() => trackEvent(`${platform.id}_click`, { location: "access_cta" })}
      className={[
        "group relative block focus-ring",
        "bg-[var(--bg-section)] border border-[var(--border-default)]",
        // Mobile: compact so all three fit one screen. md+ stays tall/generous.
        "min-h-[104px] md:min-h-[300px] lg:min-h-[320px]",
        "p-4 md:p-7 lg:p-8",
        "flex flex-col justify-between",
        // Hover: lift + border warms + soft glow in the brand colour
        "transition-[transform,border-color,box-shadow] duration-[250ms] ease-out",
        "hover:-translate-y-1 hover:border-[var(--border-strong)]",
      ].join(" ")}
      style={{
        // Hover glow uses the platform's own colour, softened
        ["--card-glow" as string]: `${color}40`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 12px 32px var(--card-glow)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Top — eyebrow (left) + circular access arrow (right corner) */}
      <div className="flex items-start justify-between gap-4">
        <span
          className={[
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            "text-[var(--text-tertiary)]",
            "flex items-center gap-1.5 pt-1.5",
          ].join(" ")}
        >
          <span aria-hidden="true">↳</span>
          {eyebrow}
        </span>

        <span
          aria-hidden
          className={[
            "shrink-0 flex items-center justify-center",
            "w-9 h-9 md:w-11 md:h-11 rounded-full border border-[var(--border-strong)]",
            "text-[var(--text-tertiary)]",
            "transition-[transform,color,border-color] duration-[300ms] ease-out",
            "group-hover:text-[var(--text-primary)] group-hover:border-[var(--text-primary)]",
            "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
          ].join(" ")}
        >
          <ArrowUpRight size={18} strokeWidth={2} />
        </span>
      </div>

      {/* Bottom — wordmark (sized so the longest, "WhatsApp", never overflows) */}
      <span
        className={[
          "font-heading leading-[0.95] block",
          "text-[32px] md:text-[clamp(40px,4.2vw,72px)]",
          "transition-transform duration-[300ms] ease-out",
          "group-hover:-rotate-1 group-hover:translate-x-1",
        ].join(" ")}
        style={{ color }}
      >
        {wordmark}
      </span>
    </a>
  );

  if (reduce) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{
        duration: 0.5,
        ease: [0, 0, 0.2, 1],
        delay: Math.min(index * 0.1, 0.3),
      }}
    >
      {card}
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export function AccessCTA() {
  const reduce = useReducedMotion() ?? false;

  return (
    <section id="access" className="bg-[var(--bg-page)]">
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">

        {/* ── Editorial header ─────────────────────────────────────────
            Desktop: heading left · description right (bottom-aligned).
            Mobile : stacks — chapter · heading · description. */}
        <RevealStagger
          as="header"
          stagger={0.1}
          className="mb-14 md:mb-20 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12"
        >
          <div className="flex flex-col gap-5">
            <RevealChild
              as="span"
              y={12}
              className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70 text-[var(--text-primary)]"
            >
              CHAPTER 05 · END OF ISSUE · START OF ORDER
            </RevealChild>

            {/* Two-line display heading. Line 1 cream; line 2 saffron + arrow.
                The arrow SLIDES in from the left after "Door" lands — a final
                "this way →" flourish to close the issue. */}
            <RevealChild
              as="h2"
              y={28}
              duration={0.65}
              className={[
                "font-display leading-[0.95]",
                "text-[var(--text-primary)]",
              ].join(" ")}
            >
              <span className="block text-[clamp(52px,11vw,120px)]">
                pick your
              </span>
              <span className="flex items-center gap-5 md:gap-8">
                <span className="text-[clamp(60px,13vw,140px)] text-[var(--interactive-secondary)]">
                  Door
                </span>
                <motion.span
                  className="inline-flex shrink-0"
                  initial={reduce ? false : { opacity: 0, x: -28 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "0px 0px -12% 0px" }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.45 }}
                >
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2}
                    className="shrink-0 text-[var(--interactive-secondary)] w-[clamp(48px,8vw,96px)] h-[clamp(48px,8vw,96px)]"
                  />
                </motion.span>
              </span>
            </RevealChild>
          </div>

          <RevealChild
            as="p"
            y={18}
            className={[
              "font-heading leading-[1.45]",
              "text-[16px] md:text-[19px]",
              "text-[var(--text-secondary)]",
              "max-w-[520px] lg:max-w-[340px] lg:text-right lg:pb-3",
            ].join(" ")}
          >
            Three ways in. Same bear, same boba. The bear doesn&rsquo;t care
            which one — the cup arrives either way.
          </RevealChild>
        </RevealStagger>

        {/* ── 3-card grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
          {PLATFORMS.map((p, i) => (
            <AccessCard key={p.id} platform={p} index={i} />
          ))}
        </div>

      </div>
    </section>
  );
}
