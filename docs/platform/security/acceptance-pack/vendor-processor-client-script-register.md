---
Status: SUPPORTING — Vendor / processor / client-script register
Authority: US-IMP-038-022; capability §16.1; CSP allowlist §8
Compliance claim: NONE
---

# Vendor / processor / client-script register

Must include Cloudflare, Razorpay, Maps, hosting, and Turnstile.

| Vendor / component | Role | Trust boundary | Client script / host (if any) | Data touched | Owner | Evidence |
|---|---|---|---|---|---|---|
| Cloudflare | Supplemental edge (Free): DNS proxy, Managed Ruleset, DDoS, optional Bot Fight, Turnstile | Edge in front of origin; not authoritative authz | `https://challenges.cloudflare.com` (Turnstile) | Client IP (CF-Connecting-IP); challenge tokens | Platform ops / IMP-039 live | ADR-017; CSP allowlist; origin-trust |
| Cloudflare Turnstile | Risk-based challenge on escalated auth abuse | Application siteverify authoritative | Widget via challenges.cloudflare.com | Challenge token; no passwords | Auth owners | `src/server/security/turnstile`; auth harnesses |
| Razorpay | Payment processor / Checkout / webhooks | Provider-controlled card capture | `https://checkout.razorpay.com`; API `https://api.razorpay.com`; lumberjack | Payment refs; **no BOBA raw PAN/CVV** | Payments | PCI matrix; CSP; razorpay HTTP tests |
| Google Maps / Places | Auth-gated location UX | Browser Maps JS + server key boundary | `https://maps.googleapis.com`; `https://maps.gstatic.com`; Maps UI fonts `https://fonts.googleapis.com` (style-src) / `https://fonts.gstatic.com` (font-src) per **D-376** | Geocode/Places under auth gate; no default raw telemetry retention | Location | `tests/imp-036b/maps-security.test.ts`; CSP |
| DigitalOcean (hosting) | Pilot Droplet + firewall + Spaces (backup/objects) | Origin host; Spaces object storage | N/A (infra) | App runtime; backups per IMP-037 | Platform ops / IMP-039 firewall | ADR-016; origin-trust firewall contract |
| Nginx (in-compose) | Static export + narrow API reverse proxy; CSP/real_ip authority | Origin app edge inside Droplet | N/A | Request headers; static assets | Platform ops | `docker/nginx/*` |
| GitHub Actions | CI Secure SDLC | Build/test only | N/A | Source; audit outputs | Platform security | `.github/workflows/*`; SDLC evidence |

## Client-script inventory rule

```text
SCRIPT_SRC_WILDCARDS: FORBIDDEN
CSP_NONCES_ON_STATIC_EXPORT: FORBIDDEN
NEXT_HEADERS_AS_SERVING_AUTHORITY: FORBIDDEN
```

Approved browser script/connect/frame hosts are generated only via
`scripts/generate-nginx-security-headers.mjs` into `docker/nginx/security-headers.conf`.
