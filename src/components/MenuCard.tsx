"use client";

/**
 * MenuCard — single rail card used by TheBar (drink), ThePlates (plate),
 *            and TheSweet / K-Street sections (kstreet).
 *
 *   drink   → aspect-[3/4] image · flex 78 % (max 320 px)
 *   plate   → aspect-[4/3] image · flex 86 % (max 380 px)
 *   kstreet → inverted card · square 240×240 image · white/cream bg ·
 *             centered name · saffron price pill · drop shadow
 *
 * Image area falls back to a solid Aurora background (rotates by index mod 6)
 * with the item name centred when no img is provided or the img 404s.
 *
 * Promo tags (zero, one, or many) are rendered by the shared MenuTags chip
 * stack — see {@link MenuTags} for the variants.
 */

import { useState } from "react";
import type { MenuItem } from "@/types/menu";
import { MenuTags, type MenuCardTag } from "@/components/MenuTags";

export type { MenuCardTag };

const AURORA_BG = [
  "bg-aurora-rose",
  "bg-aurora-peach",
  "bg-aurora-butter",
  "bg-aurora-mint",
  "bg-aurora-sky",
  "bg-aurora-lavender",
] as const;

export type MenuCardType = "drink" | "plate" | "kstreet";

export interface MenuCardProps {
  item: MenuItem;
  index: number;
  type?: MenuCardType;
  img?: string;
  tags?: MenuCardTag[];
}

const formatPrice = (p: number) => `₹${p}`;

export function MenuCard({
  item,
  index,
  type = "drink",
  img,
  tags,
}: MenuCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const aurora    = AURORA_BG[index % AURORA_BG.length];
  const showImage = !!img && !imgFailed;

  // Mobile widths differ by type:
  //   drink → ~46% so two cards share the frame
  //   plate → ~64% so ~1.5 cards peek into the frame (larger image, same 4:3)
  // md/lg widths unchanged for every type.
  const widthCls = type === "drink"
    ? "flex-[0_0_46%] max-w-[320px] md:flex-[0_0_320px] lg:flex-[0_0_300px]"
    : type === "kstreet"
      ? "flex-[0_0_78%] max-w-[280px] md:flex-[0_0_260px] lg:flex-[0_0_240px]"
      : "flex-[0_0_64%] max-w-[400px] md:flex-[0_0_340px] lg:flex-[0_0_320px]";

  const imgAspect = type === "drink" ? "aspect-[3/4]" : "aspect-[4/3]";

  // ── KStreet: inverted card with cream bg, shadow, centered layout ──────────
  if (type === "kstreet") {
    return (
      <article
        className={[
          "relative shrink-0 snap-start",
          widthCls,
          // Inverted card — cream bg in dark mode, dark brown in light mode
          // Uses the same bg/text inversion pattern as the signature tag
          "bg-[var(--text-primary)] border border-[var(--border-subtle)]",
          "shadow-[0_4px_24px_rgba(0,0,0,0.18)]",
          "p-3.5 flex flex-col items-center text-center",
          "transition-[transform,box-shadow] duration-[250ms] ease-out",
          "hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.24)]",
        ].join(" ")}
      >
        {/* Promo tags (0…n, stacked) */}
        <MenuTags tags={tags} />

        {/* Square image */}
        <div className="aspect-square w-full mb-3.5 overflow-hidden relative">
          {showImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={img}
              alt={item.name}
              onError={() => setImgFailed(true)}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          ) : (
            <div
              className={[
                "w-full h-full flex items-center justify-center text-center px-3",
                aurora,
              ].join(" ")}
            >
              <span className="font-display text-[clamp(16px,3vw,22px)] leading-tight text-[#1B1408] opacity-80">
                {item.name}
              </span>
            </div>
          )}
        </div>

        {/* Centered title — uses inverted token (always contrasts against cream/inverted bg) */}
        <h3 className="font-display text-[22px] md:text-[24px] leading-tight text-[var(--bg-page)] w-full">
          {item.name}
        </h3>

        {/* Description */}
        <p
          className={[
            "font-heading mt-1",
            "text-[12px] leading-[1.45]",
            "text-[var(--bg-page)] opacity-70",
            "min-h-[34px]",
          ].join(" ")}
        >
          {item.description}
        </p>

        {/* Saffron price pill — secondary fill, on-secondary text for contrast */}
        <div className="mt-auto pt-3 w-full flex justify-center">
          <span
            className={[
              "font-body font-bold text-[13px]",
              "text-[var(--text-on-secondary)]",
              "bg-[var(--interactive-secondary)]",
              "px-3 py-1 rounded-full",
            ].join(" ")}
          >
            {formatPrice(item.price)}
          </span>
        </div>
      </article>
    );
  }

  // ── Standard drink / plate card ────────────────────────────────────────────
  return (
    <article
      className={[
        "relative shrink-0 snap-start",
        widthCls,
        "bg-[var(--bg-section)] border border-[var(--border-default)]",
        "p-2.5 md:p-3.5 flex flex-col",
        "transition-[transform,border-color,background-color] duration-[250ms] ease-out",
        "hover:-translate-y-1 hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]",
      ].join(" ")}
    >
      {/* Promo tags (0…n, stacked) */}
      <MenuTags tags={tags} />

      {/* Image area */}
      <div className={[imgAspect, "mb-2.5 md:mb-3.5 overflow-hidden relative"].join(" ")}>
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={item.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div
            className={[
              "w-full h-full flex items-center justify-center text-center px-3",
              aurora,
            ].join(" ")}
          >
            <span className="font-display text-[clamp(20px,4vw,28px)] leading-tight text-[#1B1408] opacity-80">
              {item.name}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-[17px] md:text-[30px] leading-tight text-[var(--text-primary)]">
        {item.name}
      </h3>

      {/* Description */}
      <p
        className={[
          "font-heading italic mt-0.5 md:mt-1",
          "text-[11px] md:text-[13px] leading-[1.4] md:leading-[1.45]",
          "text-[var(--text-secondary)] opacity-80",
          "min-h-[28px] md:min-h-[38px]",
        ].join(" ")}
      >
        {item.description}
      </p>

      {/* Bottom row — price */}
      <div
        className={[
          "mt-auto pt-2 md:pt-3 flex justify-end items-center",
          "border-t border-[var(--border-subtle)]",
        ].join(" ")}
      >
        <span className="font-display text-[16px] md:text-[22px] text-[var(--interactive-secondary)]">
          {formatPrice(item.price)}
        </span>
      </div>
    </article>
  );
}
