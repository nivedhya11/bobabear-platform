/**
 * Brand-signature icons — the "delight" set.
 * Used for avatars, loyalty marks, drop badges, and brand moments. These are
 * a nod to the mascot system, not the official logo — the full logo lives in
 * /assets/logos and follows the §10 mascot-anchor rules.
 */

import { createIcon } from "./IconBase";

/**
 * Bear mark — deadpan eyes, solid pearl nose, faint smirk.
 * Simplified mascot cue for compact icon contexts.
 */
export const BearFace = createIcon(
  "BearFace",
  <>
    <circle cx="7.6" cy="7" r="2.5" />
    <circle cx="16.4" cy="7" r="2.5" />
    <path d="M5.2 13a6.8 6.8 0 0 1 13.6 0 6.8 6.8 0 0 1-13.6 0z" />
    <circle cx="9.6" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    <path d="M10.4 17.3c1 .7 2.2 .7 3.2 0" />
  </>,
);

/** Boba pearls — the cluster of tapioca, the brand's signature texture. */
export const Pearls = createIcon(
  "Pearls",
  <>
    <circle cx="9" cy="14.5" r="2.3" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="13.6" r="2.3" fill="currentColor" stroke="none" />
    <circle cx="11.8" cy="9.4" r="2.3" fill="currentColor" stroke="none" />
    <circle cx="16.4" cy="17.6" r="1.5" fill="currentColor" stroke="none" />
  </>,
);

/** Single droplet — milk / brew / the drop. */
export const Droplet = createIcon(
  "Droplet",
  <path d="M12 3c3.5 4.3 5.5 7.1 5.5 10A5.5 5.5 0 0 1 6.5 13c0-2.9 2-5.7 5.5-10z" />,
);

/** S-Tier crown — streetwear status, used on premium / featured drops. */
export const Crown = createIcon(
  "Crown",
  <>
    <path d="M4 8l3.6 3.2L12 5l4.4 6.2L20 8l-1.4 10.5h-13z" />
    <path d="M5.4 18.5h13.2" />
  </>,
);

/** Four-point sparkle — "S-Tier sips", highlight moments. */
export const Sparkle = createIcon(
  "Sparkle",
  <path d="M12 3c.6 4.3 1.7 5.4 6 6-4.3.6-5.4 1.7-6 6-.6-4.3-1.7-5.4-6-6 4.3-.6 5.4-1.7 6-6z" />,
);
