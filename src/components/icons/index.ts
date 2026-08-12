/**
 * Boba Bear Icon Library — barrel.
 *
 * Usage:
 *   import { BobaCup, ArrowUpRight } from "@/components/icons";
 *   <BobaCup className="text-firefly-400" size={20} />
 *   <ArrowUpRight title="Access the drop" strokeWidth={2} />
 *
 * Every icon inherits `currentColor`, so set colour with a text-* token and
 * it tracks dark / light mode automatically. `iconRegistry` groups every glyph
 * by category for the /dev/icons gallery and for any name → component lookups.
 */

import type * as React from "react";
import type { IconProps } from "./IconBase";
import * as Navigation from "./navigation";
import * as Commerce from "./commerce";
import * as Food from "./food";
import * as Brand from "./brand";
import * as Social from "./social";
import * as Account from "./account";
import * as Status from "./status";

export type { IconProps } from "./IconBase";
export { createIcon } from "./IconBase";

export * from "./navigation";
export * from "./commerce";
export * from "./food";
export * from "./brand";
export * from "./social";
export * from "./account";
export * from "./status";

export type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export interface IconGroup {
  /** Display name of the category. */
  label: string;
  /** One-line description of what the category is for. */
  hint: string;
  /** Icon component map keyed by export name. */
  icons: Record<string, IconComponent>;
}

/** Grouped registry — drives the gallery and supports name-based lookups. */
export const iconRegistry: IconGroup[] = [
  {
    label: "Navigation & UI",
    hint: "The clarity set — wayfinding, controls, and core actions.",
    icons: Navigation as unknown as Record<string, IconComponent>,
  },
  {
    label: "Commerce & Drops",
    hint: "Carts, wishlists, drop alerts, scheduling, access gating.",
    icons: Commerce as unknown as Record<string, IconComponent>,
  },
  {
    label: "Food & Menu",
    hint: "The Bar, The Plates, The Sweet — plus dietary markers.",
    icons: Food as unknown as Record<string, IconComponent>,
  },
  {
    label: "Brand Signatures",
    hint: "The delight set — mascot cues, pearls, status marks.",
    icons: Brand as unknown as Record<string, IconComponent>,
  },
  {
    label: "Social",
    hint: "Follow-bar, share sheets, and social designs.",
    icons: Social as unknown as Record<string, IconComponent>,
  },
  {
    label: "Account & App",
    hint: "Profile, settings, and the in-app utility shelf.",
    icons: Account as unknown as Record<string, IconComponent>,
  },
  {
    label: "Status & Feedback",
    hint: "Toasts, validation, and system messages.",
    icons: Status as unknown as Record<string, IconComponent>,
  },
];
