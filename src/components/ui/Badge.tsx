/**
 * Badge — §9 Boba Bear Design System
 *
 * Same geometry as Chip (radius/full pill, Nunito 600).
 * Status variant colour mapping from §9 table — exact roles:
 *
 * | Variant | Background          | Text         | Border           |
 * |---------|---------------------|--------------|------------------|
 * | success | success / 15 % fill | text-success | border-success/40|
 * | warning | warning / 15 % fill | text-warning | border-warning/40|
 * | error   | error   / 15 % fill | text-error   | border-error/40  |
 * | info    | info    / 15 % fill | text-info    | border-info/40   |
 * | neutral | bg-section          | text-tertiary| border-border    |
 *
 * The design system specifies "{Status}/950 at 20 %" for the background.
 * Since only base values are in the token set, we approximate with the base
 * colour at 15 % opacity — same mood, close enough until a full scale ships.
 *
 * Never uses #000 or #FFF — all values are palette tokens.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// ── Status colour map — matches §9 table exactly ─────────────────────────────
const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success/15  text-success  border border-success/40",
  warning: "bg-warning/15  text-warning  border border-warning/40",
  error:   "bg-error/15    text-error    border border-error/40",
  info:    "bg-info/15     text-info     border border-info/40",
  neutral: "bg-section     text-tertiary border border-border",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        // Same geometry as Chip
        "inline-flex items-center rounded-full",
        // Typography — Nunito 600, label/md size
        "font-body font-semibold text-label-md",
        // Spacing — pad/xs = 4 × 8
        "py-1 px-2",
        // Status colours
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
