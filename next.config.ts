import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin the Turbopack workspace root to THIS directory.
//
// Why: Next.js auto-detects the root by walking up until it finds a lockfile.
// If a stray `package-lock.json` exists in a parent dir (e.g. C:\Users\shiva),
// the inferred root points there instead — and Turbopack's module resolver
// then fails to find `tailwindcss` in its `node_modules`, because the wrong
// tree has no deps installed. Pinning `turbopack.root` makes the behaviour
// deterministic regardless of what lives above us on disk.
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Baseline security headers applied to every route. These are the broadly-safe
// ones that don't risk breaking inline scripts/styles or Google Fonts. A strict
// Content-Security-Policy is intentionally NOT set here — Next.js emits inline
// bootstrap scripts and the page uses inline <style>/JSON-LD, so a real CSP
// needs per-request nonces (middleware). Add that as a dedicated follow-up.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS only takes effect over HTTPS; browsers ignore it on http://localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
