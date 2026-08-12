/**
 * Account & app icons — profile, settings, and the in-app utility shelf.
 * Covers the surfaces an ordering app / dashboard needs beyond the website.
 */

import { createIcon } from "./IconBase";

export const User = createIcon(
  "User",
  <>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" />
  </>,
);

export const UserCircle = createIcon(
  "UserCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="10" r="2.8" />
    <path d="M6.4 18.4a6 6 0 0 1 11.2 0" />
  </>,
);

export const Settings = createIcon(
  "Settings",
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 12c0-.45-.04-.88-.12-1.3l2-1.55-2-3.46-2.36 1a7.3 7.3 0 0 0-2.25-1.3L14.3 2h-4l-.37 2.4a7.3 7.3 0 0 0-2.25 1.3l-2.36-1-2 3.46 2 1.55a7.4 7.4 0 0 0 0 2.6l-2 1.55 2 3.46 2.36-1a7.3 7.3 0 0 0 2.25 1.3l.37 2.4h4l.37-2.4a7.3 7.3 0 0 0 2.25-1.3l2.36 1 2-3.46-2-1.55c.08-.42.12-.85.12-1.3z" />
  </>,
);

export const Home = createIcon(
  "Home",
  <>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 9.4V20h12V9.4" />
    <path d="M10 20v-5h4v5" />
  </>,
);

export const LogOut = createIcon(
  "LogOut",
  <>
    <path d="M9 4H6.2A2.2 2.2 0 0 0 4 6.2v11.6A2.2 2.2 0 0 0 6.2 20H9" />
    <path d="M15 8l4 4-4 4" />
    <path d="M19 12H9" />
  </>,
);

export const Edit = createIcon(
  "Edit",
  <>
    <path d="M16 4.5l3.5 3.5L9 18.5l-4 1 1-4z" />
    <path d="M14 6.5 17.5 10" />
  </>,
);

export const Trash = createIcon(
  "Trash",
  <>
    <path d="M4.5 7h15" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M6.5 7l.8 12.1a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>,
);

export const Camera = createIcon(
  "Camera",
  <>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.4" />
  </>,
);

export const Image = createIcon(
  "Image",
  <>
    <rect x="4" y="5" width="16" height="14" rx="2.2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2 0L19 19" />
  </>,
);

export const Upload = createIcon(
  "Upload",
  <>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M5 20h14" />
  </>,
);

export const Download = createIcon(
  "Download",
  <>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </>,
);

export const MapPin = createIcon(
  "MapPin",
  <>
    <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
);

export const Phone = createIcon(
  "Phone",
  <path d="M5 4h3.5l1.8 4.5-2.2 1.4a11.5 11.5 0 0 0 5.6 5.6l1.4-2.2 4.5 1.8V19a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z" />,
);

export const Mail = createIcon(
  "Mail",
  <>
    <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
    <path d="M4 7.5l8 5.5 8-5.5" />
  </>,
);

export const MessageCircle = createIcon(
  "MessageCircle",
  <path d="M4 18.5 5.1 15A8 8 0 1 1 8 18.5l-4 .5z" />,
);

export const Globe = createIcon(
  "Globe",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.5 2.4 3.8 5.4 3.8 8.5S14.5 18.1 12 20.5C9.5 18.1 8.2 15.1 8.2 12S9.5 5.9 12 3.5z" />
  </>,
);

export const Eye = createIcon(
  "Eye",
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOff = createIcon(
  "EyeOff",
  <>
    <path d="M4 4l16 16" />
    <path d="M9.6 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.4 16.4 0 0 1-3 3.7" />
    <path d="M6.4 7.9A16.3 16.3 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 3.5-.7" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);

export const Sun = createIcon(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
  </>,
);

export const Moon = createIcon(
  "Moon",
  <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5z" />,
);
