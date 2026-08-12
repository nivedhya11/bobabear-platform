"use client";

/**
 * Toggle — §9 Boba Bear Design System
 *
 * A pill-shaped toggle/tab used for category switching (e.g. The Plates tabs).
 *
 * Geometry : radius/full pill · px-4 py-2
 * Type     : JetBrains Mono, 11 px, uppercase, tracking 0.12em
 * Selected : cream fill (text-primary) + bg-page text + cream border
 * Default  : transparent fill + text-primary + subtle border (strong on hover)
 *
 * Renders a <button>. Pass `selected` to flip into the active state; all other
 * button/aria props (role="tab", aria-selected, onClick) pass straight through.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Active/selected state — cream fill with dark text. */
  selected?: boolean;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ selected = false, className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected ? "true" : undefined}
        className={cn(
          // Layout + shape
          "inline-flex items-center justify-center cursor-pointer",
          "px-4 py-2 rounded-full border",
          // Typography — JetBrains Mono 11 px uppercase
          "font-mono text-[11px] uppercase tracking-[0.12em] leading-none",
          // Transition + focus ring
          "transition-colors duration-[150ms] ease-out focus-ring",
          // State colours
          selected
            ? "bg-[var(--text-primary)] text-[var(--bg-page)] border-[var(--text-primary)]"
            : "bg-transparent text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Toggle.displayName = "Toggle";
