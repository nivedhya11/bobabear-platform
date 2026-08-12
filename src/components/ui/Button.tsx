"use client";

/**
 * Button — §9 Boba Bear Design System
 *
 * Variants : primary | secondary | outline | ghost | destructive | link
 * Sizes    : sm (h-8) | md (h-10) | lg (h-12)
 * asChild  : renders the Radix Slot, letting any element take button styles
 *            e.g. <Button asChild><Link href="/menu">View Menu</Link></Button>
 *
 * Typography rule: Nunito 700 only. Luckiest Guy is explicitly forbidden on
 * buttons per §9 and §13 of the design system.
 *
 * Focus: 3 px outline at 2 px offset using --bb-border-focus (via .focus-ring).
 * Hover: 1 px micro-lift + per-variant glow/border change, 150 ms ease-out.
 *
 * link variant: text-only, no background or border. Default state uses
 * text-primary; selected/active state resolves to text-label (Firefly #a8d832).
 * Pass data-selected="true" or the `selected` prop to activate the label colour.
 */

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element as the button root (Radix Slot pattern). */
  asChild?: boolean;
  /** Marks the link variant as selected — resolves to text-label (Firefly green). */
  selected?: boolean;
}

// ── Variant styles ──────────────────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-interactive-primary [color:#1F2C08]",
    // Hover: glow + 1 px lift (lift is shared base style)
    "hover:shadow-glow-firefly",
    // Press: one step darker fill
    "active:bg-interactive-primary-pressed active:shadow-none active:translate-y-0",
  ].join(" "),

  secondary: [
    "bg-interactive-secondary text-on-secondary",
    "hover:shadow-glow-saffron",
    "active:bg-interactive-secondary-hover active:shadow-none active:translate-y-0",
  ].join(" "),

  outline: [
    "bg-transparent text-primary",
    "border-[1.5px] border-border-strong",
    "hover:border-interactive-primary hover:text-interactive-primary",
    "active:translate-y-0",
  ].join(" "),

  ghost: [
    "bg-transparent text-primary",
    "hover:bg-interactive-ghost",
    "active:translate-y-0",
  ].join(" "),

  destructive: [
    "bg-transparent text-destructive",
    "border-[1.5px] border-destructive",
    "hover:bg-destructive/[0.08]",
    "active:translate-y-0",
  ].join(" "),

  link: [
    "bg-transparent",
    "text-primary hover:text-label",
    // Selected state — Firefly green (same as text-label token)
    "data-[selected=true]:text-label",
    // No lift or shadow on link variant
    "hover:translate-y-0 active:translate-y-0",
    "shadow-none hover:shadow-none",
  ].join(" "),
};

// ── Size styles ─────────────────────────────────────────────────────────────
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 gap-1.5 text-body-sm",
  md: "h-10 px-4 gap-2   text-body-md",
  lg: "h-12 px-6 gap-2.5 text-body-lg",
};

// ── Component ───────────────────────────────────────────────────────────────
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      asChild = false,
      selected,
      className,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-selected={selected ? "true" : undefined}
        className={cn(
          // Layout
          "inline-flex items-center justify-center whitespace-nowrap select-none",
          // Typography — Nunito 700 (never Luckiest Guy per §9 + §13)
          "font-body font-bold",
          // Shape — radius/md = 8 px across ALL variants
          "rounded-md",
          // Cursor + disabled
          "cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
          // Hover micro-lift — 1 px up
          "hover:-translate-y-px",
          // Transition — transform · shadow · border-color · bg, 150 ms ease-out
          "transition-[transform,box-shadow,border-color,background-color,color]",
          "duration-[150ms] ease-out",
          // Focus ring — 3 px solid at 2 px offset (defined in globals.css)
          "focus-ring",
          // Variant + size
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
