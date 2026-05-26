import type { Metadata, Viewport } from "next";
import {
  Luckiest_Guy,
  Bubblegum_Sans,
  Nunito,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";
import { Footer } from "@/components/Footer";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  BUSINESS,
  CONTACT,
  SOCIAL,
} from "@/lib/site";

const luckiestGuy = Luckiest_Guy({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const bubblegumSans = Bubblegum_Sans({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  weight: ["400", "600", "700"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Boba Bear · Boba Tea & Korean Street Food in Dehradun",
    template: "%s · Boba Bear",
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  applicationName: SITE_NAME,
  category: "food",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: "/",
    title: "Boba Bear · Boba Tea & Korean Street Food in Dehradun",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Boba Bear · Boba Tea & Korean Street Food in Dehradun",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/favicon.ico" },
};

// SSR defaults to dark (no `.light` class); the inline script below upgrades to
// the user's saved choice / system preference before paint. theme-color tracks
// the page background per scheme (--bg-page in globals.css).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1A2210" },
    { media: "(prefers-color-scheme: light)", color: "#FAF3E2" },
  ],
  colorScheme: "dark light",
};

// Runs before first paint to prevent a flash: applies `.light` when the user
// previously chose light, or when they have no saved choice and their OS
// prefers light. Wrapped in try/catch so a blocked localStorage never breaks
// rendering. Kept in sync with the toggle in components/Nav.tsx.
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||(t===null&&window.matchMedia("(prefers-color-scheme: light)").matches)){document.documentElement.classList.add("light");}}catch(e){}})();`;

// schema.org Restaurant — powers local/rich results. Address, hours, phone
// and email are all real; geo is an ISBT approximation (see lib/site.ts).
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  telephone: CONTACT.phoneE164,
  email: CONTACT.email,
  image: `${SITE_URL}/opengraph-image`,
  servesCuisine: [...BUSINESS.cuisine],
  priceRange: BUSINESS.priceRange,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.street,
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.geo.lat,
    longitude: BUSINESS.geo.lng,
  },
  openingHours: BUSINESS.openingHours,
  hasMenu: `${SITE_URL}/#bar`,
  sameAs: [SOCIAL.instagram],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      // The theme bootstrap script (below) toggles the `light` class on <html>
      // before React hydrates, so the client class intentionally differs from
      // the SSR markup. Suppress the (expected) hydration attribute warning.
      suppressHydrationWarning
      className={`${luckiestGuy.variable} ${bubblegumSans.variable} ${nunito.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        {/* Theme bootstrap — must run before paint to avoid a light/dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body antialiased min-h-full flex flex-col">
        {/* Skip link — first focusable element, visible only on keyboard focus. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:font-body focus:font-bold focus:bg-[var(--interactive-primary)] focus:text-[#1F2C08] focus:shadow-lg focus-ring"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/* Rainbow ticker rides above the nav — scrolls away while the nav
            sticks to the top. Order on screen: ticker · nav · hero. */}
        <Ticker />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
