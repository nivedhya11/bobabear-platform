/**
 * Commerce & drops icons — the retail / "catch the drop" set.
 * For carts, wishlists, drop alerts, scheduling, and access gating.
 */

import { createIcon } from "./IconBase";

export const Bag = createIcon(
  "Bag",
  <>
    <path d="M5.5 8h13l-1 11.6a1.4 1.4 0 0 1-1.4 1.3H7.9a1.4 1.4 0 0 1-1.4-1.3z" />
    <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />
  </>,
);

export const Tag = createIcon(
  "Tag",
  <>
    <path d="M3.8 12.2 12 4h7v7l-8.2 8.2a1.8 1.8 0 0 1-2.6 0l-4.4-4.4a1.8 1.8 0 0 1 0-2.6z" />
    <circle cx="15.5" cy="8.5" r="1.4" />
  </>,
);

export const Bell = createIcon(
  "Bell",
  <>
    <path d="M12 4.5V3" />
    <path d="M6.5 17.5V11a5.5 5.5 0 0 1 11 0v6.5" />
    <path d="M4.5 17.5h15" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </>,
);

export const BellAlert = createIcon(
  "BellAlert",
  <>
    <path d="M6.5 17.5V11a5.5 5.5 0 0 1 9.4-3.9" />
    <path d="M17.5 11.4v6.1" />
    <path d="M4.5 17.5h15" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
    <circle cx="18" cy="5.5" r="2.4" fill="currentColor" stroke="none" />
  </>,
);

export const Heart = createIcon(
  "Heart",
  <path d="M12 20.2S4 14.6 4 9.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.4c0 5.2-8 10.8-8 10.8z" />,
);

export const Star = createIcon(
  "Star",
  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
);

export const Bookmark = createIcon(
  "Bookmark",
  <path d="M6 4.5h12V20.2l-6-3.6-6 3.6z" />,
);

export const Clock = createIcon(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.5V12l3.2 2" />
  </>,
);

export const Calendar = createIcon(
  "Calendar",
  <>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
    <path d="M4 9.5h16" />
    <path d="M8 3.5v3.5" />
    <path d="M16 3.5v3.5" />
  </>,
);

/** Drop energy — the lightning beat behind a release. */
export const Bolt = createIcon(
  "Bolt",
  <path d="M13 3 5 13.5h5.5l-1.5 7.5 8-10.5H11z" />,
);

export const Lock = createIcon(
  "Lock",
  <>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>,
);

export const Gift = createIcon(
  "Gift",
  <>
    <rect x="4.5" y="9" width="15" height="4" rx="1" />
    <path d="M6 13v6.4a1.2 1.2 0 0 0 1.2 1.2h9.6a1.2 1.2 0 0 0 1.2-1.2V13" />
    <path d="M12 9v11.6" />
    <path d="M12 9C12 9 10.6 4.5 8.4 5.3 6.6 6 8 9 12 9z" />
    <path d="M12 9c0 0 1.4-4.5 3.6-3.7C17.4 6 16 9 12 9z" />
  </>,
);

export const Ticket = createIcon(
  "Ticket",
  <>
    <path d="M4 8.7A1.7 1.7 0 0 1 5.7 7h12.6A1.7 1.7 0 0 1 20 8.7v1.8a2 2 0 0 0 0 3.8v1.8A1.7 1.7 0 0 1 18.3 17.6H5.7A1.7 1.7 0 0 1 4 15.9v-1.8a2 2 0 0 0 0-3.8z" />
    <path d="M14 7.4v9.8" strokeDasharray="1 2.4" />
  </>,
);

export const Percent = createIcon(
  "Percent",
  <>
    <path d="M19 5 5 19" />
    <circle cx="7.5" cy="7.5" r="2.2" />
    <circle cx="16.5" cy="16.5" r="2.2" />
  </>,
);
