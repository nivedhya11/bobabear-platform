import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Single-page site: the homepage is the only canonical, indexable URL.
// (/dev is noindex; in-page #anchors are stripped by crawlers, so they
// don't belong here.)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-05-23"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
