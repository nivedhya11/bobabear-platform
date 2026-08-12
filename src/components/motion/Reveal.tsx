"use client";

/**
 * Reveal — the house scroll-reveal system for Boba Bear.
 *
 * Three primitives, one motion language. Everything below is a thin wrapper
 * over Framer Motion's `whileInView` so sections "develop" as you scroll the
 * issue from Hero to Access — kicker, headline, body, then content, in order.
 *
 * Motion language (matches the §globals.css tokens):
 *   • travel  : 24 px rise by default (16–32 px range), always paired w/ opacity
 *   • duration: 0.6 s for headers, 0.5 s for items (ease-out, the house curve)
 *   • easing  : EASE_OUT for arrivals · EASE_SPRING for playful settles
 *   • trigger : once, fired ~12 % before the element is fully in view
 *
 * Reduced motion: every primitive short-circuits to a plain element rendered
 * in its final state — no transform, no opacity ramp — honouring the global
 * prefers-reduced-motion contract the rest of the site already keeps.
 *
 *   <Reveal>…</Reveal>                       one element, reveals itself
 *   <RevealStagger><RevealChild/>…</…>       container choreographs its children
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

// House easing — mirrors --ease-out / --ease-spring-gentle in globals.css.
export const EASE_OUT = [0, 0, 0.2, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

// Fire the reveal once, a touch before the element is fully on screen, so the
// motion reads as "already in flight" by the time the reader's eye lands.
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

type MotionTag =
  | "div" | "section" | "article" | "header" | "footer"
  | "h1" | "h2" | "h3" | "p" | "span" | "ul" | "li";

interface CommonProps extends HTMLAttributes<HTMLElement> {
  as?: MotionTag;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

interface RevealProps extends CommonProps {
  /** Vertical travel in px (positive rises up into place). Default 24. */
  y?: number;
  /** Horizontal travel in px. Default 0. */
  x?: number;
  /** Start scale (e.g. 0.94 grows into place). Omit for no scaling. */
  scaleFrom?: number;
  /** Seconds before this element starts. Default 0. */
  delay?: number;
  /** Duration in seconds. Default 0.6. */
  duration?: number;
  /** Use the gentle overshoot curve instead of ease-out. Default false. */
  spring?: boolean;
  /** Re-trigger every time it enters view. Default false (fire once). */
  repeat?: boolean;
}

export function Reveal({
  as = "div",
  className,
  style,
  children,
  y = 24,
  x = 0,
  scaleFrom,
  delay = 0,
  duration = 0.6,
  spring = false,
  repeat = false,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style} {...rest}>
        {children}
      </Plain>
    );
  }

  const scale = scaleFrom != null ? { scale: scaleFrom } : null;
  const Tag = motion[as] as ElementType;
  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y, x, ...scale }}
      whileInView={{ opacity: 1, y: 0, x: 0, ...(scale ? { scale: 1 } : null) }}
      viewport={{ ...REVEAL_VIEWPORT, once: !repeat }}
      transition={{ duration, ease: spring ? EASE_SPRING : EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface RevealStaggerProps extends CommonProps {
  /** Gap between each child's start, seconds. Default 0.08. */
  stagger?: number;
  /** Wait before the first child fires, seconds. Default 0.05. */
  delayChildren?: number;
  /** Re-trigger every time it enters view. Default false (fire once). */
  repeat?: boolean;
}

/**
 * Container that choreographs its RevealChild descendants. The active variant
 * label ("show") propagates to children automatically — children only need to
 * declare matching variants, which RevealChild does.
 */
export function RevealStagger({
  as = "div",
  className,
  style,
  children,
  stagger = 0.08,
  delayChildren = 0.05,
  repeat = false,
  ...rest
}: RevealStaggerProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] as ElementType;
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };

  return (
    <Tag
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ ...REVEAL_VIEWPORT, once: !repeat }}
      variants={variants}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface RevealChildProps extends CommonProps {
  /** Vertical travel in px. Default 22. */
  y?: number;
  /** Horizontal travel in px. Default 0. */
  x?: number;
  /** Start scale (e.g. 0.94 grows into place). Omit for no scaling. */
  scaleFrom?: number;
  /** Duration in seconds. Default 0.55. */
  duration?: number;
  /** Use the gentle overshoot curve instead of ease-out. Default false. */
  spring?: boolean;
}

/** A single staggered item. Must live inside a RevealStagger to animate. */
export function RevealChild({
  as = "div",
  className,
  style,
  children,
  y = 22,
  x = 0,
  scaleFrom,
  duration = 0.55,
  spring = false,
  ...rest
}: RevealChildProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} style={style} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] as ElementType;
  const variants: Variants = {
    hidden: { opacity: 0, y, x, ...(scaleFrom != null ? { scale: scaleFrom } : null) },
    show: {
      opacity: 1,
      y: 0,
      x: 0,
      ...(scaleFrom != null ? { scale: 1 } : null),
      transition: { duration, ease: spring ? EASE_SPRING : EASE_OUT },
    },
  };

  return (
    <Tag className={className} style={style} variants={variants} {...rest}>
      {children}
    </Tag>
  );
}
