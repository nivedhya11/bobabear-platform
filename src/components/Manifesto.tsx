"use client";

/**
 * Manifesto — quiet section between Ticker and Drops.
 *
 * Single centred quote + a display signature. The quote is Bubblegum Sans
 * (upright, not italic) per the updated design. Highlight word ("UNBOTHERED")
 * flips with the theme via --interactive-primary — Firefly-400 in dark,
 * Firefly-600 in light.
 *
 * Signature "Boba Bear" is Luckiest Guy in saffron (--interactive-secondary).
 *
 * Motion: this is the page's first "breath" after the hero, so the reveal is
 * deliberate — the quote settles word by word as it scrolls into view (a
 * confident, unhurried pace that mirrors the copy), then the signature lands
 * last with a gentle overshoot, like a stamp. Reduced motion renders the
 * final, static state (handled by the Reveal primitives).
 */

import { Fragment } from "react";
import { Reveal, RevealStagger, RevealChild } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

// The brand word "UNBOTHERED" (echoing the hero H1) is tinted Firefly via
// --interactive-primary. HIGHLIGHT must match the rendered word exactly.
const QUOTE =
  "Drop-day runs. Late-night hustle. Only the UNBOTHERED give main character energy.";
const HIGHLIGHT = "UNBOTHERED";

export function Manifesto() {
  const words = QUOTE.split(" ");

  return (
    <section
      className={[
        "w-full text-center",
        "bg-[var(--bg-section)]",
        "border-y border-[var(--border-subtle)]",
        "px-5 py-16 md:px-10 md:py-[100px]",
      ].join(" ")}
    >
      <RevealStagger
        as="p"
        stagger={0.04}
        className={[
          "font-heading leading-[1.22]",
          "text-[clamp(24px,4.4vw,48px)]",
          "max-w-[900px] mx-auto",
          "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            <RevealChild
              as="span"
              y={14}
              className={cn(
                "inline-block",
                word === HIGHLIGHT && "text-[var(--interactive-primary)]",
              )}
            >
              {word}
            </RevealChild>
            {i < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </RevealStagger>

      <Reveal
        as="p"
        y={24}
        spring
        delay={0.45}
        className={[
          "font-display leading-none mt-6",
          "text-[clamp(36px,6vw,64px)]",
          "text-[var(--interactive-secondary)] opacity-90",
        ].join(" ")}
      >
        Boba Bear
      </Reveal>
    </section>
  );
}
