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

// This site is deployed to a custom domain (thebobabear.in) via GitHub Pages,
// so it is always served at the domain root — no /${repoName} subpath prefix
// is ever needed. basePath and assetPrefix are intentionally left empty.
const isProd = process.env.NODE_ENV === "production";
void isProd; // referenced below for clarity; both branches are ""

// Baseline security headers applied to every route when Next.js can emit them.
// A strict Content-Security-Policy is NOT set here — Next.js `headers()` is a
// no-op under `output: "export"`. IMP-038 Nginx (`docker/nginx/security-headers.conf`)
// is the sole CSP/security-header authority on the real serving path.
// IMP-026B: official Razorpay Checkout.js is https://checkout.razorpay.com/v1/checkout.js.
// Documented origins for CSP live in src/lib/razorpay/types.ts. Do not add
// wildcard script-src / frame-src / connect-src merely to allow Checkout.js.
//
// NOTE: headers() is a no-op in static export mode. Kept here so the same
// config works on Vercel / self-hosted deployments without changes.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
  },
  // HSTS only takes effect over HTTPS; browsers ignore it on http://localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  // Custom domain → no subpath prefix (basePath / assetPrefix stay empty).
  basePath: "",
  assetPrefix: "",

  images: {
    unoptimized: true,
  },

  // turbopack.root is used by `next dev` (Turbopack is the default dev server
  // in Next.js 16). Production builds run via `next build --webpack` so this
  // block is dev-only. The --webpack flag is necessary because Turbopack
  // generates chunk filenames with `..` (e.g. `0..5to0tv3fzb.js`) that GitHub
  // Pages' CDN normalises as path-traversal and 404s, leaving all Framer
  // Motion elements stuck at their initial opacity:0 state.
  turbopack: {
    root: projectRoot,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
