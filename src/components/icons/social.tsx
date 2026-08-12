/**
 * Social icons — for the footer follow-bar, share sheets, and social designs.
 * Outline-first to stay cohesive with the rest of the set; X and TikTok are
 * filled glyphs by nature and use their canonical silhouettes.
 * All inherit `currentColor`.
 */

import { createIcon } from "./IconBase";

export const Instagram = createIcon(
  "Instagram",
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="16.8" cy="7.2" r="1.1" fill="currentColor" stroke="none" />
  </>,
);

export const WhatsApp = createIcon(
  "WhatsApp",
  <>
    <path d="M12 3a8.5 8.5 0 0 0-7.3 12.8L3.5 21l5.4-1.4A8.5 8.5 0 1 0 12 3z" />
    <path
      d="M8.9 8.1c.15-.34.31-.35.46-.35.13 0 .27 0 .39.01.13 0 .3-.05.46.36l.56 1.36c.06.14.1.31 0 .47l-.43.5c-.1.11-.2.24-.08.45a5.1 5.1 0 0 0 2.32 2.04c.2.09.32.07.44-.05l.55-.6c.14-.15.26-.1.43-.04l1.28.6c.17.08.29.12.33.2.05.14.05.5-.11.93a1.6 1.6 0 0 1-1.08.79c-.29.03-.66.15-2.23-.47-1.86-.74-3.04-2.62-3.13-2.74-.09-.13-.74-.98-.74-1.87 0-.89.47-1.32.63-1.5z"
      fill="currentColor"
      stroke="none"
    />
  </>,
);

export const XSocial = createIcon(
  "XSocial",
  <path
    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
    fill="currentColor"
    stroke="none"
  />,
);

export const TikTok = createIcon(
  "TikTok",
  <path
    d="M16.6 5.82a4.28 4.28 0 0 1-1.13-2.82h-3.06v12.36a2.43 2.43 0 1 1-2.43-2.43c.25 0 .5.04.73.11V9.9a5.52 5.52 0 0 0-.73-.05A5.52 5.52 0 1 0 15.5 15.4V9.01a7.3 7.3 0 0 0 4.27 1.37V7.32a4.28 4.28 0 0 1-3.17-1.5z"
    fill="currentColor"
    stroke="none"
  />,
);

export const YouTube = createIcon(
  "YouTube",
  <>
    <rect x="3" y="6" width="18" height="12" rx="3.6" />
    <path d="M10.5 9.2 15 12l-4.5 2.8z" fill="currentColor" stroke="none" />
  </>,
);

export const Facebook = createIcon(
  "Facebook",
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <path d="M14.4 8h-1.3a1.9 1.9 0 0 0-1.9 1.9V21" />
    <path d="M10 12.4h4.2" />
  </>,
);

export const Spotify = createIcon(
  "Spotify",
  <>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M7.6 9.6c3-.9 6.4-.6 8.8 1" />
    <path d="M8 12.8c2.4-.7 5-.5 6.9.8" />
    <path d="M8.5 15.8c1.8-.5 3.6-.3 5.2.7" />
  </>,
);

/** Generic share — for native share sheets where no platform is implied. */
export const Share = createIcon(
  "Share",
  <>
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="17" cy="6" r="2.6" />
    <circle cx="17" cy="18" r="2.6" />
    <path d="M8.3 10.8 14.7 7.2" />
    <path d="M8.3 13.2 14.7 16.8" />
  </>,
);

export const Link = createIcon(
  "Link",
  <>
    <path d="M9.5 14.5l5-5" />
    <path d="M10.5 7 12 5.5a3.5 3.5 0 0 1 5 5L15.5 12" />
    <path d="M13.5 17 12 18.5a3.5 3.5 0 0 1-5-5L8.5 12" />
  </>,
);
