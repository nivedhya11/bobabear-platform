/**
 * Tag — §9 Boba Bear Design System
 *
 * A solid status pill with a leading dot. Distinct from:
 *   Chip  — section/aurora pills used for filters & merch labels
 *   Badge — outlined status pills (success / warning / error …)
 *
 * Geometry : radius/full pill · px-3 py-1.5 · 6 px dot · gap-2
 * Fill     : interactive-primary (Firefly green) by default
 * Text     : JetBrains Mono, 10 px, uppercase, tracking 0.14em, on-primary
 *
 * Used for "live" markers like "DROPPING SOON" in the Signature Drops section.
 * Pass `pulse` to gently fade the dot (motion-safe) for an active/live feel.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Gently pulse the leading dot (motion-safe) — signals a live status. */
  pulse?: boolean;
}

export function Tag({ pulse = false, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        // Shape — radius/full pill
        "inline-flex items-center gap-2 rounded-full",
        // Spacing — pad 12 × 6
        "px-3 py-1.5",
        // Fill — Firefly green
        "bg-[var(--interactive-primary)] border border-[var(--interactive-primary)]",
        // Typography — JetBrains Mono 10 px uppercase, on-primary text
        "font-mono text-[10px] uppercase tracking-[0.14em] leading-none",
        "text-[var(--text-on-primary)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "block w-1.5 h-1.5 rounded-full bg-[var(--text-on-primary)]",
          pulse && "motion-safe:[animation:tag-pulse_2s_ease-in-out_infinite]",
        )}
      />
      {children}
      {pulse && (
        <style>{`
          @keyframes tag-pulse {
            0%, 100% { opacity: 1;   }
            50%      { opacity: 0.4; }
          }
        `}</style>
      )}
    </span>
  );
}
