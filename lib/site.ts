/**
 * site.ts — single source of truth for SEO + structured-data constants.
 *
 * Reused by app/layout.tsx (Metadata + JSON-LD), app/sitemap.ts and
 * app/robots.ts so the canonical URL, business details and copy never drift
 * between the <head>, the sitemap and the schema.org payload.
 *
 * Override the base URL per-environment with NEXT_PUBLIC_SITE_URL.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thebobabear.in"
).replace(/\/$/, "");

export const SITE_NAME = "Boba Bear";

/** Registered legal entity that operates the Boba Bear brand. */
export const SITE_LEGAL_NAME = "Nivedhya11 Hospitality Private Limited";

/** Plain-language one-liner — leads with what & where for the user's mental
 *  model, carries the keywords search engines need. Kept under ~160 chars. */
export const SITE_DESCRIPTION =
  "Bubble tea, matcha, Korean street food, ramyun, momos, loaded fries and desserts in Dehradun. Order Boba Bear on Zomato, Swiggy or WhatsApp.";

/** Brand tagline (accent line, Tier-2 voice) — used as a secondary signal. */
export const SITE_TAGLINE = "S-Tier Sips · K-Street Drip";

export const SITE_KEYWORDS = [
  "Boba Bear",
  "boba tea Dehradun",
  "bubble tea Dehradun",
  "Korean street food Dehradun",
  "milk tea",
  "matcha",
  "ramyun",
  "momos",
  "corn dog",
  "loaded fries",
  "boba near me",
] as const;

export const SITE_LOCALE = "en_IN";

export const BUSINESS = {
  locality: "Dehradun",
  region: "Uttarakhand",
  postalCode: "248001",
  country: "IN",
  /** 11am–12am, every day → schema.org opening-hours shorthand. */
  openingHours: "Mo-Su 11:00-24:00",
  /** Human-readable hours for the footer and contact section. */
  hoursDisplay: "11am — 12am",
  priceRange: "₹₹",
  cuisine: ["Bubble Tea", "Korean", "Street Food", "Asian"],
} as const;

/** Public contact channels — reused by the footer, JSON-LD and the privacy
 *  policy so the phone / email / WhatsApp link never drift between them. */
export const CONTACT = {
  email: "bobabear.unbothered@gmail.com",
  /** Human-readable phone for display (footer, privacy page). */
  phoneDisplay: "+91 92598 94495",
  /** E.164 form for tel: links and schema.org telephone. */
  phoneE164: "+919259894495",
  /** WhatsApp deep link with a prefilled "Catch the Drop" message. */
  whatsapp: "https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21",
} as const;

export const SOCIAL = {
  instagram: "https://instagram.com/boba.bearofficial",
} as const;
