"use client";

/**
 * PolaroidCard — the design-system "Menu Card" (sweet variant).
 *
 * Structure mirrors the Figma component exactly:
 *   • cream "paper" body that HUGS a square image (card width = image + side padding)
 *   • square image with an Aurora fallback + centred name
 *   • centred title (Luckiest Guy) → description (Bubblegum Sans, non-italic)
 *   • saffron price chip as a normal flex child (body hugs content height)
 *   • image + text share one definite width → text wraps, height varies
 *
 * Interaction (TheSweet stage): draggable; springs back to origin on release
 * via Framer Motion's dragSnapToOrigin, tilted at a small fixed angle.
 *
 * Theme: bg / text use --text-primary / --bg-page so the card stays
 * "inverted" relative to the page in both dark and light mode.
 *
 * Motion: on scroll-in each polaroid "develops" — it drops down a touch and
 * scales up out of nothing, settling into its fixed tilt with a gentle
 * overshoot, like a photo tossed onto the table. The per-card `index` drives a
 * stagger so they land one after another. This DROP (y starts negative) is an
 * intentional departure from the site's default "rise up" reveal — placing a
 * photo reads as setting it down, not lifting it. The static `rotate` tilt and
 * the drag transforms compose with the entrance without fighting it.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_SPRING } from "@/components/motion/Reveal";
import { MenuTags, type MenuCardTag } from "@/components/MenuTags";

const AURORA_BG = [
  "bg-aurora-rose",
  "bg-aurora-peach",
  "bg-aurora-butter",
  "bg-aurora-mint",
  "bg-aurora-sky",
  "bg-aurora-lavender",
] as const;

// Square media size — the body hugs this (card width = MEDIA + side padding).
// Reuses the exact width tokens the title/description share so the text
// column is always image-width and wraps to a variable height.
const MEDIA = "w-[128px] md:w-[240px]";

export interface PolaroidCardProps {
  name: string;
  description: string;
  price: number;
  /** Tilt angle in degrees — keep small (-6 to +6) */
  tilt?: number;
  img?: string;
  index?: number;
  className?: string;
  /** Promo tags (0…n) — stacked in the top-left corner. */
  tags?: MenuCardTag[];
}

const formatPrice = (p: number) => `₹${p}`;

export function PolaroidCard({
  name,
  description,
  price,
  tilt = 0,
  img,
  index = 0,
  className,
  tags,
}: PolaroidCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const reduce = useReducedMotion() ?? false;

  const aurora    = AURORA_BG[index % AURORA_BG.length];
  const showImage = !!img && !imgFailed;

  return (
    <motion.div
      className={[
        "shrink-0 select-none cursor-grab active:cursor-grabbing",
        // Body hugs the media on three sides: left/right/top padding are equal
        // and tight; bottom keeps a touch more weight for the text + price chip.
        "flex flex-col items-center gap-1.5 md:gap-3",
        "px-1 pt-1 pb-2 md:px-2 md:pt-2 md:pb-3",
        "bg-[var(--text-primary)] text-[var(--bg-page)]",
        "border border-black/15",
        "shadow-[0_14px_18px_rgba(0,0,0,0.35)]",
        "snap-center relative",
        className ?? "",
      ].join(" ")}
      style={{ rotate: tilt }}
      initial={reduce ? false : { opacity: 0, scale: 0.82, y: -22 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 0.55,
        ease: EASE_SPRING,
        delay: Math.min(index * 0.09, 0.6),
      }}
      drag={reduce ? false : true}
      dragSnapToOrigin
      dragElastic={0.6}
      dragTransition={{ bounceStiffness: 320, bounceDamping: 22 }}
      whileDrag={{ scale: 1.04, zIndex: 5, cursor: "grabbing" }}
    >
      {/* Promo tags (0…n, wrap left→right) */}
      <MenuTags tags={tags} position="top-2 left-2 right-2" />

      {/* Square image — definite width drives the card width */}
      <div
        className={[
          MEDIA, "aspect-square",
          "overflow-hidden relative",
          "flex items-center justify-center text-center",
          // px-3 only insets the fallback text; a real photo fills the full
          // square box so it stays square and hugs all three sides equally.
          showImage ? "" : `px-3 ${aurora}`,
        ].join(" ")}
      >
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={name}
            onError={() => setImgFailed(true)}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <span className="font-display text-[16px] md:text-[28px] leading-[1.05] text-[#1B1408] opacity-80">
            {name}
          </span>
        )}
      </div>

      {/* Title — image-width, centred, wraps (variable height) */}
      <p className={[MEDIA, "font-display text-[15px] md:text-[30px] leading-none text-center"].join(" ")}>
        {name}
      </p>

      {/* Description — image-width, centred, non-italic */}
      <p className={[MEDIA, "font-heading text-[10px] md:text-[14px] leading-[1.2] md:leading-[1.15] text-center opacity-70"].join(" ")}>
        {description}
      </p>

      {/* Saffron price chip — flex child, hugs its own text */}
      <span
        className={[
          "font-heading text-[12px] md:text-[22px] leading-none tracking-[0.1em]",
          "px-1.5 pt-0.5 pb-0.5 md:px-2 md:pt-1",
          "bg-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
        ].join(" ")}
      >
        {formatPrice(price)}
      </span>
    </motion.div>
  );
}
