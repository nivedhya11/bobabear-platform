/**
 * MenuTags — promo tag chips shared by MenuCard (drink/plate/kstreet) and
 * PolaroidCard (sweet). A card can carry zero, one, or many tags, assigned per
 * item in data/menu.json (`"tags": ["new", "limited"]`).
 *
 * The chips flow LEFT→RIGHT and wrap onto a new line when they reach the right
 * edge of the image frame (the container is pinned left+right).
 *
 * Tag variants:
 *   signature  → inverted (text-primary bg, page-bg text) — quiet identity tag
 *   new        → saffron fill (interactive-secondary)
 *   bestseller → firefly fill (interactive-primary)
 *   limited    → destructive fill (error)
 *   staff      → alias kept for backward compat → renders as "bestseller"
 * Unknown tags fall back to a neutral chip using the raw label, so a custom
 * value typed in the data still renders cleanly.
 */

import type { MenuCardTag } from "@/types/menu";

export type { MenuCardTag };

// "staff" kept as alias → resolves to bestseller styles
const TAG_STYLES: Record<MenuCardTag, string> = {
  signature:  "bg-[var(--text-primary)] text-[var(--bg-page)]",
  new:        "bg-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
  bestseller: "bg-[var(--interactive-primary)] text-[var(--text-on-primary)]",
  limited:    "bg-[var(--interactive-destructive)] text-white",
  staff:      "bg-[var(--interactive-primary)] text-[var(--text-on-primary)]",
};

const TAG_LABEL: Record<MenuCardTag, string> = {
  signature:  "SIGNATURE",
  new:        "New drop",
  bestseller: "Bestseller",
  limited:    "Limited",
  staff:      "Bestseller",
};

const FALLBACK_STYLE = "bg-[var(--bg-surface-raised)] text-[var(--text-primary)]";
const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// `position` pins the chip row's corner. It includes a right edge so the row
// has a width to wrap within (it fully replaces the default — no merge clash).
export function MenuTags({
  tags,
  position = "top-3.5 left-3.5 right-3.5",
}: {
  tags?: MenuCardTag[];
  position?: string;
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <div
      className={`absolute ${position} z-[2] flex flex-row flex-wrap content-start items-start gap-1 md:gap-1.5`}
    >
      {tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className={[
            "font-mono uppercase leading-none",
            // Mobile: smaller + tighter so the tag reads as a corner label, not
            // a badge, on the narrow rail/grid cards. md+ restores the desktop
            // size where the cards are wide enough to carry it.
            "text-[8px] tracking-[0.08em] px-1.5 py-0.5",
            "md:text-[9px] md:tracking-[0.12em] md:px-2 md:py-[3px]",
            TAG_STYLES[t] ?? FALLBACK_STYLE,
          ].join(" ")}
        >
          {TAG_LABEL[t] ?? titleCase(String(t))}
        </span>
      ))}
    </div>
  );
}
