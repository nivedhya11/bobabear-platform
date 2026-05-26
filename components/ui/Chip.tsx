/**
 * Chip — §9 Boba Bear Design System
 *
 * Shape   : radius/full pill
 * Sizes   : sm (py-1 px-3) | md (py-1.5 px-3.5)
 * Default : bg-section + text-secondary
 * Active  : bg-interactive-primary + text-on-primary
 * Aurora  : soft fill (70 % opacity) + text-primary — for merch / drop tags
 *
 * Renders as <span> by default. Pass onClick for interactive chips.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type AuroraColor =
  | "rose"
  | "peach"
  | "butter"
  | "mint"
  | "sky"
  | "lavender";

export type ChipSize = "sm" | "md";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  /** Aurora pastel variant — replaces the default/active colour pair. */
  aurora?: AuroraColor;
  size?: ChipSize;
}

// ── Aurora backgrounds (soft fill = 70 % opacity) ───────────────────────────
const auroraStyles: Record<AuroraColor, string> = {
  rose:     "bg-aurora-rose/70     text-primary",
  peach:    "bg-aurora-peach/70    text-primary",
  butter:   "bg-aurora-butter/70   text-primary",
  mint:     "bg-aurora-mint/70     text-primary",
  sky:      "bg-aurora-sky/70      text-primary",
  lavender: "bg-aurora-lavender/70 text-primary",
};

// ── Size styles ──────────────────────────────────────────────────────────────
const sizeStyles: Record<ChipSize, string> = {
  sm: "py-1   px-3   text-body-xs",
  md: "py-1.5 px-3.5 text-body-sm",
};

// ── Interactive touch target ─────────────────────────────────────────────────
// Chips are visually small pills (~24–28 px tall). For touch devices the
// minimum tap target is 44 × 44 px (WCAG 2.5.5). We expand the effective
// hit area with a transparent pseudo-element rather than altering the pill's
// visible padding (which would break the design). The `relative` + `after:`
// trick keeps the visual layout unchanged while the overlay catches taps.
const interactiveTouchTarget =
  "relative after:absolute after:inset-0 after:-m-[8px] after:rounded-full after:content-['']";

// ── Component ────────────────────────────────────────────────────────────────
export function Chip({
  active = false,
  aurora,
  size = "md",
  className,
  ...props
}: ChipProps) {
  const isInteractive = !!props.onClick;

  return (
    <span
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={cn(
        // Shape — radius/full pill
        "inline-flex items-center rounded-full",
        // Typography — Nunito 600
        "font-body font-semibold",
        // Transition + touch-target expansion for interactive chips
        isInteractive &&
          cn(
            "cursor-pointer transition-[background-color,color] duration-[150ms] ease-out focus-ring",
            interactiveTouchTarget,
          ),
        // Colour — aurora overrides default/active
        aurora
          ? auroraStyles[aurora]
          : active
            ? "bg-interactive-primary text-on-primary"
            : "bg-section text-secondary",
        // Size
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
