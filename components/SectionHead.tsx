"use client";

/**
 * SectionHead — shared chapter heading used by The Bar / Plates / Sweet /
 * Merch / Artists etc.
 *
 * Layout: left column (optional chapter mono label + display heading), right
 * column (description, right-aligned on desktop). Stacks on mobile.
 *
 * The heading is two words — `leading` + `accent`. Each can be styled:
 *   leading : solid text-primary (default) or outline stroke (`leadingOutline`)
 *   accent  : saffron (default) · text-primary (`accentColor="primary"`) ·
 *             outline stroke (`accentOutline`)
 *
 * Patterns in use:
 *   "The Teas" / "K-Street" / "Beary Sweet" → leading solid + accent saffron
 *   "The Merch" / "The Artists"             → leading outline + accent cream
 *
 * Pass `glue` to join the two words with no space (e.g. "K-" + "Street").
 *
 * Motion: every chapter opens the same way — the mono kicker, then the big
 * display heading, then the description rise in sequence as the section scrolls
 * into view. This single component gives all five chapters one shared "the page
 * is turning" beat. Reduced motion renders the final state (see Reveal.tsx).
 */

import { RevealStagger, RevealChild } from "@/components/motion/Reveal";

const OUTLINE_STYLE = {
  WebkitTextStroke: "1.5px var(--text-primary)",
  color: "transparent",
} as const;

export interface SectionHeadProps {
  /** Optional mono chapter label above the heading. Omit to hide it. */
  chapter?: string;
  leading: string;
  accent: string;
  description: string;
  /** Render `accent` as an outline/ghost stroke instead of a solid fill. */
  accentOutline?: boolean;
  /** Render `leading` as an outline/ghost stroke instead of solid text-primary. */
  leadingOutline?: boolean;
  /** Accent fill colour when not outlined. Default "saffron". */
  accentColor?: "saffron" | "primary";
  /** Join `leading` + `accent` with no space (e.g. "K-" + "Street"). */
  glue?: boolean;
  /** Keep `leading accent` on a single line (md+). Slightly smaller cap so
   *  a longer two-word title like "Beary Sweet" never wraps beside the copy. */
  nowrap?: boolean;
}

export function SectionHead({
  chapter,
  leading,
  accent,
  description,
  accentOutline = false,
  leadingOutline = false,
  accentColor = "saffron",
  glue = false,
  nowrap = false,
}: SectionHeadProps) {
  return (
    <RevealStagger
      className={[
        "flex flex-col gap-4 mb-9",
        "lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:mb-14",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3">
        {chapter && (
          <RevealChild
            as="span"
            y={12}
            className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70 text-[var(--text-primary)]"
          >
            {chapter}
          </RevealChild>
        )}
        <RevealChild
          as="h2"
          y={28}
          duration={0.65}
          className={[
            "font-display leading-[0.9]",
            nowrap
              ? "text-[clamp(44px,8.5vw,118px)] md:whitespace-nowrap"
              : "text-[clamp(56px,12vw,140px)]",
            "text-[var(--text-primary)]",
          ].join(" ")}
        >
          {leadingOutline ? (
            <span style={OUTLINE_STYLE}>{leading}</span>
          ) : (
            leading
          )}
          {glue ? "" : " "}
          {accentOutline ? (
            <span style={OUTLINE_STYLE}>{accent}</span>
          ) : (
            <span
              className={
                accentColor === "primary"
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--interactive-secondary)]"
              }
            >
              {accent}
            </span>
          )}
        </RevealChild>
      </div>

      <RevealChild
        as="p"
        y={18}
        className={[
          "font-heading leading-[1.45]",
          "text-[16px] md:text-[19px]",
          "text-[var(--text-secondary)]",
          "max-w-[360px] lg:text-right",
        ].join(" ")}
      >
        {description}
      </RevealChild>
    </RevealStagger>
  );
}
