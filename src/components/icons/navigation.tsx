/**
 * Navigation & core UI icons — the "clarity" set.
 * Monoline, neutral, predictable. These never compete with the brand.
 */

import { createIcon } from "./IconBase";

export const Menu = createIcon(
  "Menu",
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>,
);

export const Close = createIcon(
  "Close",
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>,
);

export const ChevronRight = createIcon("ChevronRight", <path d="M9 5l7 7-7 7" />);
export const ChevronLeft = createIcon("ChevronLeft", <path d="M15 5l-7 7 7 7" />);
export const ChevronDown = createIcon("ChevronDown", <path d="M5 9l7 7 7-7" />);
export const ChevronUp = createIcon("ChevronUp", <path d="M5 15l7-7 7 7" />);

export const ArrowRight = createIcon(
  "ArrowRight",
  <>
    <path d="M4 12h15" />
    <path d="M13 6l6 6-6 6" />
  </>,
);

export const ArrowLeft = createIcon(
  "ArrowLeft",
  <>
    <path d="M20 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </>,
);

export const ArrowUp = createIcon(
  "ArrowUp",
  <>
    <path d="M12 20V5" />
    <path d="M6 11l6-6 6 6" />
  </>,
);

export const ArrowDown = createIcon(
  "ArrowDown",
  <>
    <path d="M12 4v15" />
    <path d="M6 13l6 6 6-6" />
  </>,
);

/** Diagonal "access the drop" arrow — the brand's outbound gesture. */
export const ArrowUpRight = createIcon(
  "ArrowUpRight",
  <>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </>,
);

export const Plus = createIcon(
  "Plus",
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const Minus = createIcon("Minus", <path d="M5 12h14" />);

export const Check = createIcon("Check", <path d="M5 12.5l4.5 4.5L19 7" />);

export const Search = createIcon(
  "Search",
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20.5 20.5l-4.2-4.2" />
  </>,
);

export const Filter = createIcon(
  "Filter",
  <>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </>,
);

export const MoreHorizontal = createIcon(
  "MoreHorizontal",
  <>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </>,
);

export const MoreVertical = createIcon(
  "MoreVertical",
  <>
    <circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
  </>,
);

export const ExternalLink = createIcon(
  "ExternalLink",
  <>
    <path d="M14 5h5v5" />
    <path d="M19 5l-8 8" />
    <path d="M18 14v3.5A1.5 1.5 0 0 1 16.5 19h-9A1.5 1.5 0 0 1 6 17.5v-9A1.5 1.5 0 0 1 7.5 7H11" />
  </>,
);

export const Grid = createIcon(
  "Grid",
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </>,
);
