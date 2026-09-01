import type { Metadata } from "next";

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
  hasMenu: `${SITE_URL}/order`,
  acceptsReservations: false,
  sameAs: [SOCIAL.instagram],
  potentialAction: [
    {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/order`,
        inLanguage: "en-IN",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
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

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div data-surface="customer" className="flex min-h-full flex-col">
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
      <Ticker />
      <Nav />
      {children}
      <Footer />
    </div>
  );
}
