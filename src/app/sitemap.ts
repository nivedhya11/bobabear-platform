import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Indexable URLs: homepage plus the owned ordering catalog entry.
// (/dev, /login, cart, and checkout are noindex; in-page #anchors are
// stripped by crawlers, so they don't belong here.)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/order`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-05-23"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
