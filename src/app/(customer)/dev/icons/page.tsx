/**
 * /dev/icons — Boba Bear Icon Library gallery (internal only).
 *
 * Renders every icon in the library on the live token stack, with controls
 * for size, stroke weight, accent colour, and light/dark mode. Click a tile
 * to copy its import name. Not indexed.
 */

import type { Metadata } from "next";
import { IconGallery } from "./IconGallery";

export const metadata: Metadata = {
  title: "Icon Library — Boba Bear Dev",
  robots: { index: false, follow: false },
};

export default function IconsPage() {
  return <IconGallery />;
}
