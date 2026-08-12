/**
 * IconBase — foundation for the Boba Bear icon library.
 *
 * House style (§ derived from the Boba Bear Design System):
 *   · 24×24 grid, content kept inside a ~20×20 safe area.
 *   · Monoline outline, `currentColor` so every icon inherits the active
 *     text/interactive token and works in both dark and light mode.
 *   · strokeWidth 1.75 default · round caps + joins — refined, editorial,
 *     "premium streetwear" rather than chunky or plush-cute.
 *   · Brand-signature icons (BearFace, Pearls…) lean on filled accents to
 *     carry delight; utility icons stay clean to carry clarity.
 *
 * Accessibility: decorative by default (`aria-hidden`). Pass `title` to
 * promote the icon to an `img` with an accessible name.
 *
 * Sizing: `size` sets a square box (px). Use `strokeWidth` to keep optical
 * weight constant when scaling up (larger icons read lighter at a fixed 1.75).
 *
 * These are pure presentational components — safe in both server and client
 * components. The factory keeps every glyph pixel-consistent.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconProps
  extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  /** Width & height in px — sets a square box. Default 24. */
  size?: number | string;
  /** Stroke weight for outline strokes. Default 1.75. */
  strokeWidth?: number;
  /** Accessible name. When omitted the icon is hidden from assistive tech. */
  title?: string;
}

/**
 * Factory: turns static SVG children into a consistent, ref-forwarding icon.
 * Every icon in the library is produced through this so the grid, caps, and
 * defaults never drift between glyphs.
 */
export function createIcon(displayName: string, paths: React.ReactNode) {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth = 1.75, title, className, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        className={cn("inline-block shrink-0", className)}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {paths}
      </svg>
    );
  });

  Icon.displayName = displayName;
  return Icon;
}
