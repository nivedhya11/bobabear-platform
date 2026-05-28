/**
 * Analytics — GA4 integration via Next.js Script.
 *
 * Only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is set (e.g. G-XXXXXXXXXX).
 * Renders nothing in development or when the env var is absent, so a missing
 * ID never breaks the build or the page.
 *
 * Custom events are fired via the exported `trackEvent` helper. Import it
 * anywhere in client components:
 *
 *   import { trackEvent } from "@/components/Analytics";
 *   trackEvent("whatsapp_click", { location: "access_cta" });
 */

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function Analytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { page_path: window.location.pathname });
      `}</Script>
    </>
  );
}

/** Fire a GA4 custom event. No-ops when GA is not loaded. */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("event", name, params);
}
