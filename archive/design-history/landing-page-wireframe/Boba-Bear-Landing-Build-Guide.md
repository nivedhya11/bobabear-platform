# Boba Bear — Landing Page Build Guide

A complete plan for shipping Boba Bear's single-page landing site: information architecture, full section-by-section layout, and sequential Claude Code prompts that take the project from empty folder to deployed site, with a Figma refinement loop at the end.

---

## 0. Locked-in project decisions

| Decision | Choice | Reason |
|---|---|---|
| Stack | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion** | Matches Savor / Touchy / Monte Cafe production stacks. Best SEO, image optimization, and Vercel deploys free. Plays nicely with Claude-to-Figma. |
| Site scope | **Single scrolling landing page** with anchor sections | Simpler IA, faster to ship, scroll storytelling matches Savor/Touchy vibe. |
| Ordering | **Link-out only** — Swiggy, Zomato, WhatsApp (all funnel through Petpooja backend) | No cart, no checkout, no payments to build. |
| Merch | **Showcase section** (Aurora-stage product photography) with link-out to external store or "drop incoming" waitlist | Honors the `interactive/secondary` + Aurora palette in the design system. |
| Visual direction | **Hybrid** — Savor hero energy + Touchy detail craft + Monte menu presentation | Uniquely Boba Bear, not a clone. |
| Mode | **Dark (Night Forest) is default**, Light (Boba Cream) available via toggle | Design system explicitly states dark is the default. |
| Hosting | **Vercel** (free tier, custom domain, instant previews) | Next.js's native platform. |
| Analytics | Vercel Analytics + Plausible (or Posthog, opt) | Lightweight, privacy-aware, no cookie banner required with Plausible. |

**Source of truth files that already live in this folder:**
- `boba-bear-design-system.md` — design system, reference this in every prompt.
- `menu.json` — all 69 items across 9 categories, pre-parsed from the Petpooja master sheet. Drop straight into the Next.js project as `/data/menu.json`.

---

## 1. Information architecture

### 1.1 Scroll map (single page, anchor nav)

```
┌──────────────────────────────────────────────────────────┐
│  NAV  ── sticky, blur backdrop, 64px (56 on mobile)      │
├──────────────────────────────────────────────────────────┤
│  ① HERO                   /#top                          │
│     "S-Tier Sips.                                        │
│      K-Street Drip."                                     │
│     → Access the Drop (primary) · Ping on WhatsApp       │
├──────────────────────────────────────────────────────────┤
│  ② MARQUEE TICKER         (no anchor, ambient)           │
│     "For the Unbothered · Catch the Drop · S-Tier ..."   │
├──────────────────────────────────────────────────────────┤
│  ③ SIGNATURE DROPS        /#drops                        │
│     The four hero bobas, scroll-pinned big-type reveals  │
├──────────────────────────────────────────────────────────┤
│  ④ THE FULL MENU          /#menu                         │
│     Monte Cafe-style category tabs + filtered item grid  │
│     9 categories · 69 items · veg/paneer/spicy filters   │
├──────────────────────────────────────────────────────────┤
│  ⑤ THE BEAR               /#bear                         │
│     Touchy-style editorial — mascot lore, "Street-Smart  │
│     Dreamer" archetype, K-culture fluency                │
├──────────────────────────────────────────────────────────┤
│  ⑥ MERCH DROP             /#merch                        │
│     Aurora stage. T-shirt · Cap · Cup. Drop-style.       │
├──────────────────────────────────────────────────────────┤
│  ⑦ WHERE TO FIND US       /#locations                    │
│     Store card(s) · hours · map pin · directions         │
├──────────────────────────────────────────────────────────┤
│  ⑧ ACCESS THE DROP (CTA)  /#access                       │
│     Big split block: Swiggy · Zomato · WhatsApp · IG     │
├──────────────────────────────────────────────────────────┤
│  FOOTER                                                  │
│     Catch the drop (email) · handles · legal · credits   │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Navigation model

**Desktop nav (≥1024px):** logo left · links centre (`Drops · Menu · Bear · Merch · Find Us`) · `Access the Drop` button right.

**Tablet / mobile (<1024px):** logo left · hamburger right → full-screen drawer with the same link list + socials + language toggle if needed later.

**Sticky:** yes, with `backdrop-filter: blur(12px)` over `bg/page` at 80% alpha. No shadow — the design system explicitly uses blur for elevation instead.

**Active link:** `text/label` colour (Firefly Green 400 in dark, 600 in light) with scrollspy — updates as user scrolls past each anchor.

### 1.3 CTA hierarchy (access/discovery framing only)

| Priority | CTA copy | Where |
|---|---|---|
| Primary | **Access the Drop** | Hero, nav right, final CTA section |
| Secondary | **Ping on WhatsApp** | Hero secondary slot, Access section |
| Tertiary | **View Current Drop** | Signature Drops, Merch |
| Tertiary | **Access via Zomato** / **Access via Swiggy** | Access section (two buttons) |
| Quiet | **Catch the Drop** (newsletter) | Footer |

**Never use:** `Order Now`, `Buy Now`, `Click Here`, `Add to Cart`, `Shop Now`. The design system forbids these.

### 1.4 Voice model (from design system §12)

- Deadpan, brief, fashion-label cadence.
- No "delicious", "tasty", "yummy", "best food in town".
- No startup clichés ("revolutionising boba"), no urgency spam ("HURRY!"), never say "cloud kitchen" or "restaurant".
- Microcopy for loading: `Securing the Drop…` — not `Loading…`.

### 1.5 Scroll-spy + anchor behavior

- Section IDs: `#top`, `#drops`, `#menu`, `#bear`, `#merch`, `#locations`, `#access`.
- Scroll offset = nav height + 24px (so section headings clear the sticky nav).
- Smooth scroll globally, but `scroll-behavior: auto` if user has `prefers-reduced-motion: reduce`.

### 1.6 Accessibility contract (from design system)

- Firefly Green 400 and Saffron Gold 400 are dark-mode tuned. In light mode, use the 600–700 steps on text-bearing fills so they pass WCAG AA on cream.
- 3px `focus-ring` on every focusable element, 2px offset, never native browser outlines.
- `prefers-reduced-motion`: replace all scroll reveals with fade-in only, disable marquee animation, disable parallax.
- All images: `alt` that reads as caption, not filename.

---

## 2. Complete layout — section-by-section spec

Every section uses the dark (Night Forest) palette by default. Container max-width 1280px, 48px desktop gutter / 32 tablet / 24 mobile. Section spacing 96 desktop / 64 tablet / 48 mobile.

### 2.1 Nav

- Surface: `bg/page` #1A2210 with `backdrop-filter: blur(12px)`.
- Height: 64 desktop, 56 mobile. 1px `border/subtle` bottom.
- Logo: horizontal variant (from logo system).
- Links: Nunito 14px/600, hover = `interactive/ghost-hover` fill with `radius/md`.
- Right slot: **Access the Drop** primary button (size `md`).
- Mode toggle: small ghost icon button, sun/moon, top-right on mobile.

### 2.2 Hero (Savor-led)

- Full-bleed, 100vh on desktop, min 88vh mobile.
- Background: `bg/page` with a very subtle radial glow (3% Aurora/Butter) behind the headline — never a gradient, never clip art.
- Mascot: full-colour master logo, right-side 55% viewport width on desktop (overflowing bleed), centre-bottom 70% width on mobile. Subtle 4s float loop (±4px y, ease-in-out).
- Headline: **Luckiest Guy `display/2xl`** — two lines.
  - Line 1: `S-Tier Sips.`
  - Line 2: `K-Street Drip.`
- Sub: Nunito `body/lg` `text/secondary`, max 520px — *"Unbothered by trends. Built for the drop. Served cold from [city]."*
- CTA row:
  - Primary `Access the Drop` → anchors to `#access`.
  - Secondary outline `Ping on WhatsApp` → opens `https://wa.me/<number>?text=Drop`.
- Under CTAs: small label/md row — `NOW LIVE · DELHI` with a Firefly Green 400 pulse dot (2s, very subtle).
- Motion: headline words stagger in (60ms delay, 400ms ease-out). Respect `prefers-reduced-motion`.

### 2.3 Ticker marquee

- Height: 56px. Full-bleed, `bg/surface-sunken` #0D1208.
- Font: **Bubblegum Sans `heading/h3`**, `text/label` colour.
- Content loop: `For the Unbothered · Catch the Drop · S-Tier Sips · K-Street Drip · The Bear Stays Unbothered ·` (repeat).
- Separator: 4px solid circle, `text/label` colour, 48px margin left/right.
- Duration: 28s linear loop. Pauses on hover (desktop) and on `prefers-reduced-motion`.

### 2.4 Signature Drops (pinned scroll section)

Four hero drinks, selected to match the Signature Boba category's strongest items:

1. **Gangnam Iced Coffee Boba** — ₹199
2. **Purple Rain Taro Boba** — ₹259
3. **Zen Master Matcha Boba** — ₹269
4. **Hong Kong Tiger Milk Tea Boba** — ₹239

Layout: each drink is a **100vh pinned pane** (desktop only). On mobile, they stack as four normal cards, no pinning.

Per pane (desktop):
- Left 45%: product photography (500×620 focal, object-contain). Aurora soft-fill backdrop rotates through Peach → Mint → Lavender → Sky.
- Right 55%:
  - Label `label/md` — `DROP 01 · SIGNATURE`
  - Headline Luckiest Guy `display/xl` — drink name.
  - Nunito `body/lg` — description (from menu.json).
  - Price chip — Saffron Gold wordmark treatment, `label/lg`.
  - CTA `View Current Drop` → anchors to `#menu` pre-scrolled to Signature Boba category.
- Transition between panes: crossfade product image + slide headline up on pane change.

Scroll implementation: use `position: sticky` + `IntersectionObserver` snap — **not** GSAP ScrollTrigger (keep the bundle small).

### 2.5 The Full Menu (Monte Cafe-led)

- Heading: Bubblegum Sans `heading/h1` — `Full Menu`. Eyebrow `label/md` `text/label` — `THE CATALOG`.
- Sub: one line — *"Nine chapters. Sixty-nine drops."*
- **Category tab bar** — sticky inside the section (not the page):
  - Horizontally scrollable on mobile, centred wrap on desktop.
  - Chips: `radius/full`, default state `bg/section`, active = `interactive/primary` fill + `text/on-primary`.
  - Order from menu.json: Signature Boba · K-Combos · Ramyun · Momos · Burgers & Wraps · Meals · Fries, Bites & Corn Dogs · Quesadillas · Desserts.
- **Sub-filter row** (appears under tab): sub-category chips for whichever category is active — e.g. inside Signature Boba: `Signature Boba · Matcha Studio · Iced Coffees · Refreshers`.
- **Item grid:**
  - Desktop: 3 columns. Tablet: 2. Mobile: 1.
  - Card: `radius/lg` 12px, 1px `border/default`, `bg/surface`.
  - 4:3 image area, Aurora soft-fill fallback if photo missing.
  - Content padding 24/20/16 (desktop/tablet/mobile).
  - `heading/h4` name (Bubblegum Sans), `body/sm` description (Nunito `text/secondary`), price pill bottom-right (Saffron Gold).
  - Tier A items get a small `FEATURED` chip top-left (`bg/section` on dark, Aurora/Butter on light).
  - Hover: lift 2px, border → `border/strong`, `shadow/md`.
- **Dietary filter row** (top-right of grid): Veg (default on) · Paneer · Spicy.
- Animation: fade+slide-up on mount (staggered per row, 40ms delay), respects reduced-motion.
- No prices in search, no cart, no quantity — this is a **catalog**, not a store.

### 2.6 The Bear (Touchy-led editorial)

Two-column split on desktop, stacked on mobile.

- **Left column (58%)**:
  - Eyebrow `label/md` — `ARCHETYPE · STREET-SMART DREAMER`.
  - Headline Bubblegum Sans `heading/h1` — `The Bear stays unbothered.`
  - Three paragraphs, Nunito `body/lg`, `text/secondary`. Content around:
    - Where the bear comes from (nostalgic magic + streetwear drop cadence).
    - Why K-culture fluency (ramyun, matcha, iced coffees — not a theme park, a vocabulary).
    - The governing aesthetic (editorial, curated, confident).
  - Pull quote mid-column, Luckiest Guy `display/lg`, Firefly Green 400 — `Brand carries delight. UI carries clarity.`
- **Right column (42%)**:
  - Full-colour master logo at 320px, slight rotation (-3deg) and `shadow/md`.
  - Below: 3 mascot anchor captions with icons (Nunito `body/sm`): `Deadpan eyes & subtle smirk` · `Solid pearl nose, white highlight` · `S-curve torso, sturdy blocky legs`.

No CTA in this section — the bear's job here is story, not conversion.

### 2.7 Merch Drop

Aurora is the stage here (per design system §11). Treat merch as streetwear artefacts, not combo-meal swag.

- Heading Bubblegum Sans `heading/h1` — `The Drop`.
- Eyebrow `label/md` `text/label` — `MERCH · SERIES 01`.
- Sub Nunito `body/lg` max 520px — *"Wearable bear. Drop-limited."*
- **3-card grid** (1 column mobile, 3 desktop):
  1. **Tee** — Aurora/Rose backdrop, front-view bear graphic tee, ₹[TBD], `View Current Drop` CTA.
  2. **Cap** — Aurora/Mint backdrop, embroidered bear mark on front.
  3. **Keepsake Cup** — Aurora/Lavender backdrop, reusable glass with bear etch.
- Card structure: 4:5 image area, chip `SERIES 01 · LIMITED` top-left, name below, price + CTA at bottom.
- Below grid: an outline CTA row — `Join the drop list` (Catch the drop) + email input, sends to newsletter provider.
- Motion: on scroll into view, each card fades+rises with 80ms stagger.

If store isn't live yet, cards show `Drop incoming` badge and CTA becomes `Get notified`.

### 2.8 Where to find us

Card-based, one card per physical location (start with one, scale as stores open).

- Per card: store name · address · hours (open/closed live status with Success/Error badge) · `Get directions` (Google Maps URL) · small map thumbnail (Mapbox static image).
- On dark mode: map tile uses Mapbox's dark style (or OpenStreetMap dark) so it doesn't light-bomb the page.
- Optional: right-side 1-line customer support row — *"DM us on Instagram @bobabear.xx — we reply fast."*

### 2.9 Access the Drop (final CTA)

- Full-bleed, `bg/surface-sunken` — darkest well on the page.
- Luckiest Guy `display/xl` — `Catch the Drop.`
- Sub: `body/lg` — *"Three ways in. Same bear."*
- 3-card row (stack on mobile):
  - **Swiggy** — logo mark, Saffron-tinted card, CTA `Access via Swiggy`.
  - **Zomato** — logo mark, card, CTA `Access via Zomato`.
  - **WhatsApp** — green mark, CTA `Ping on WhatsApp` → `wa.me/<number>?text=Drop%2001`.
- Each card uses 1px `border/default`, `radius/2xl` (24px — this is a spotlight surface), hover lifts 2px with `shadow/glow-firefly`.

### 2.10 Footer

- `bg/page`, 1px `border/subtle` top.
- Four columns desktop, stacked mobile:
  1. **Mark** — mascot-only logo + one-line essence: *"For the Unbothered."*
  2. **Sitemap** — links to each anchor.
  3. **Find us** — Instagram, WhatsApp, email, physical address.
  4. **Catch the Drop** — email input (Nunito 15px, `radius/md`, `border/default`, focus → `border/focus`). Submit button ghost → primary on hover.
- Bottom strip: `© 2026 Boba Bear.` · `Privacy` · `Terms` · tiny credit line.
- Never a social icon wall — use labelled links (design system favours words over iconography in footers).

---

## 3. Asset checklist (prepare before Step 6)

Put these in `/public/assets/` in the Next.js project.

**Logos** (from design system §10):
- `logo-full-colour.svg` — master, hero.
- `logo-horizontal-dark.svg` — nav on dark.
- `logo-horizontal-light.svg` — nav on light.
- `logo-mascot.svg` — avatars, footer mark.
- `logo-mascot-lg.png` — high-res for hero mascot float.

**Product photography** (hero drinks + menu items):
- `/drops/gangnam-iced-coffee.png` (transparent bg, 1200×1500)
- `/drops/purple-rain-taro.png`
- `/drops/zen-master-matcha.png`
- `/drops/hong-kong-tiger.png`
- `/menu/<item-slug>.jpg` (3:4 crops, ~800×1000, JPEG Q80) — one per of the 69 items eventually. Start with the 15 Signature Boba items, fill the rest as they're shot.

**Merch photography**:
- `/merch/tee-series-01.jpg`, `/merch/cap-series-01.jpg`, `/merch/cup-series-01.jpg` — Aurora-backdrop studio shots.

**Fonts** (self-host via `next/font/google` or local):
- Luckiest Guy — Google Fonts.
- Bubblegum Sans — Google Fonts.
- Nunito — Google Fonts (weights 400, 600, 700).
- JetBrains Mono — Google Fonts (only if you add code-style microcopy).

**Icons**: use Lucide React throughout. Never mix icon libraries.

**Favicon set** — generate from mascot-only logo via realfavicongenerator or `sharp`: 32, 180, 192, 512.

---

## 4. Repository structure

```
boba-bear/
├── app/
│   ├── layout.tsx              # <html>, fonts, analytics
│   ├── page.tsx                # orchestrates sections
│   ├── globals.css             # Tailwind + CSS variables for tokens
│   ├── opengraph-image.tsx     # auto-generated OG image
│   └── icon.tsx                # generated favicon
├── components/
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── Marquee.tsx
│   ├── SignatureDrops.tsx
│   ├── MenuCatalog.tsx
│   ├── MenuCard.tsx
│   ├── TheBear.tsx
│   ├── MerchDrop.tsx
│   ├── Locations.tsx
│   ├── AccessCTA.tsx
│   ├── Footer.tsx
│   ├── ui/
│   │   ├── Button.tsx          # primary/secondary/outline/ghost variants
│   │   ├── Chip.tsx
│   │   ├── Badge.tsx
│   │   └── Card.tsx
│   └── motion/
│       ├── StaggerWords.tsx    # hero headline
│       └── RevealOnScroll.tsx  # generic fade-up
├── data/
│   └── menu.json               # <-- drop the one we generated here
├── lib/
│   ├── tokens.ts               # typed mirror of design tokens
│   ├── scrollspy.ts
│   └── cn.ts                   # class merge helper
├── public/
│   └── assets/...              # see §3
├── tailwind.config.ts          # all tokens wired as theme.extend
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Step-by-step build — Claude Code prompts

Each step is a self-contained Claude Code prompt. Paste them one at a time. After each, verify the acceptance criteria before moving to the next. Run `npm run dev` and check `http://localhost:3000` between steps.

> **Before you start:** put `boba-bear-design-system.md` and `menu.json` somewhere Claude Code can reach — the simplest is to make `boba-bear/` the project folder and drop both at the repo root, then reference them by filename in prompts. Claude Code will automatically `Read` them when prompted.

---

### Step 1 — Scaffold the Next.js project

**Goal:** clean Next.js 15 App Router project with TypeScript, Tailwind, and Framer Motion installed.

**Prompt:**

```
Create a new Next.js 15 project in the current directory with TypeScript and the App Router. Use Tailwind CSS. Initialize with:

- src/ directory: NO (keep app/ at root)
- App Router: YES
- Tailwind: YES
- ESLint: YES
- Import alias: @/*
- Turbopack: YES for dev

Then install these additional dependencies:
- framer-motion
- lucide-react
- clsx
- tailwind-merge

After install, replace app/page.tsx with a placeholder that renders "Boba Bear — scaffolding" centered on the page, and confirm `npm run dev` starts cleanly on port 3000.

Also read `boba-bear-design-system.md` from the repo root in full — this is the source of truth for every design decision going forward. Don't implement anything from it yet; just confirm you've loaded it.
```

**Acceptance:** `npm run dev` serves the placeholder, no TypeScript errors, design system file has been read.

---

### Step 2 — Wire design tokens into Tailwind

**Goal:** every colour, font, spacing, radius, shadow, and duration from `boba-bear-design-system.md` becomes a Tailwind theme token — zero hardcoded hex values anywhere else.

**Prompt:**

```
Read `boba-bear-design-system.md` again, focusing on sections 2 (colour scales), 3 (semantic tokens), 4 (typography), 5 (spacing), 6 (radius), 7 (elevation), and 8 (motion).

Update `tailwind.config.ts` so that:

1. All core identity scales (Firefly Green, Saffron Gold, Bear Brown, Boba Cream, Night Forest) are in theme.extend.colors with their 50→950 ramps, named lowercase (firefly, saffron, bear, cream, forest).
2. Aurora pastels are in theme.extend.colors.aurora with rose/peach/butter/mint/sky/lavender keys.
3. Neutral utility scale (50→950) is in theme.extend.colors.neutral (override Tailwind default).
4. Semantic colors (success, warning, info, error) use their base values.
5. Semantic tokens (bg/page, text/primary, border/default, interactive/primary, etc.) are exposed as CSS custom properties in app/globals.css, scoped under :root (dark mode, the default) and a .light class variant for light mode. Then expose them through Tailwind utilities via theme.extend.colors like `bg-page`, `text-primary`, `border-default`, `bg-interactive-primary`, etc. using `rgb(var(--token) / <alpha-value>)` pattern.
6. Font families: `display` → Luckiest Guy, `heading` → Bubblegum Sans, `body` → Nunito, `mono` → JetBrains Mono.
7. fontSize entries for display-2xl/xl/lg, h1–h5, body-lg/md/sm/xs, label-lg/md/sm, caption-md/sm, code-md/sm using clamp() so they bridge the 3 breakpoints fluidly (use the clamp formulas in section 4 of the design system).
8. borderRadius: xs=2, sm=4, md=8, lg=12, xl=16, 2xl=24, full=9999.
9. spacing scale matches the 4px base: add any missing values (2, 6, etc.) if not already present.
10. boxShadow tokens: shadow-xs, sm, md, lg, xl, glow-firefly, glow-saffron, focus-ring — copy the exact rgba() values from §7.
11. transitionDuration tokens: instant, fast, normal, slow, slower, crawl. transitionTimingFunction: ease-out, ease-in, ease-in-out, spring-gentle.

After wiring, add a dark-by-default <html class=""> in app/layout.tsx (no class = dark, the design system says dark is default) and a tiny ThemeToggle client component that flips a `light` class on <html>.

No component changes yet — just tokens and the toggle scaffold.
```

**Acceptance:** `bg-page`, `text-primary`, `shadow-glow-firefly`, `font-display`, `rounded-lg` all resolve to their spec values. Dark is default. Toggle flips to light without errors.

---

### Step 3 — Load fonts

**Goal:** all four font families load once, server-side, without FOIT or FOUT.

**Prompt:**

```
Load the four type families defined in the design system using `next/font/google`:

- Luckiest Guy (weight 400) as `--font-display`
- Bubblegum Sans (weight 400) as `--font-heading`
- Nunito (weights 400, 600, 700) as `--font-body`
- JetBrains Mono (weight 400) as `--font-mono`

Apply all four CSS variables on <html> in app/layout.tsx. Then in tailwind.config.ts, make the font families reference these CSS variables: display: ['var(--font-display)'], heading: ['var(--font-heading)'], body: ['var(--font-body)'], mono: ['var(--font-mono)'].

Set `font-body` as the base on <body>. Confirm with a quick test page that renders one of each family to verify all load. Then remove the test.
```

**Acceptance:** No network font request on page load (Next handles it), one glyph of each family visible briefly in a test.

---

### Step 4 — Build the UI primitives

**Goal:** the atomic components (Button, Chip, Badge, Card) match the design system exactly so every later section just composes them.

**Prompt:**

```
Create the UI primitive components in `components/ui/`. Base every one on the rules in §9 of `boba-bear-design-system.md`.

1. **Button.tsx** — polymorphic via `asChild` (Radix Slot pattern, install @radix-ui/react-slot). Variants: primary | secondary | outline | ghost | destructive. Sizes: sm (h-8) | md (h-10) | lg (h-12). 
   - Primary: bg-interactive-primary, text-on-primary, hover adds shadow-glow-firefly, press state darkens.
   - Font: Nunito 700. Never Luckiest Guy (explicitly forbidden).
   - radius-md across all variants. 3px focus-ring at 2px offset.
   - Include a tiny up-shift on hover (translate -y 1px) with duration-fast.

2. **Chip.tsx** — radius-full pill, default bg-section + text-secondary, active bg-interactive-primary + text-on-primary. Aurora variant for merch.

3. **Badge.tsx** — same geometry as Chip. Status variants (success/warning/error/info/neutral) mapping exactly to the table in §9.

4. **Card.tsx** — bg-surface, radius-lg, 1px border-default, hover lifts 2px + shadow-md + border-strong. overflow-hidden so content can die-cut to corners.

Add a small Storybook-like showcase page at /dev (app/dev/page.tsx) that renders every variant+size so I can eyeball them. Mark /dev with `noindex` metadata.

Never use pure #000 or #FFF. Always use palette tokens.
```

**Acceptance:** `/dev` shows every variant in both dark and light modes, passes eye-test, focus rings visible on tab.

---

### Step 5 — Nav component

**Goal:** sticky top nav that matches §9 (Navigation) exactly.

**Prompt:**

```
Build `components/Nav.tsx` per §9 (Navigation) of the design system.

- Sticky top, 64px desktop / 56px mobile, bg-page with backdrop-filter blur(12px), 1px border-subtle bottom.
- Logo left (use /public/assets/logo-horizontal-dark.svg — placeholder ok if asset missing, just a text wordmark).
- Desktop (≥1024): links centred — Drops, Menu, Bear, Merch, Find Us. Nunito 14px/600. Link hover: bg-interactive-ghost-hover, rounded-md. Active link (scrollspy): text-label color.
- Right slot: mode toggle (sun/moon icon, ghost button) + primary Button "Access the Drop" (anchors to #access).
- Mobile (<1024): hamburger icon right, opens a full-screen drawer with backdrop-filter blur, same link list vertically, mode toggle, big "Access the Drop" button at the bottom. Close on link click or on escape.
- Implement scrollspy via IntersectionObserver against the section IDs: top, drops, menu, bear, merch, locations, access.
- Respect prefers-reduced-motion: no animated blur-in.

Mount it in app/layout.tsx so it's present on every route. Add placeholder anchor sections #top through #access on app/page.tsx so scrollspy has targets — just bare <section id> with 100vh min-height for now.
```

**Acceptance:** Nav sticks on scroll, active link updates as you scroll through the empty sections, mobile drawer opens/closes cleanly, no layout shift on mount.

---

### Step 6 — Hero section

**Goal:** §2.2 — Savor-energy hero with staggered word reveal and subtle mascot float.

**Prompt:**

```
Build `components/Hero.tsx` per §2.2 of the landing build guide.

- Full-bleed, min-h-[88vh] on mobile, h-screen on desktop. bg-page.
- Very subtle radial gradient behind headline: 3% opacity Aurora/Butter, 900px blob centred under the headline. Implement as a positioned <div> with a radial gradient — no image.
- Right side: <img src="/assets/logo-mascot-lg.png"> at 55vw desktop, 70vw mobile, centred-bottom on mobile, aligned right-bleeding on desktop. Apply a 4-second yoyo float (±4px on Y, ease-in-out) using Framer Motion. Disable animation under prefers-reduced-motion.
- Left side (or centred on mobile): 
  - eyebrow: label-md "NOW LIVE · DELHI" with a small 8px Firefly Green pulse dot (2s duration, opacity 0.4 → 1 → 0.4).
  - headline: two lines, Luckiest Guy display-2xl, text-primary. Line 1 "S-Tier Sips." Line 2 "K-Street Drip." Stagger each word in at mount with 60ms delay, 400ms ease-out, y: 12→0 and opacity 0→1. Use a small <StaggerWords> client component for this.
  - sub: Nunito body-lg text-secondary, max-w-[520px]: "Unbothered by trends. Built for the drop. Served cold from Delhi."
  - CTA row with gap-3:
    - <Button variant="primary" size="lg" asChild><a href="#access">Access the Drop</a></Button>
    - <Button variant="outline" size="lg" asChild><a href="https://wa.me/<NUMBER>?text=Drop" target="_blank" rel="noopener">Ping on WhatsApp</a></Button>
- Leave the phone number as `<NUMBER>` — I'll swap it in later.
- Respect max-w container 1280 with appropriate gutter.
- Under reduced-motion: no stagger, no float; everything renders in its final state.

Mount into app/page.tsx replacing the #top placeholder.
```

**Acceptance:** Words stagger in once on mount, mascot floats gently, both CTAs keyboard-focusable, looks identical with motion disabled.

---

### Step 7 — Marquee ticker

**Goal:** §2.3 — the brand marquee.

**Prompt:**

```
Build `components/Marquee.tsx` per §2.3.

- Full-bleed strip, 56px tall, bg-surface-sunken, borders top/bottom in border-subtle.
- Duplicate the content array inline twice so the horizontal loop is seamless. Content phrases:
  ["For the Unbothered", "Catch the Drop", "S-Tier Sips", "K-Street Drip", "The Bear Stays Unbothered"]
- Between phrases render a 4px solid circle bullet, text-label color, 48px horizontal margin.
- Font: Bubblegum Sans heading-h3, text-label color.
- Animate translateX 0 → -50% over 28s linear, infinite. Pause on hover (desktop) and under prefers-reduced-motion (stop animation, freeze at 0).
- Offer a `direction` prop ("left" | "right") for future use, default "left".

Mount directly after <Hero/> in app/page.tsx. No anchor ID — it's ambient.
```

**Acceptance:** Smooth loop, no seam visible, hover pauses, reduced-motion freezes content readable.

---

### Step 8 — Signature Drops (pinned pane scroll)

**Goal:** §2.4 — four pinned hero-drink panes on desktop, stack on mobile.

**Prompt:**

```
Build `components/SignatureDrops.tsx` per §2.4.

Data: hardcode the four drink objects inline for now — we'll pull from menu.json later:
[
  { drop: "DROP 01", name: "Gangnam Iced Coffee Boba", desc: "Creamy iced coffee with chewy boba and chocolate-lined cup walls.", price: 199, img: "/assets/drops/gangnam-iced-coffee.png", aurora: "peach" },
  { drop: "DROP 02", name: "Purple Rain Taro Boba", desc: "Creamy taro boba with a rich purple blend and chewy tapioca pearls.", price: 259, img: "/assets/drops/purple-rain-taro.png", aurora: "lavender" },
  { drop: "DROP 03", name: "Zen Master Matcha Boba", desc: "Premium matcha blended with milk, dark chocolate, and chewy boba.", price: 269, img: "/assets/drops/zen-master-matcha.png", aurora: "mint" },
  { drop: "DROP 04", name: "Hong Kong Tiger Milk Tea Boba", desc: "Bold black milk tea with caramel stripes and chewy tapioca pearls.", price: 239, img: "/assets/drops/hong-kong-tiger.png", aurora: "sky" }
]

Desktop (≥1024px):
- Outer <section id="drops"> sets height: 400vh (one viewport per drink).
- Inside, a position: sticky, top-0, h-screen container that holds the active pane.
- IntersectionObserver-driven index: whichever 100vh chunk is in view updates activeIndex.
- Pane layout: grid grid-cols-[45%_55%].
  - Left cell: Aurora soft-fill background (use aurora/<color> at 70% soft fill from the design system), product image centred, 500x620 object-contain. Slight parallax: image moves 24px up as its pane scrolls past (clamp to range).
  - Right cell: label, Luckiest Guy display-xl name (crossfades on index change, 300ms), body-lg description, Saffron price chip (label-lg), primary Button "View Current Drop" anchoring to "#menu".
- Add a small vertical progress rail on the far right (1px track, 40px active segment, firefly-400) showing which drop is active. Not clickable; just a visual.

Mobile/tablet (<1024px):
- Skip pinning. Render 4 stacked cards, full-width, same content layout but product image on top, text below.

Respect prefers-reduced-motion: disable parallax and crossfade (fall back to instant index swap).

Mount into app/page.tsx replacing the #drops placeholder.

If image assets aren't present yet, render a solid Aurora-bg placeholder with the drink name as a watermark so the layout still reads.
```

**Acceptance:** On desktop, scrolling through the section pins the pane and cycles through 4 drinks. Mobile stacks. Reduced-motion skips the fancy transitions.

---

### Step 9 — Menu catalog (Monte Cafe-led)

**Goal:** §2.5 — full data-driven catalog from menu.json.

**Prompt:**

```
Read `menu.json` from the repo root and copy it into `data/menu.json` inside the Next project.

Build `components/MenuCatalog.tsx` and `components/MenuCard.tsx` per §2.5 of the build guide.

MenuCatalog:
- Section id="menu". Heading: Bubblegum Sans heading-h1 "Full Menu". Eyebrow label-md "THE CATALOG". Sub body-lg "Nine chapters. Sixty-nine drops."
- Import menu.json and type it.
- State: activeCategory (default first), activeSubcategory (default "All" for that category), dietFilters (set of "Veg", "Paneer", "Spicy" — inferred from item name/description keywords for now; veg is default on).
- Category tab bar: horizontally scrollable on mobile (touch-scroll, snap), centred-wrap on desktop. Use <Chip> component. Active = primary.
- Sub-category row: appears only if the active category has more than one subcategory. Same Chip treatment, smaller size.
- Diet filter row: right-aligned, <Chip> again, toggleable.
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-6.
- Render MenuCard for each item passing filters. Add stagger fade-up on mount with framer-motion (40ms per item, reduced-motion disables).

MenuCard:
- <Card> wrapper.
- Image area 4:3, object-cover. Fallback: solid Aurora background with item name centred in Bubblegum Sans (rotate Aurora color by item index mod 6).
- Content padding 24/20/16 responsive.
- Heading h4 (Bubblegum Sans) with item name.
- body-sm text-secondary description.
- Bottom row: Tier A gets a small "FEATURED" badge (neutral on dark, Aurora/Butter on light). Saffron-tinted price pill on right.
- Hover: handled by Card primitive.

Diet keyword detection (rough pass, we'll refine later):
- "Paneer" filter hits if item name contains "Paneer".
- "Spicy" filter hits if name/description contains any of: "Dynamite", "Spicy", "Hot", "Chilli", "Carbonara" (in context of ramyun).
- "Veg" is default true for everything in this menu (there is no non-veg).

No ordering, no cart, no price math — this is a catalog.

Mount into app/page.tsx replacing the #menu placeholder.
```

**Acceptance:** All 69 items render, category tabs switch cleanly, sub-category filter appears only where relevant, dietary filters narrow results, no layout shift on filter change.

---

### Step 10 — The Bear (story)

**Goal:** §2.6 — editorial two-column story section.

**Prompt:**

```
Build `components/TheBear.tsx` per §2.6.

Two-column grid on desktop (58/42), stacked on mobile.

Left column:
- Eyebrow label-md text-label "ARCHETYPE · STREET-SMART DREAMER"
- Heading Bubblegum Sans heading-h1: "The Bear stays unbothered."
- Three body-lg text-secondary paragraphs. Use this placeholder copy verbatim (it's written to match the design system voice — deadpan, brief, no startup clichés):
  
  P1: "Boba Bear came out of late-night study sessions, corner-store drink runs, and the kind of drops that sold out before anyone noticed. Nostalgic magic with a streetwear edge. Nothing revolutionary. Nothing loud."
  
  P2: "K-culture fluency is the vocabulary, not the theme. Ramyun after a long day. Matcha that hits. Iced coffee that doesn't fake the depth. Everything reads like a drop, because that's how we build."
  
  P3: "Curated. Confident. Unbothered. The bear doesn't work for the trend — the trend works for the bear."

- Pull quote, Luckiest Guy display-lg, firefly-400 color, max-w-[640px], centred in its column, 48px vertical padding:
  "Brand carries delight. UI carries clarity."

Right column:
- <img src="/assets/logo-mascot-lg.png"> at 320px max, rotated -3deg, shadow-md, margin-top responsive.
- Below image, three captioned rows (body-sm text-secondary) with small dot bullets:
  "Deadpan eyes & subtle smirk"
  "Solid pearl nose, white highlight"
  "S-curve torso, sturdy blocky legs"

No CTAs in this section. Mount into app/page.tsx replacing #bear.
```

**Acceptance:** Reads like an editorial spread, not a product page. Copy matches the design system voice. Pull quote is visually distinct but doesn't scream.

---

### Step 11 — Merch Drop

**Goal:** §2.7 — Aurora-stage merch showcase.

**Prompt:**

```
Build `components/MerchDrop.tsx` per §2.7.

- Section id="merch". Eyebrow label-md "MERCH · SERIES 01". Heading heading-h1 "The Drop". Sub body-lg "Wearable bear. Drop-limited."
- 3-column grid (1 col mobile, 3 col lg). Each card has its own Aurora backdrop:
  1. Tee — Aurora/Rose at 70% soft fill, img src="/assets/merch/tee-series-01.jpg" (fallback to solid Aurora rose block with "TEE · 01" watermark).
  2. Cap — Aurora/Mint soft fill.
  3. Keepsake Cup — Aurora/Lavender soft fill.
- Each card: 
  - 4:5 image area.
  - Top-left chip: "SERIES 01 · LIMITED" using Aurora variant chip.
  - Below image: Bubblegum Sans heading-h4 name. body-sm description (one line). Row with price pill left + "View Current Drop" primary button right. If store isn't live, swap price for "TBA" and button copy to "Get notified" (ghost variant).
- Card uses radius-2xl (spotlight treatment), hover lifts 2px with shadow-md.
- Under the grid, a row: outline Button "Catch the drop" + email input styled per §9 (Inputs). Submit handler POSTs to /api/newsletter (placeholder endpoint, just logs for now).

Mount replacing #merch placeholder.
```

**Acceptance:** Aurora backdrops actually land on each card in the right colors, cards feel premium not combo-meal-y, newsletter form works (even if it just logs).

---

### Step 12 — Where to find us

**Goal:** §2.8 — one store card, ready to scale to many.

**Prompt:**

```
Build `components/Locations.tsx` per §2.8.

- Section id="locations". Eyebrow label-md "WHERE THE BEAR LIVES". Heading heading-h1 "Find Us."
- Data array of locations — start with ONE placeholder entry:
  [{ name: "Boba Bear — [Neighbourhood]", address: "[Street], [City], [PIN]", hours: "11:00 – 23:00 daily", lat: 28.6139, lng: 77.2090, mapsUrl: "https://maps.google.com/?q=..." }]
- Card layout (stack on mobile, 2-col on desktop if more than one location):
  - Left: Mapbox Static API tile (use a dark style — "mapbox/dark-v11" — on dark mode, "mapbox/light-v11" on light). Props pass a placeholder MAPBOX_TOKEN env var. If token missing, render a plain bg-section block with a Firefly-green pin icon.
  - Right: name (heading-h3), address (body-md), hours with Success badge "Open now" (or Error "Closed" — compute from current time vs hours string, default Open).
  - Bottom row: primary Button "Get directions" → opens mapsUrl in new tab. Secondary ghost Button "DM on Instagram" → opens https://instagram.com/bobabear.
- Below the cards, a one-line note in body-md text-secondary: "Can't find us? Ping on WhatsApp — we reply fast."

Mount replacing #locations.
```

**Acceptance:** Card renders cleanly even without a Mapbox token, directions button opens Google Maps, open/closed badge computes correctly.

---

### Step 13 — Access the Drop (final CTA)

**Goal:** §2.9 — three-way funnel out to Swiggy/Zomato/WhatsApp.

**Prompt:**

```
Build `components/AccessCTA.tsx` per §2.9.

- Full-bleed, bg-surface-sunken. Section id="access".
- Luckiest Guy display-xl: "Catch the Drop."
- body-lg text-secondary max-w-[520px]: "Three ways in. Same bear."
- 3-card row (stack on mobile, equal cols on desktop). Each card:
  - Tall card, radius-2xl, 1px border-default, bg-surface. Hover lifts 2px + shadow-glow-firefly.
  - Top: platform wordmark/logo at ~120px (Swiggy orange, Zomato red, WhatsApp green). SVGs or simple styled text if no svgs available.
  - Below: body-md text-secondary one-liner ("Fastest delivery across Delhi-NCR" / "Partnered since day one" / "Ping us directly, we'll handle it").
  - Bottom: primary Button filling the card width. Copy:
    - "Access via Swiggy" → https://www.swiggy.com/restaurants/<SWIGGY_SLUG>
    - "Access via Zomato" → https://www.zomato.com/<ZOMATO_SLUG>
    - "Ping on WhatsApp" → https://wa.me/<NUMBER>?text=Drop%2001
- All three URLs use placeholder slugs — I'll swap them.
- target="_blank" rel="noopener" on all external links.

Mount replacing #access placeholder.
```

**Acceptance:** All three cards reach the right external destinations, the CTA row isn't cluttered, glow-firefly shadow works on hover.

---

### Step 14 — Footer

**Goal:** §2.10 — four-column footer with the "Catch the drop" newsletter capture.

**Prompt:**

```
Build `components/Footer.tsx` per §2.10.

- bg-page, 1px border-subtle top, 96px vertical padding.
- 4-col desktop grid, stacked mobile:
  1. Mark column: mascot-only logo at 64px + body-md text-secondary tag line "For the Unbothered."
  2. Sitemap column: label-md heading "SITE", then Nunito body-sm list of links — Drops, Menu, Bear, Merch, Find Us, Access — each anchor.
  3. Find us column: label-md heading "ELSEWHERE". Rows:
     - "Instagram — @bobabear" (external link)
     - "WhatsApp — +91 XX XXXXX XXXXX" (wa.me link)
     - "Email — hello@bobabear.xx" (mailto)
     - Address (body-sm text-tertiary, 2 lines)
  4. Catch the Drop column: label-md heading "CATCH THE DROP". body-sm "First access to new drops. No spam. No urgency." Email input styled per §9 Inputs (radius-md, border-default, bg-surface, focus → border-focus + focus-ring). Submit button to the right — ghost variant that becomes primary on focus/hover. POST to /api/newsletter (same endpoint as merch signup).
- Bottom strip, separated by border-subtle top, body-xs text-tertiary row: © 2026 Boba Bear. · Privacy · Terms · "Design system: Street-Smart Dreamer".

Never use social icons only — always labelled links. Never use pure white or black — only palette tokens.

Mount into app/layout.tsx so Footer lives on every route (below {children}).
```

**Acceptance:** Footer columns balance, newsletter submit works, links don't have underlines unless hovered, entire footer passes colour-contrast on both modes.

---

### Step 15 — Motion + responsive + reduced-motion pass

**Goal:** catch every animation that forgot `prefers-reduced-motion`, tighten responsive behaviour.

**Prompt:**

```
Do a full motion + responsive audit across every component.

Motion:
1. Find every Framer Motion `motion.*` or CSS animation/transition that moves position or scale. For each, confirm it either wraps in `useReducedMotion()` check or the animation is disabled via the global CSS rule:
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
   }
   Add that rule to globals.css.
2. Replace any <a href="#..."> with smooth scrolling that uses the global `scroll-behavior: smooth` CSS (already added), but override to `auto` under reduced-motion.
3. Marquee pauses under reduced-motion (freeze at translateX 0).
4. Hero word stagger: collapses to instant render under reduced-motion.
5. Signature drops crossfade: collapses to instant index swap under reduced-motion.

Responsive:
1. Walk every section top-down at these widths: 360, 414, 768, 1024, 1280, 1440. Fix any overflow-x, text wrapping issues, or touch targets smaller than 44×44px.
2. Ensure the 3-breakpoint type scale (§4) actually kicks in — sample a few headings and confirm font-size changes at 768 and 1024.
3. Container gutter: 24 mobile, 32 tablet, 48 desktop. Confirm in every section.

Report each issue found and fixed.
```

**Acceptance:** Dev-tools emulator on 360, 768, 1024, 1440 looks clean top-to-bottom. Forced `prefers-reduced-motion: reduce` flattens every animation without breaking layout.

---

### Step 16 — SEO, metadata, OG image

**Goal:** complete `<head>` metadata, generated OG image, sitemap, robots.

**Prompt:**

```
Make the site share-ready.

1. app/layout.tsx metadata:
   - title: "Boba Bear — S-Tier Sips. K-Street Drip."
   - description: "For the Unbothered. Signature boba, K-culture drops, and ramyun in Delhi."
   - icons: wire favicon-32, apple-touch-icon-180, icon-192/512.
   - openGraph: title, description, url, siteName "Boba Bear", locale en_IN, type website, images: [{ url: "/opengraph-image" }]
   - twitter: card "summary_large_image".
   - themeColor: #1A2210 (Night Forest) for dark, #FAF3E2 (Boba Cream) for light via media queries.

2. app/opengraph-image.tsx using Next.js ImageResponse: render a 1200×630 image with bg-page, the Luckiest Guy headline "S-Tier Sips. K-Street Drip." centred, mascot-only logo bottom-right at 200px. Use the design system tokens via inline styles.

3. app/sitemap.ts: single entry for "/" with changeFrequency monthly.

4. app/robots.ts: allow all, sitemap URL.

5. app/icon.tsx: generate favicon from mascot-only logo at 32×32 using ImageResponse.

6. Add structured data (JSON-LD) in layout:
   - LocalBusiness schema with name, address (placeholder), geo, telephone, menu URL "/#menu", servesCuisine "Boba, Asian Street Food, Korean, Indian-Korean fusion".

Confirm the OG image renders correctly at /opengraph-image.
```

**Acceptance:** View-source shows complete meta tags, `/opengraph-image` renders 1200×630 on-brand image, LocalBusiness JSON-LD validates via Schema.org validator.

---

### Step 17 — Accessibility + Lighthouse pass

**Goal:** Lighthouse 95+ across the board, no axe critical violations.

**Prompt:**

```
Run a full accessibility and performance pass.

Accessibility:
1. Install @axe-core/react (dev dep) and wire it into layout under `process.env.NODE_ENV !== 'production'`. Fix every critical and serious violation it flags.
2. Confirm:
   - Every <img> has a meaningful alt (not filename, not empty unless decorative).
   - Landmark regions present: <header> (nav), <main>, <footer>. Each <section> has aria-labelledby pointing to its heading id.
   - Tab order follows visual order. Skip link "Skip to content" as first focusable element, targeting <main>.
   - Focus ring visible on every focusable element (outline: 3px firefly-400 with 2px offset via focus-visible).
   - Contrast: in light mode, Firefly Green and Saffron Gold should use 600/700 steps on text-bearing fills (per design system note). Audit Button variant tokens and fix if they break in light mode.
3. Use prefers-reduced-motion correctly (verified in step 15).

Performance:
1. Every <img> is <Image> from next/image with proper width/height and sizes prop.
2. Fonts swap with fallback system stack (next/font handles this — confirm no CLS).
3. No client components where server components would suffice. Nav, Hero StaggerWords, SignatureDrops, MenuCatalog, ThemeToggle should be client. Everything else server.
4. Bundle analyze (`@next/bundle-analyzer`): flag anything over 100KB gz in a single chunk.

Run Lighthouse mobile + desktop against a fresh `npm run build && npm start`. Target: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100. Report scores and any remaining issues.
```

**Acceptance:** Lighthouse hits targets, axe zero critical, keyboard-only nav works through the whole page.

---

### Step 18 — Deploy to Vercel

**Goal:** live URL under a temporary Vercel domain, custom domain wired optionally.

**Prompt:**

```
Deploy this project to Vercel.

1. Run `npx vercel login` (if I'm not already logged in) and then `npx vercel` for first-time project creation. Use project name "boba-bear".
2. Configure environment variables (none required for a first deploy, but set up placeholders): NEXT_PUBLIC_SWIGGY_URL, NEXT_PUBLIC_ZOMATO_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_INSTAGRAM_HANDLE, MAPBOX_TOKEN. Read any of these from process.env in the respective components and leave sensible fallbacks.
3. Deploy production with `npx vercel --prod`.
4. Print the production URL.

Once deployed, if a custom domain is provided later (e.g., bobabear.in), document the DNS records needed: A record → 76.76.21.21 and CNAME www → cname.vercel-dns.com. Don't set it up now unless I provide the domain.

Do NOT commit any .env file. Add .vercel to .gitignore if not already.
```

**Acceptance:** Site is live at a public Vercel URL, all sections render, no console errors in production build.

---

### Step 19 — Figma refinement loop

**Goal:** round-trip the coded site into Figma so the design team can polish, then push the polish back into the code.

The Claude-to-Figma integration uses the Figma MCP server (or the Dev Mode MCP if you're on a paid Figma plan) to let Claude read Figma frames and emit updated code.

**Prompt:**

```
I want to set up a round-trip refinement loop between this Next.js site and Figma.

1. Walk me through installing the Figma MCP server for Claude (the one that exposes Figma's Dev Mode API). I have a Figma paid plan. My Figma file is at <PASTE LINK>.

2. In that file, I want a frame per section (Hero, Marquee, SignatureDrops, MenuCatalog, TheBear, MerchDrop, Locations, AccessCTA, Footer). Create those frame stubs via the MCP in the correct order with the correct desktop dimensions (1440 width), applying the design tokens (colors, fonts, spacing) from `boba-bear-design-system.md`.

3. Take screenshots of each coded section at 1440 width (use Playwright installed as a dev dep) and save them to /figma-sync/<section>.png. I'll import those into the matching Figma frames as references.

4. After the design team refines a frame, I'll paste the Figma URL back into Claude with "update <ComponentName> to match this frame." At that point:
   - Read the frame via the Figma MCP.
   - Diff against the current component code.
   - Propose the minimal edit set (which Tailwind classes change, which tokens get swapped, any new props needed).
   - Apply edits, run `npm run build`, report pass/fail.

5. For this first pass, just do steps 1–3 and print the screenshot paths. Don't write any new component code yet.
```

**Acceptance:** Figma MCP connects successfully. Eight section screenshots at 1440 exist in /figma-sync/. Figma file has an empty frame per section named correctly.

---

### Step 20 — Content + launch polish

**Goal:** swap every placeholder for real copy, phone numbers, links, photos.

**Prompt:**

```
Sweep the repo for every TODO, <NUMBER>, <SWIGGY_SLUG>, <ZOMATO_SLUG>, placeholder image path, lorem text, or "TBD". Print a single checklist of every location that needs a real value, grouped by component. I'll fill in the values and paste them back — then you apply them in one batch.

Also:
- Add Vercel Analytics (`@vercel/analytics/react`) to app/layout.tsx.
- Add Plausible Analytics to layout via a <script src="https://plausible.io/js/script.js" data-domain="..."> tag, gated behind NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
- Create a short README.md covering: stack, scripts, env vars, how to edit menu.json, how to swap images, deploy command.
```

**Acceptance:** Single consolidated checklist of placeholder values, README exists, analytics loaded in production.

---

## 6. Verification checklist (run before showing stakeholders)

- [ ] Dark and light modes both pass WCAG AA for every text/background pair.
- [ ] `prefers-reduced-motion: reduce` flattens every animation without breaking layout.
- [ ] All 69 menu items render. Category tabs, sub-category chips, and diet filters all work.
- [ ] No prohibited copy anywhere: no "delicious", "tasty", "yummy", "best food in town", "Order Now", "Buy Now", "Click Here", "Add to Cart", "cloud kitchen", "restaurant" as a self-label.
- [ ] Nav scrollspy updates as you scroll through each anchor.
- [ ] Hero headline stagger fires once, on mount, not on every scroll up.
- [ ] Marquee loops without seam, pauses on hover.
- [ ] Signature drops pin on desktop, stack on mobile.
- [ ] Three external funnels (Swiggy, Zomato, WhatsApp) all target `_blank` and `rel="noopener"`.
- [ ] Footer newsletter form validates email, POSTs to endpoint, shows success micro-state using the access/discovery voice (e.g., "Secured. First drop incoming.").
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100.
- [ ] No hard-coded hex anywhere in components — every color comes through Tailwind tokens.
- [ ] No Luckiest Guy on any button, input, or label (only hero display types).
- [ ] No more than 2 font families and 2 weights per viewport visible at once.

---

## 7. Voice cheat sheet (keep this next to you while writing)

| Use | Avoid |
|---|---|
| Access the Drop | Order Now |
| View Current Drop | Buy Now |
| Ping on WhatsApp | Add to Cart |
| Access via Zomato | Click Here |
| Securing the Drop… | Loading… |
| Catch the Drop (newsletter) | Subscribe / Sign up for deals |
| S-Tier · K-Street · Unbothered · Drop | delicious / tasty / yummy / best |
| "The bear stays unbothered." | "HURRY — limited time!" |

---

## 8. Where this ends, and what lives outside it

Everything on this page is a **landing** surface. When these surfaces eventually need to grow:

- **Online ordering flow** → stays external (Swiggy / Zomato / Petpooja). Don't rebuild in-site without a strong reason.
- **Merch store** → when ready, spin up Shopify/Lemon Squeezy and link out from `/#merch`. Keep the landing page's merch section as showcase only.
- **Content / editorial** (recipes, brand stories, drop announcements) → a `/journal` route running on the same Next app with MDX. Not in scope for this build, but the IA leaves room for it in the nav without breaking anything.

If a future decision isn't covered in `boba-bear-design-system.md` or this guide, it isn't an IA question — it's a brand strategy or platform question, and lives elsewhere.

---

*For the Unbothered.*
