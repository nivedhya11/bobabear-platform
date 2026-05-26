# Boba Bear — Landing Page

Marketing landing page for **Boba Bear**, Dehradun's boba-tea bar and Korean street-food kitchen
(*S-Tier Sips · K-Street Drip*). A single long-scroll page: hero video, signature-drop countdown,
full menu (drinks / K-street plates / sweets), merch teaser, artists collab teaser, and an
"access the drop" ordering section (Zomato / Swiggy / WhatsApp).

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| Icons | lucide-react |

## Prerequisites

- **Node.js 20+** and npm.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server → http://localhost:3000
```

The page hot-reloads as you edit.

## Build & run in production

```bash
npm run build    # production build
npm run start    # serve the production build → http://localhost:3000
npm run lint     # ESLint
```

## Environment variables

The site runs with **no required environment variables**. One optional override:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://bobabear.in` | Canonical URL used in metadata, `sitemap.xml`, `robots.txt`, and JSON-LD. Set this to the real production domain before launch. |

Copy `.env.example` → `.env.local` and fill in if you need to override it.

## Editing content (the common changes)

Most day-to-day edits live in just a few places:

| What you want to change | Where |
|---|---|
| **Menu items, prices, descriptions, tags** | [`data/menu.json`](data/menu.json) |
| **Promo tags on a menu card** (`new`, `limited`, `signature`, `bestseller`) | the `"tags"` array on each item in `data/menu.json`, e.g. `"tags": ["new", "limited"]` |
| **Menu item photos** | drop the image in `public/assets/menu/` and map it in [`lib/menuImages.ts`](lib/menuImages.ts) |
| **Drop date / countdown** | `DROP_DATE` in [`components/SignatureDrops.tsx`](components/SignatureDrops.tsx) (the countdown auto-flips to a "Drop Now Live" state once it passes) |
| **Hero featured video** | replace `public/assets/video/hero-featured.mp4` |
| **Business info, SEO copy, contact, socials** | [`lib/site.ts`](lib/site.ts) (single source of truth for metadata + structured data) |
| **Brand colors / design tokens** | the `@theme` / `:root` blocks in [`app/globals.css`](app/globals.css) |
| **Ordering links** (Zomato / Swiggy / WhatsApp) | `PLATFORMS` in [`components/AccessCTA.tsx`](components/AccessCTA.tsx) |

### Menu tags

Every item in `data/menu.json` has a `tags` field. Leave it `[]` for no tag, or list one or more:

```json
{
  "name": "Wild Berry Dirty Matcha",
  "price": 289,
  "tags": ["new", "limited"]
}
```

Known tags: `signature`, `new`, `bestseller`, `limited`, `staff`. The cards render them as
chips that wrap across the top-left of the image. Unknown values still render as a neutral chip,
so a custom label won't break the layout.

## Project structure

```
app/                 App Router
  layout.tsx         <head>, metadata, JSON-LD, fonts
  page.tsx           the single landing page (composes the sections below)
  globals.css        Tailwind theme + design tokens (colors, type, spacing)
  api/newsletter/    community signup endpoint (placeholder — see below)
  privacy/           privacy policy page
  dev/               dev-only icon gallery (noindexed via robots.ts)
  robots.ts, sitemap.ts, opengraph-image.tsx
components/          section components (Hero, SignatureDrops, TheBar, ThePlates,
                     TheSweet, MerchDrop, Artists, AccessCTA, Footer, Nav, …)
  ui/                shared primitives (Button, Tag, Toggle, …)
  motion/            reveal / stagger animation helpers
  icons/             SVG icon components
data/menu.json       all menu content + per-item tags
lib/                 site.ts (SEO/business constants), menuImages.ts, utils.ts
types/menu.ts        menu data types (incl. the MenuCardTag union)
public/assets/       images & video (logos, drops, menu, merch, artists, video)
```

Page section order is defined in [`app/page.tsx`](app/page.tsx).

## Newsletter / signup API

[`app/api/newsletter/route.ts`](app/api/newsletter/route.ts) is a **placeholder**. It validates the
submitted email/phone, rate-limits per IP, and returns `200 OK` — but does **not** persist anything
yet. Wire it to your email list / WhatsApp Business / CRM where the `TODO` is marked. It intentionally
never logs the submitted contact value (PII).

## Deploy

Optimized for [Vercel](https://vercel.com/): import the repo, set `NEXT_PUBLIC_SITE_URL`, deploy.
Any Node host works too — run `npm run build` then `npm run start`. Baseline security headers
(HSTS, X-Frame-Options, etc.) are configured in [`next.config.ts`](next.config.ts).

## Design & iteration resources

Kept in the repo so the design can be re-iterated in Figma or rebuilt with Claude Code:

- `figma-sync/` — script + section screenshots for syncing to Figma.
- `Boba_Bear_Design_System_Updated/`, `boba-bear-design-system.md`,
  `Updated_BOBA BEAR_ DESIGN SYSTEM (V1.1).md` — the design-system spec (color, type, components, voice).
- `Boba Bear Landing Page Wireframe Updated/` — the build guide / wireframes.
- `Boba_Bear_Images/` and the root `*.png` files — design reference screenshots.
- `AGENTS.md` / `CLAUDE.md` — notes for AI-assisted edits.

These are reference/tooling only — they are not imported by the app and do not ship in the build.
