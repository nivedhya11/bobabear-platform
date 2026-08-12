/**
 * Card — §9 Boba Bear Design System
 *
 * Surface  : bg-surface
 * Border   : 1 px border-border, radius/lg (12 px)
 * Overflow : hidden — content die-cuts to corner radius
 * Hover    : 2 px lift · shadow-md · border switches to border-strong
 * Transition: 250 ms ease-out on transform + shadow + border-color
 *
 * Content padding is left to the consumer so the card can hold full-bleed
 * image areas. Use the exported CardBody helper for padded text regions.
 *
 * Never uses #000 or #FFF — all values are palette tokens.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Card root ─────────────────────────────────────────────────────────────────
export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Surface
        "bg-surface",
        // Border + shape
        "border border-border rounded-lg",
        // Clip content to corner radius
        "overflow-hidden",
        // Hover state — 2 px lift · shadow-md · border-strong
        "hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong",
        // Transition — only the properties that animate
        "transition-[transform,box-shadow,border-color] duration-[250ms] ease-out",
        className,
      )}
      {...props}
    />
  );
}

// ── CardBody — padded content region ─────────────────────────────────────────
// Responsive: 16 px mobile · 20 px tablet · 24 px desktop (§9 spec)
export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

export function CardBody({ className, ...props }: CardBodyProps) {
  return (
    <div
      className={cn("p-4 md:p-5 lg:p-6", className)}
      {...props}
    />
  );
}

// ── CardImage — full-bleed image area ────────────────────────────────────────
// Height: 200 px mobile · 240 px tablet+ (§9 spec)
export type CardImageProps = React.HTMLAttributes<HTMLDivElement>;

export function CardImage({ className, ...props }: CardImageProps) {
  return (
    <div
      className={cn(
        "h-[200px] md:h-[240px] bg-section",
        "overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}
