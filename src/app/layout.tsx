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
import { Analytics } from "@/components/Analytics";
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
    default: "Boba Bear - For The Unbothered",
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
    title: "Boba Bear - For The Unbothered",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Boba Bear — boba tea & Korean street food in Dehradun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boba Bear - For The Unbothered",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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

// schema.org Restaurant — powers local/rich results. Delivery-only business;
// no streetAddress is published. areaServed covers the service area.
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SITE_NAME,
  alternateName: "Boba Bear - For The Unbothered",
  slogan: "For The Unbothered",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  telephone: CONTACT.phoneE164,
  email: CONTACT.email,
  image: `${SITE_URL}/opengraph-image`,
  logo: `${SITE_URL}/assets/logos/boba-bear-full-logo.svg`,
  servesCuisine: [...BUSINESS.cuisine],
  priceRange: BUSINESS.priceRange,
  address: {
    "@type": "PostalAddress",
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.country,
  },
  areaServed: BUSINESS.locality,
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    opens: "11:00",
    closes: "24:00",
  },
  hasMenu: `${SITE_URL}/#bar`,
  acceptsReservations: false,
  sameAs: [SOCIAL.instagram],
  potentialAction: [
    {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: CONTACT.whatsapp,
        inLanguage: "en-IN",
        actionPlatform: ["http://schema.org/MobileWebPlatform"],
      },
    },
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Boba Bear - For The Unbothered",
  url: SITE_URL,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Analytics />
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
