# Boba Bear · Design System

> *For the Unbothered.*
> *Catch the Drop.*
> *S-Tier Sips. K-Street Drip.*

Single source of truth for every Boba Bear visual decision — colors, type, spacing, motion, components, voice. Built for the product surfaces we ship today (menu, ordering, marketing site, packaging) and the ones we're walking into next (merch drops, artist collaborations).

**Core discipline:** A highly playful brand demands *more* UI discipline, not less. Brand energy carries delight. The interface carries clarity.

---

## Brand context

Boba Bear is a premium lifestyle brand built around **Indo-Korean fusion food** with **boba tea as the hero product**. Audience is Gen Z. The aesthetic vocabulary is closer to a streetwear drop than a restaurant — editorial, curated, deadpan-confident.

**What we make:**
1. **Food + boba** — current product. Indo-Korean fusion menu, boba tea hero range, dine-in + delivery (Zomato, WhatsApp ping).
2. **Merch (next)** — tees, cups, caps, totes. Drop model.
3. **Artist collaborations (next)** — local singers, dancers, illustrators, photographers. Drop-style activations.

**Mascot:** A deadpan, premium bear with subtle smirk, S-curve torso, solid black pearl nose with white crescent highlight, and sturdy blocky legs. He looks aloof. He's the performer; Aurora is the stage.

**Never:** Enthusiastic. Desperate. Loud. Plush-toy cute. Generic fast-food. Fake-luxury minimalist.

---

## Sources

This system was bootstrapped from a single document the team uploaded — `uploads/design-system (1).md` — plus written brand context from the founder (Gen Z audience, premium lifestyle positioning, Indo-Korean food + boba, future merch + artist collabs, tagline "For the Unbothered", Firefly Green + Bear Brown palette).

**No codebase, Figma file, screenshots, or existing UI was provided.** The UI kits in this project are therefore **first-principles mockups** built strictly against the design rules — they are reference, not recreations of shipped product. When real product code or Figma exists, link it here and re-run the UI kit step to align.

---

## Index — what's where

| Path | What |
|---|---|
| `README.md` | This file. Start here. |
| `SKILL.md` | Agent-skill manifest. Cross-compatible with Claude Code skills. |
| `colors_and_type.css` | All design tokens as CSS custom properties. Drop-in. |
| `fonts/` | Font reference + license notes. CDN-loaded by default. |
| `assets/` | Logos, mascot, iconography. Copy from here into any project. |
| `assets/logo/` | Logo lockups in SVG. |
| `assets/icons/` | Iconography. Lucide via CDN; copy `lucide.svg` for offline. |
| `preview/` | Cards for the Design System tab — type, color, spacing, component, brand specimens. |
| `ui_kits/marketing-site/` | Marketing website UI kit (homepage, drop page, menu page). |
| `ui_kits/ordering-app/` | Mobile ordering app UI kit (home, menu, cart, order tracking). |

---

## Improvements made to the source spec

The user explicitly asked us to *correct and tighten* the existing system. Here's what changed and why — surface to the team for review.

| Where | Before | After | Why |
|---|---|---|---|
| Spacing scale | included `6` | dropped `6`, kept `2` as a single half-step exception | `6` isn't a multiple of 4. Either commit to 4-grid or don't. |
| `pad/sm` | 6×12 | **8×12** | 4-grid alignment. |
| `pad/md` | 10×16 | **12×16** | 4-grid alignment. |
| `pad/lg` | 14×24 | **16×24** | 4-grid alignment. |
| Body line-height | 1.6 | **1.55** | 1.6 floats Nunito apart at UI sizes. 1.55 reads tight + premium. |
| H5 line-height | 1.4 | **1.3** | H5 was leaking into body LH. |
| Tracking notation | `-2%`, `8%` | `-0.02em`, `0.08em` | `%` isn't valid CSS for `letter-spacing`. |
| Light-mode primary | Firefly 500 (`#8FBD28`) | Firefly 500 with `text-on-primary` = Forest 800 | Same hex, but explicitly documented to pass AA on cream. |
| Grain / texture | not specified | added `--grain` inline-SVG token | The "kraft streetwear" feel needs paper noise. Source spec implied it ("kraft stamp", "premium packaging") but didn't tokenize. |
| Opacity scale | not specified | added `--opacity-disabled / muted / overlay` | Was being invented per-component. |
| Blur scale | mentioned in nav | added `--blur-sm/md/lg` + `--protection-top/bottom` gradients | Sticky nav and hero protection were referenced without tokens. |
| Z-index scale | not specified | added `--z-base → --z-toast` | Layering was undefined. |
| Inset shadows | not specified | added `--shadow-inset-sm/md` | Recessed wells (`bg/surface-sunken`) had no defined treatment. |
| Aurora gradient | written as text | added `--aurora-gradient` linear-gradient token | Was being hand-built in components. |
| Semantic tokens | dark + light, but light primary buttons weren't enforced as Firefly 500/600 | locked `--interactive-primary` per mode | Light mode was inheriting dark values in some specs. |

Nothing in the **brand identity** was changed — colors, fonts, tagline, mascot rules are all from source.

---

## Content fundamentals

Copy is a design decision. Every button, loader, error message, and section header runs through this filter before it ships.

### Voice
**Visionary. Subtle. Street-smart.** Brevity of a fashion label. Deadpan where appropriate. *Never enthusiastic.* The bear doesn't try to sell you on the bear.

### Tone register
- **Short.** Two-word headlines preferred. Three is fine. Five is a sentence and a sentence is too long.
- **Lowercase or Title Case.** Never ALL CAPS in body. ALL CAPS is reserved for display type (Luckiest Guy is uppercase by default) and labels.
- **First-person plural ("we") used sparingly.** Most copy is in second person ("you") or impersonal ("the drop", "the menu"). The brand doesn't beg.
- **No exclamation marks.** Period.
- **Em dash > comma.** When a beat is needed, use `—`.

### CTAs frame access or discovery, never transaction.
| ✅ Approved | ❌ Prohibited |
|---|---|
| *Access the Drop* | *Order Now* |
| *View Current Drop* | *Buy Now* |
| *Ping on WhatsApp* | *Add to Cart* |
| *Access via Zomato* | *Click Here* |
| *Securing the Drop…* | *Loading…* |
| *Get on the list* | *Sign up* |
| *See the menu* | *Browse our menu* |

### Vocabulary — what we never say
*best food in town · delicious · tasty · yummy · revolutionising · disrupting · curated experience · HURRY · LIMITED TIME · cloud kitchen · restaurant · drink · beverage · snack*

### Vocabulary — what we say instead
*drop · menu · the bear · pearls (not "tapioca") · sips · plate · session (a meal) · the bar (boba counter) · the lineup · access · waitlist*

### Emoji
**Almost never.** Boba Bear voice is deadpan; emoji are not. The single approved exception is `•` (bullet) and `—` (em dash) as separators. If you find yourself reaching for an emoji, the copy is already wrong.

### Examples in the wild
> **Hero (Luckiest Guy):**
> `FOR THE UNBOTHERED.`
>
> **Sub (Bubblegum Sans):**
> `Indo-Korean. Iced. Earnest about almost nothing.`
>
> **Empty-state (Nunito):**
> `Nothing here yet. The next drop lands when it lands.`
>
> **Error (Nunito):**
> `Couldn't reach the bar. Try again in a sec.`
>
> **Loading:**
> `Securing the drop…`

---

## Visual foundations

### Color
Five core scales: **Firefly Green** (primary identity, CTAs), **Saffron Gold** (wordmark, accent), **Bear Brown** (body type on cream), **Boba Cream** (light surfaces), **Night Forest** (dark surfaces + premium packaging). Aurora is a pastel *family* (Rose, Peach, Butter, Mint, Sky, Lavender) — used as the *stage* for merch, drops, and photography backdrops. Aurora is **never** a chaotic decorative wash and **never** replaces Firefly Green as the identity anchor.

**Mode:** Dark-first. Night Forest is the default surface. Light mode (Boba Cream base) is fully supported and tuned — both modes are first-class, picked per surface, not per project.

**Never:** pure `#000000` or pure `#FFFFFF` for text. Always palette values.

### Type
Four families, strict roles. **Luckiest Guy** for one expressive peak per screen (hero display only). **Bubblegum Sans** for all structural headings. **Nunito** for everything you tap, read, or act on. **JetBrains Mono** for code and SKUs. Never more than two families on a single view; never more than two weights per family on a single view.

### Spacing
**4 px base unit.** Every padding, margin, gap is a 4-multiple. A single half-step (`2px`) is allowed for hairline insets (focus offset, icon nudge) and nothing else. Section rhythm: 48 mobile / 64 tablet / 96 desktop.

### Backgrounds & textures
- **Default surface:** flat color (`--bg-page`). No gradients on body backgrounds.
- **Full-bleed imagery:** Yes, for hero blocks and drop pages. Always with a protection gradient (`--protection-top` or `--protection-bottom`) to keep overlaid display type legible.
- **Grain / kraft texture:** `--grain` (inline SVG noise). Apply at ~30–40% opacity on cream surfaces to evoke kraft paper / sticker stock. Used sparingly on hero panels and packaging mocks; **never on text-heavy content**.
- **Repeating patterns:** None. We don't pattern-fill. The mascot is the only illustrative element.
- **Gradients:** Only the Aurora gradient, only in strategic conversion moments (progress bars, primary indicators, drop reveals). Decorative bluish-purple gradients are explicitly prohibited.
- **Hand-drawn illustrations:** None. The mascot is custom and curated; everything else is photographic or typographic.

### Animation
- **Easing:** `--ease-out` default. `--ease-spring` (subtle overshoot, no bounce) for confirm states. `--ease-linear` only for marquees.
- **Duration:** 150ms taps · 250ms hover/card lift · 400ms dropdowns · 600ms modals · 20–30s marquee loops.
- **Principles:** Unbothered speed. **Never frantic.** Never bouncy. No desperate bouncing CTAs, no jittery loops, no over-animated hero carousels. Motion is a pacing device, not a decoration.
- **Reduced motion:** All entrance animations are gated by `prefers-reduced-motion`. The brand is calm by default; it should also be accessible.

### Hover states
- **Primary CTA:** keep fill, add `--shadow-glow-firefly`, lift 1px. No color shift on hover (color shift is *pressed*).
- **Secondary CTA:** keep fill, add `--shadow-glow-saffron`, lift 1px.
- **Outline / Ghost:** fill with `--interactive-ghost-hover` (an ~40% tint of the surface).
- **Links:** color shifts up one step in the Firefly scale.
- **Cards:** lift 2px, border switches from `--border-default` to `--border-strong`, add `--shadow-md`.
- **List rows:** background → `--interactive-ghost-hover`.

### Press / active states
- **Buttons:** color shifts to `--interactive-primary-pressed` (one Firefly step darker). No scale shrink — shrinking feels cheap.
- **Cards in a press-state interaction:** drop the lift back to 0 with no shadow for ~80ms before navigating.
- **Touch targets:** 44 × 44 px minimum, always.

### Focus
**3 px outer ring**, `--focus-ring` token, offset 2 px from element edge. Never the default browser outline. Always visible for keyboard navigation.

### Borders
- Cards + dividers: 1 px `--border-default`.
- Emphasis: 1 px `--border-strong` (used on card hover, on selected chips).
- Outline buttons + destructive buttons: 1.5 px.
- No double borders. No dashed borders.

### Shadows (elevation)
Editorial flatness with warm depth. Cards sit **flat at rest** — elevation activates on hover and focus. Glow shadows (`--shadow-glow-firefly`, `--shadow-glow-saffron`) are reserved for primary/secondary CTA hover and **never stack** with other shadows. Modals use `--shadow-xl` over `--overlay-modal` dim.

**Never shadow static decorative elements.** Elevation = interaction, not decoration.

### Protection gradients vs capsules
- **Protection gradient:** Used to keep light-on-image text legible. Always vertical. Always extends ~40% of the image height. Tokens: `--protection-top`, `--protection-bottom`.
- **Capsule (pill):** Used when text needs a hard container over an image — `radius-full`, `bg/surface` with `--opacity-overlay`, padding `pad/sm`. Preferred over protection gradients when only a short label sits over a photo.

### Layout
- **Container:** 1280 px max width. Gutters 24/32/48 (mobile/tablet/desktop).
- **Sticky elements:** Top nav (64 px desktop, 56 px mobile) with `--blur-md` backdrop. No bottom-of-page sticky CTAs — the bear doesn't chase you.
- **Full-bleed:** Hero blocks and drop pages may break container. Inner content still respects gutter.
- **Asymmetry permitted.** Editorial layout is on the table — off-center hero, dropped cap display type, oversized type clipping the viewport. Don't default to grid-centered.

### Transparency & blur
- **Glass nav:** `--blur-md` over `--bg-page` at ~85% opacity.
- **Hero protection:** `--blur-lg` on the backdrop layer beneath display type, if the photo is busy.
- **Overlay dim:** `--overlay-modal` (Forest 950 @ 65% dark · Brown 950 @ 55% light).
- **Disabled state:** `--opacity-disabled` (0.45). Don't gray out — just dim.

### Imagery — color vibe
- **Warm.** Boba Bear photos lean cream, brown, gold, with Firefly green as accent.
- **Grain encouraged** in editorial imagery. Clean and digital in product cuts.
- **Not B&W.** Not desaturated. Color is the point.
- **No stock photos. No AI-generated food.** Real product, real bowls, real people.
- **Generous whitespace (or darkspace) around subjects.** Streetwear-catalogue framing.

### Corner radii
| Surface | Radius |
|---|---|
| Inline code, tiny chips | 2 px (`--radius-xs`) |
| Tags, badges, sticker corners | 4 px (`--radius-sm`) |
| Buttons, inputs, dropdowns | **8 px (`--radius-md`)** |
| Cards, menu chips | **12 px (`--radius-lg`)** |
| Modals, featured blocks | 16 px (`--radius-xl`) |
| Spotlight / drop-feature cards | 24 px (`--radius-2xl`) |
| Avatars, status dots, pill badges | 9999 px (`--radius-full`) |

**Don't mix scales.** Buttons + inputs live at 8 px. Cards live at 12 px. The 4 px gap is hierarchy.

### Cards
- Surface: `--bg-surface`
- Border: 1 px `--border-default`
- Radius: `--radius-lg` (12 px)
- Overflow: `hidden` (the die-cut sticker silhouette)
- Image area on preview cards: 200 px mobile / 240 px tablet+, Aurora bg or photography
- Content padding: 16 / 20 / 24 (mobile/tablet/desktop)
- Hover: lift 2 px, border → `--border-strong`, `--shadow-md`
- Transition: 250 ms `--ease-out` on transform + shadow + border

---

## Iconography

### Approach
Boba Bear uses a **single, restrained line-icon set** at consistent stroke weight. Icons are functional only — wayfinding, status, controls. They never decorate. They never substitute for copy that should exist.

### Set
**Lucide** (lucide.dev). MIT licensed, ~1000 icons, 1.5px / 2px stroke variants. Linked from CDN by default (`https://unpkg.com/lucide@latest`). A copy of the SVG sprite is shipped at `assets/icons/lucide.svg` for offline / production builds.

**Why Lucide over Heroicons / Phosphor / Tabler:** Lucide's 2px-stroke variant aligns with the Bubblegum Sans + Nunito stroke weight better than Heroicons (too thin) or Phosphor (too playful and inconsistent). Tabler was a near miss — went with Lucide for the larger community and cleaner geometric construction.

### Rules
- **Size:** 16 / 20 / 24 px. Never custom sizes.
- **Stroke:** 2 px (the default Lucide stroke). Don't mix 1.5 and 2 on the same surface.
- **Color:** inherit `currentColor`. Always.
- **Alignment:** vertically centered with adjacent text via flex, never `vertical-align`.
- **Pair with label:** icon-only buttons need an `aria-label`. Icon + label is preferred for unfamiliar actions.

### Custom icons
Beyond Lucide, the **mascot is the only custom-drawn illustrative element**. There are no other custom icons. If a Lucide icon doesn't exist for a concept, the concept gets a word, not a custom icon.

### Emoji & unicode
- **Emoji:** No. (See *Content fundamentals*.)
- **Unicode separators:** `•` (U+2022) and `—` (U+2014) only.
- **Unicode arrows in CTAs:** `→` (U+2192) is permitted at the end of *Access* CTAs ("Access the Drop →"). No other directional unicode.

### What we copied / linked
- `assets/icons/lucide.svg` — single-file Lucide sprite (subset of commonly-used icons). Bundled for offline.
- `assets/logo/*.svg` — Boba Bear logo lockups (placeholder mascot included — replace with team's master files when available).

**⚠ Substitution flagged:** The Boba Bear mascot SVG in this system is a *generic placeholder bear* drawn to the brand spec (deadpan eyes, S-curve torso, pearl nose, blocky legs). **Replace with the team's master mascot file** before shipping anything externally.

---

## Quick reference

**Core colors:** Firefly Green `#A8D832` · Saffron Gold `#F5A623` · Bear Brown `#7B4A2D` · Boba Cream `#FAF3E2` · Night Forest `#1A2210`
**Fonts:** Luckiest Guy (display) · Bubblegum Sans (headings) · Nunito (body + UI) · JetBrains Mono (code)
**Grid:** 4 px base · max width 1280 · mobile gutter 24, desktop gutter 48
**Radius anchors:** 8 px buttons / inputs · 12 px cards · 9999 pills
**Breakpoints:** Desktop ≥ 1024 · Tablet 768–1023 · Mobile < 768
**Governing rule:** Aurora is the stage. The bear is the performer. Brand carries delight. UI carries clarity.

---

*When a design decision isn't covered here, it isn't a design-system question — it's a brand-strategy or platform-playbook question, and lives elsewhere.*
