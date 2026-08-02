# Boba Bear — Landing Page

Marketing landing page for **Boba Bear**, Dehradun's boba-tea bar and Korean street-food kitchen
(*S-Tier Sips · K-Street Drip*). A single long-scroll page: hero video, signature-drop countdown,
full menu (drinks / K-street plates / sweets), merch teaser, artists collab teaser, and an
"access the drop" ordering section (Zomato / Swiggy / WhatsApp).

## Platform documentation

This repository currently ships the marketing site described below. BOBA Bear's broader
direct-ordering platform — product vision, first-release scope, operating model, architecture, and
the multi-outlet/franchise foundation — is documented separately in
[`docs/platform/README.md`](docs/platform/README.md). Anyone planning platform-level work (accounts,
ordering, payments, outlets, organizations, roles) should read that document set before writing a
specification or code; it is the canonical source of truth and takes precedence over older planning
documents, wireframes, and design-system drafts elsewhere in this repository.

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
npm run build    # static export → out/
npm run lint     # ESLint
```

> `output: "export"` is always enabled; the site is a fully static export. `npm run start` is not
> used — serve `out/` with any static host or `npx serve out` locally.

## Environment variables

The site runs with **no required environment variables**. One optional override:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://thebobabear.in` | Canonical URL used in metadata, `sitemap.xml`, `robots.txt`, and JSON-LD. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | *(unset — analytics off)* | GA4 Measurement ID (`G-XXXXXXXXXX`). When unset, no analytics scripts load. |

Copy `.env.example` → `.env.local` and fill in if you need to override it.

## Editing content (the common changes)

Most day-to-day edits live in just a few places:

| What you want to change | Where |
|---|---|
| **Menu items, prices, descriptions, tags** | [`data/menu.json`](data/menu.json) |
| **Promo tags on a menu card** (`new`, `limited`, `signature`, `bestseller`) | the `"tags"` array on each item in `data/menu.json`, e.g. `"tags": ["new", "limited"]` |
| **Menu item photos** | drop the image in `public/assets/menu/` using the exact filename from [`lib/menuImages.ts`](lib/menuImages.ts) — no code change needed |
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
public/assets/
  menu/              product photos (one per menu item)
  logos/             brand logos and favicon
  drops/             signature-drop artwork
  merch/             merch product shots (tee, bottle, cup, tote)
  artists/           artists-section hero image
  video/             hero video (hero-featured.mp4)
scripts/             tooling (audit-menu-images.mjs, audit-assets.mjs)
docs/                project documentation (missing-menu-images.md)
```

Page section order is defined in [`app/page.tsx`](app/page.tsx).

## Menu images

Product photos live in `public/assets/menu/`. The mapping from menu item name to filename is in
[`lib/menuImages.ts`](lib/menuImages.ts). Any item without a matching file renders as a coloured
**Aurora fallback card** — this is intentional and handled in [`components/MenuCard.tsx`](components/MenuCard.tsx).

```bash
npm run audit:menu-images   # lists which photos are present vs still missing
```

To add a photo: drop the correctly-named file into `public/assets/menu/` and rebuild. No code
changes needed. See [`docs/missing-menu-images.md`](docs/missing-menu-images.md) for the full
checklist of missing images, naming rules, and aspect-ratio guidelines.

## Asset management rules

- **Add production images under `public/assets/`** — never in `Boba_Bear_Images/` (archived) or `out/`.
  - Menu photos → `public/assets/menu/`
  - Logos / favicons → `public/assets/logos/`
  - Drop artwork → `public/assets/drops/`
  - Video assets → `public/assets/video/`
- **Do not edit `out/` manually.** It is generated by `npm run build` and overwritten on every build.
- **To fix an image on the live site**: update the source file in `public/assets/` (and `lib/menuImages.ts` if a mapping needs changing), then rebuild and redeploy.
- Run `npm run audit:assets` to verify no stale references and that all asset directories are in order.
- Run `npm run build` to regenerate `out/`. GitHub Pages deploys the generated `out/` via the deploy workflow.

## Google Analytics (GA4)

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com) if you don't have one.
2. Go to **Admin → Data Streams → your web stream → Measurement ID** — it looks like `G-XXXXXXXXXX`.
3. Add it as a GitHub repository variable: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Value: `G-XXXXXXXXXX`
4. Locally: copy `.env.example` → `.env.local` and fill in the value.
5. When the variable is set the deploy workflow injects it into the build automatically.
6. To verify: open the live site, then check **GA4 → Reports → Realtime** for active users.

Custom events tracked:
- `zomato_click`, `swiggy_click`, `whatsapp_click` — ordering link taps
- `contact_form_mailto_opened` — email submitted from the footer form

## Newsletter / community signup

The footer "Join" form routes based on what the user enters:
- **Email address** → opens the user's mail client with a pre-filled message to `bobabear.unbothered@gmail.com`.
- **Mobile number or anything else** → opens WhatsApp with a pre-filled order message.

No server API is used — the site is a fully static export.

Free alternatives for real inbox submissions (implement if needed):
- **[Formspree](https://formspree.io)** (free tier: 50 submissions/month) — simplest drop-in, works on GitHub Pages.
- **[Google Forms](https://forms.google.com)** — zero cost, results in a spreadsheet.
- **[EmailJS](https://emailjs.com)** free tier — client-side only, exposes service ID in source.

## Deploy

The site is configured as a **static export** (`output: "export"` in [`next.config.ts`](next.config.ts))
and deployed to **GitHub Pages** via the [deploy workflow](.github/workflows/deploy.yml). Every push
to `main` triggers a build and deploys the `out/` directory to the `gh-pages` branch. The custom
domain `thebobabear.in` is set via the `CNAME` file.

Baseline security headers (HSTS, X-Frame-Options, etc.) are defined in `next.config.ts`; they are
applied on Vercel or any Node host but are no-ops on GitHub Pages (static files only).

## Design & iteration resources

Kept in the repo so the design can be re-iterated in Figma or rebuilt with Claude Code:

- `figma-sync/` — script + section screenshots for syncing to Figma.
- `Boba_Bear_Design_System_Updated/`, `boba-bear-design-system.md`,
  `Updated_BOBA BEAR_ DESIGN SYSTEM (V1.1).md` — the design-system spec (color, type, components, voice).
- `Boba Bear Landing Page Wireframe Updated/` — the build guide / wireframes.
- `Boba_Bear_Images/` (deprecated/archived — do not use as a production source) and the root `*.png` files — design reference screenshots. Production images live in `public/assets/`.
- `AGENTS.md` / `CLAUDE.md` — notes for AI-assisted edits.

These are reference/tooling only — they are not imported by the app and do not ship in the build.
