"use client";

/**
 * StaggerWords — split a string on whitespace and animate each word in
 * with a per-word delay. Used for the Hero headline.
 *
 * Motion spec (§2.2):
 *   y: 12 → 0, opacity: 0 → 1, 400 ms ease-out, 60 ms stagger.
 *
 * Reduced motion: returns a plain inline span with the final-state styles,
 * no animation at all. `useReducedMotion()` returns true when the user has
 * the OS-level preference set; Framer Motion listens for changes live.
 */

import { motion, useReducedMotion } from "framer-motion";

export interface StaggerWordsProps {
  /** Text to split and animate. Whitespace is the word boundary. */
  text: string;
  /** Base delay before the first word fires, seconds. Default 0. */
  delay?: number;
  /** Per-word stagger, seconds. Default 0.06 (60 ms). */
  stagger?: number;
  className?: string;
}

export function StaggerWords({
  text,
  delay = 0,
  stagger = 0.06,
  className,
}: StaggerWordsProps) {
  const reduce = useReducedMotion();
  const words = text.split(/\s+/);

  if (reduce) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.4,
            ease: [0, 0, 0.2, 1],
            delay: delay + i * stagger,
          }}
          className="inline-block"
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}
