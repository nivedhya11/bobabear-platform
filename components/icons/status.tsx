/**
 * Status & feedback icons — for toasts, validation, and system messages.
 * Pair with the semantic colour tokens (success / warning / error / info).
 */

import { createIcon } from "./IconBase";

export const CheckCircle = createIcon(
  "CheckCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8 12.2l2.7 2.8L16 9.5" />
  </>,
);

export const AlertCircle = createIcon(
  "AlertCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5.2" />
    <circle cx="12" cy="16.2" r="1" fill="currentColor" stroke="none" />
  </>,
);

export const AlertTriangle = createIcon(
  "AlertTriangle",
  <>
    <path d="M10.3 4.3 2.7 17.4a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4" />
    <circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" />
  </>,
);

export const InfoCircle = createIcon(
  "InfoCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.2" />
    <circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" />
  </>,
);

export const XCircle = createIcon(
  "XCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9 9l6 6" />
    <path d="M15 9l-6 6" />
  </>,
);

export const HelpCircle = createIcon(
  "HelpCircle",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2-2.5 3.8" />
    <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
  </>,
);

/** Spinner — add a spin animation at the call site (e.g. `animate-spin`). */
export const Loader = createIcon(
  "Loader",
  <>
    <path d="M12 3v3.5" />
    <path d="M12 17.5V21" />
    <path d="M3 12h3.5" />
    <path d="M17.5 12H21" />
    <path d="M5.6 5.6 8 8" />
    <path d="M16 16l2.4 2.4" />
    <path d="M18.4 5.6 16 8" />
    <path d="M8 16l-2.4 2.4" />
  </>,
);
