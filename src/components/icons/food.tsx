/**
 * Food & menu icons — the product set for The Bar / The Plates / The Sweet.
 * Indo-Korean kitchen + boba bar vocabulary, plus dietary markers.
 */

import { createIcon } from "./IconBase";

/** The signature: lidded cup, straw, and three pearls settled at the base. */
export const BobaCup = createIcon(
  "BobaCup",
  <>
    <path d="M14.2 6.8 16 3" />
    <path d="M6 6.5h12l-.5 2.2H6.5z" />
    <path d="M6.6 8.7h10.8l-1 10.9a1.4 1.4 0 0 1-1.4 1.3H9a1.4 1.4 0 0 1-1.4-1.3z" />
    <circle cx="10" cy="16.6" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="13.4" cy="17.2" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="11.7" cy="14.4" r="1.15" fill="currentColor" stroke="none" />
  </>,
);

export const Coffee = createIcon(
  "Coffee",
  <>
    <path d="M5 8.5h12v5.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
    <path d="M17 9.5h2.2a2.2 2.2 0 0 1 0 4.4H17" />
    <path d="M8 3.4c-.6 1 .6 1.9 0 2.9" />
    <path d="M12 3.4c-.6 1 .6 1.9 0 2.9" />
  </>,
);

/** Ramyun bowl with rising steam — The Plates. */
export const Bowl = createIcon(
  "Bowl",
  <>
    <path d="M3.5 11h17v.4a8.5 8.5 0 0 1-17 0z" />
    <path d="M3.5 11h17" />
    <path d="M9 4.4c-.6 1 .6 1.9 0 2.9" />
    <path d="M13 4.4c-.6 1 .6 1.9 0 2.9" />
  </>,
);

export const Chopsticks = createIcon(
  "Chopsticks",
  <>
    <path d="M5 19.5 17 4.5" />
    <path d="M8.5 20.5 20 6" />
  </>,
);

export const ForkKnife = createIcon(
  "ForkKnife",
  <>
    <path d="M6 3v4a2.2 2.2 0 0 0 4.4 0V3" />
    <path d="M8.2 9.2V21" />
    <path d="M16 3v18" />
    <path d="M16 3c2.4 0 3.6 2 3.6 4.5S18.4 12 16 12" />
  </>,
);

/** Vegan marker. */
export const Leaf = createIcon(
  "Leaf",
  <>
    <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" />
    <path d="M5 19c3-6 7-9 11-10" />
  </>,
);

/** Gluten / wheat marker. */
export const Wheat = createIcon(
  "Wheat",
  <>
    <path d="M12 21V7.5" />
    <path d="M12 8c0-2.4 1.5-4 3.8-4.2C15.6 6.2 14.3 8 12 8z" />
    <path d="M12 8c0-2.4-1.5-4-3.8-4.2C8.4 6.2 9.7 8 12 8z" />
    <path d="M12 13.5c0-2.4 1.5-4 3.8-4.2C15.6 11.7 14.3 13.5 12 13.5z" />
    <path d="M12 13.5c0-2.4-1.5-4-3.8-4.2C8.4 11.7 9.7 13.5 12 13.5z" />
  </>,
);

/** Spicy / hot. */
export const Flame = createIcon(
  "Flame",
  <path d="M12 3c3 3 5 5.6 5 9.1a5 5 0 0 1-10 0c0-1.6.6-2.8 1.5-3.8.5 1 1.5 2 2 3 1-3 .5-6 1.5-8.3z" />,
);

/** Iced / cold. */
export const Snowflake = createIcon(
  "Snowflake",
  <>
    <path d="M12 3v18" />
    <path d="M3.5 12h17" />
    <path d="M5.6 5.6 18.4 18.4" />
    <path d="M18.4 5.6 5.6 18.4" />
    <path d="M12 7l-2.2-2.2M12 7l2.2-2.2" />
    <path d="M12 17l-2.2 2.2M12 17l2.2 2.2" />
    <path d="M7 12 4.8 9.8M7 12l-2.2 2.2" />
    <path d="M17 12l2.2-2.2M17 12l2.2 2.2" />
  </>,
);

/** The Sweet — chocolate-chip cookie. */
export const Cookie = createIcon(
  "Cookie",
  <>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="10" cy="9.6" r=".9" fill="currentColor" stroke="none" />
    <circle cx="14.6" cy="11" r=".9" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="14" r=".9" fill="currentColor" stroke="none" />
    <circle cx="13.6" cy="15" r=".9" fill="currentColor" stroke="none" />
  </>,
);
