# Boba Bear — Design System

> Single source of truth for every Boba Bear visual design decision.
> Two modes (Dark + Light). Three breakpoints (Desktop ≥1024 · Tablet 768–1023 · Mobile <768).
> Brand strategy, packaging production, and platform playbooks live elsewhere.

---

## 1. Brand essence

**Archetype:** Street-Smart Dreamer — nostalgic magic + modern streetwear edge.
**Active taglines:** *For the Unbothered.* · *Catch the Drop.* · *S-Tier Sips. K-Street Drip.*
**Governing aesthetic:** Every artefact reads like a premium streetwear drop. Editorial. Curated. Confident.

**Design feel:** Unbothered · premium · culturally fluent · subtly nostalgic · confident · street-smart.
**Never:** Enthusiastic · desperate · loud · plush-toy cute · generic fast-food · fake-luxury minimalist.

**Core discipline:** A highly playful brand demands *more* UI discipline, not less. Brand energy carries delight. The interface carries clarity.

---

## 2. Colour — Tier 1 raw scales

Every scale: 10 steps, 50 (lightest) → 950 (darkest). **Base value bolded** is the canonical brand value from the Brand Asset Playbook.

### Core identity

**Firefly Green** — logo outline, primary CTAs, active states, menu headers, signage

| 50 | 100 | 200 | 300 | **400** | 500 | 600 | 700 | 800 | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#F5FAE6` | `#E8F3C4` | `#D3E889` | `#BDDE5A` | **`#A8D832`** | `#8FBD28` | `#759E20` | `#5A7C18` | `#405810` | `#1F2C08` |

**Saffron Gold** — "BOBA BEAR" wordmark, promo badges, price highlights, accent pops, sticker borders

| 50 | 100 | 200 | 300 | **400** | 500 | 600 | 700 | 800 | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#FEF7EC` | `#FDE9C5` | `#FAD28A` | `#F8BC58` | **`#F5A623`** | `#D88C1A` | `#B37010` | `#8A5510` | `#5E3A0C` | `#2F1D06` |

### Warmth & foundation

**Bear Brown** — mascot fill, earthy textures, body text on cream

| 50 | 100 | 200 | 300 | 400 | 500 | **600** | 700 | 800 | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#FAF3EC` | `#F0DCC4` | `#DBBA92` | `#C39866` | `#A7764A` | `#8B5C38` | **`#7B4A2D`** | `#5F3A24` | `#42281A` | `#1F120C` |

**Boba Cream** — light-mode page bg, packaging fill, menu cards, paper textures

| 50 | 100 | **200** | 300 | 400 | 500 | 600 | 700 | 800 | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#FEFCF7` | `#FDF8EB` | **`#FAF3E2`** | `#F4E8C8` | `#EBD9A6` | `#D9C286` | `#B9A365` | `#948048` | `#6B5C34` | `#342D1A` |

**Night Forest** — dark-mode page bg, premium packaging, moody signage

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | **800** | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#EEF2EA` | `#D4DFC5` | `#A8BF8F` | `#7C9F5F` | `#558036` | `#3D6026` | `#2E4720` | `#22361A` | **`#1A2210`** | `#0D1208` |

### Aurora — the Boba "rainbow"

Aurora is a pastel family, not a scale. It replaces any reference to "rainbow" in the system. Used as stage colours for merch, drops, photography backdrops, and as the brand's multi-colour indicator (progress bars, active states, primary conversion moments). Never as a chaotic decorative wash. Never replaces Firefly Green / Saffron Gold as the core identity anchor.

**Aurora Overuse Guardrail:** Aurora must remain an accent/stage family, not a base UI environment. Avoid more than one Aurora-led emphasis zone per viewport unless the surface is a specifically campaign-led or drop-led expressive moment.

| Token | Hex | Soft fill (70%) |
|---|---|---|
| Aurora / Rose | `#F9C4CC` | `#F9C4CCB3` |
| Aurora / Peach | `#FAC9A8` | `#FAC9A8B3` |
| Aurora / Butter | `#FAF0A0` | `#FAF0A0B3` |
| Aurora / Mint | `#B8F0C4` | `#B8F0C4B3` |
| Aurora / Sky | `#A8D8F5` | `#A8D8F5B3` |
| Aurora / Lavender | `#D4BEF5` | `#D4BEF5B3` |

**Aurora gradient sequence** (for strategic indicators where multiple colours are needed):
Rose → Peach → Butter → Mint → Sky → Lavender

### Global utility scales (shared across modes)

**Neutral**

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 950 |
|---|---|---|---|---|---|---|---|---|---|
| `#FAFAFA` | `#F4F4F4` | `#E4E4E4` | `#C8C8C8` | `#A0A0A0` | `#787878` | `#5A5A5A` | `#3C3C3C` | `#242424` | `#0F0F0F` |

**Semantic base values** (use Tailwind/Radix-style 50–950 scales around each):

| Role | Base | Use |
|---|---|---|
| Success | `#16A34A` | Published, confirmed, positive |
| Warning | `#F59E0B` | Pending, caution |
| Info | `#3B82F6` | Neutral info, system messages |
| Error | `#E11D48` | Destructive, validation, rejected |

---

## 3. Colour — Tier 2 semantic tokens

Both modes are first-class. Pick the mode per surface, not per project. Dark mode is preferred for immersive, brand-led, campaign-led, mood-led, or editorial surfaces. Light mode is preferred for utility-heavy, reading-heavy, form-heavy, commerce-dense, or operationally dense product flows. Mixed-mode transitions must feel intentional and not random.

### Dark mode (Night Forest base — the default)

| Token | Value | Usage |
|---|---|---|
| bg/page | `#1A2210` | Page background |
| bg/section | `#22361A` | Alternating sections |
| bg/surface | `#2E4720` | Cards, panels |
| bg/surface-raised | `#3D6026` | Modals, raised cards |
| bg/surface-sunken | `#0D1208` | Hero backdrop, recessed wells |
| text/primary | `#FAF3E2` | Headings, body |
| text/secondary | `#EBD9A6` | Descriptions, metadata |
| text/tertiary | `#A8BF8F` | Captions, timestamps |
| text/disabled | `#558036` | Disabled states |
| text/label | `#A8D832` | Labels, overline tags |
| text/on-primary | `#1A2210` | Text on Firefly Green fills |
| text/on-secondary | `#1A2210` | Text on Saffron Gold fills |
| border/default | `#2E4720` | Card borders, dividers |
| border/strong | `#558036` | Emphasized borders |
| border/subtle | `#22361A` | Quiet dividers |
| border/focus | `#A8D832` | Focus ring base |
| interactive/primary | `#A8D832` | Primary buttons, CTAs |
| interactive/primary-hover | `#BDDE5A` | Hover |
| interactive/primary-pressed | `#8FBD28` | Pressed |
| interactive/secondary | `#F5A623` | Accent buttons, highlights |
| interactive/secondary-hover | `#F8BC58` | Hover |
| interactive/ghost-hover | `#2E472033` | Ghost button hover fill |
| interactive/destructive | `#E11D48` | Destructive actions |
| focus-ring | `rgba(168, 216, 50, 0.35)` | 3px outer ring |

### Light mode (Boba Cream base)

| Token | Value | Usage |
|---|---|---|
| bg/page | `#FAF3E2` | Page background |
| bg/section | `#FDF8EB` | Alternating sections |
| bg/surface | `#FEFCF7` | Cards, panels |
| bg/surface-raised | `#FFFFFF` | Modals, raised cards |
| bg/surface-sunken | `#F4E8C8` | Hero backdrop, recessed wells |
| text/primary | `#42281A` | Headings, body |
| text/secondary | `#5F3A24` | Descriptions, metadata |
| text/tertiary | `#8B5C38` | Captions, timestamps |
| text/disabled | `#C39866` | Disabled states |
| text/label | `#7B4A2D` | Labels, overline tags |
| text/on-primary | `#1A2210` | Text on Firefly Green fills |
| text/on-secondary | `#42281A` | Text on Saffron Gold fills |
| border/default | `#EBD9A6` | Card borders, dividers |
| border/strong | `#C39866` | Emphasized borders |
| border/subtle | `#F4E8C8` | Quiet dividers |
| border/focus | `#759E20` | Focus ring base |
| interactive/primary | `#8FBD28` | Primary buttons (darker for contrast) |
| interactive/primary-hover | `#759E20` | Hover |
| interactive/primary-pressed | `#5A7C18` | Pressed |
| interactive/secondary | `#D88C1A` | Accent buttons (darker for contrast) |
| interactive/secondary-hover | `#B37010` | Hover |
| interactive/ghost-hover | `#EBD9A633` | Ghost button hover fill |
| interactive/destructive | `#E11D48` | Destructive actions |
| focus-ring | `rgba(117, 158, 32, 0.25)` | 3px outer ring |

**Contrast note:** Firefly Green and Saffron Gold base values (400) are tuned for dark mode. On light mode, use the 600–700 steps for any fill that carries text, so they pass WCAG AA on cream. Always test both modes.

---

## 4. Typography

### Type families

| Family | Role | Use for | Never for |
|---|---|---|---|
| Luckiest Guy | Display-only | Logo wordmark, hero display text, major campaign titles, macro-headers | Menus, buttons, form labels, body copy, captions |
| Bubblegum Sans | Headings | Section titles, menu category headers, packaging subheads | Body copy, UI labels, captions |
| Nunito | Body + UI | Body, UI text, buttons, labels, captions, form text | Hero display |
| JetBrains Mono | Code | Inline code, code blocks, product SKUs, API references | Body copy |

### Responsive type scale (3 breakpoints)

Size changes per breakpoint. Weight, line-height, tracking stay constant. Line-height values are unitless.

**Display — Luckiest Guy (wt 400, use sparingly)**

| Style | Desktop | Tablet | Mobile | LH | Tracking |
|---|---|---|---|---|---|
| display/2xl | 96 | 72 | 56 | 1.05 | -2% |
| display/xl | 80 | 60 | 44 | 1.05 | -2% |
| display/lg | 64 | 48 | 36 | 1.1 | -1% |

**Heading — Bubblegum Sans (wt 400)**

| Style | Desktop | Tablet | Mobile | LH | Tracking |
|---|---|---|---|---|---|
| heading/h1 | 56 | 44 | 32 | 1.15 | -1% |
| heading/h2 | 40 | 32 | 28 | 1.2 | 0% |
| heading/h3 | 32 | 26 | 22 | 1.25 | 0% |
| heading/h4 | 24 | 22 | 20 | 1.3 | 0% |
| heading/h5 | 20 | 19 | 18 | 1.4 | 0% |

**Body — Nunito**

| Style | Desktop | Tablet | Mobile | Wt | LH |
|---|---|---|---|---|---|
| body/lg | 18 | 17 | 16 | 400 | 1.6 |
| body/md | 16 | 15 | 15 | 400 | 1.6 |
| body/sm | 14 | 14 | 14 | 400 | 1.5 |
| body/xs | 12 | 12 | 12 | 400 | 1.5 |

**Label — Nunito (uppercase)**

| Style | Desktop | Tablet | Mobile | Wt | LH | Tracking |
|---|---|---|---|---|---|---|
| label/lg | 14 | 13 | 13 | 600 | 1 | 6% |
| label/md | 12 | 12 | 12 | 700 | 1 | 8% |
| label/sm | 10 | 10 | 10 | 700 | 1 | 12% |

**Caption — Nunito**

| Style | Desktop | Tablet | Mobile | Wt | LH |
|---|---|---|---|---|---|
| caption/md | 12 | 12 | 12 | 400 | 1.5 |
| caption/sm | 11 | 11 | 11 | 400 | 1.5 |

**Code — JetBrains Mono**

| Style | Desktop | Tablet | Mobile | Wt |
|---|---|---|---|---|
| code/md | 14 | 14 | 13 | 400 |
| code/sm | 12 | 12 | 12 | 400 |

### Framer fluid CSS (clamp — bridges 3-breakpoint spec into Framer's 2-breakpoint render)

```css
.display-2xl { font-size: clamp(56px, 7.5vw, 96px); }
.display-xl  { font-size: clamp(44px, 6vw, 80px); }
.display-lg  { font-size: clamp(36px, 5vw, 64px); }
.heading-h1  { font-size: clamp(32px, 4.5vw, 56px); }
.heading-h2  { font-size: clamp(28px, 3.2vw, 40px); }
.heading-h3  { font-size: clamp(22px, 2.5vw, 32px); }
.heading-h4  { font-size: clamp(20px, 2vw, 24px); }
.body-lg     { font-size: clamp(16px, 1.4vw, 18px); }
.body-md     { font-size: clamp(15px, 1.2vw, 16px); }
.label-md    { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
```

### Typography rules

- Never more than two font families on a single view.
- Never more than two weights per family on a single view.
- Luckiest Guy is reserved for expressive peaks. If it appears on a screen, there is only one — the hero.
- Bubblegum Sans owns structural headings. **Exception:** On highly functional, dense product surfaces (settings, order history, checkout, dense webapp dashboards), structural headings may downshift to Nunito Semibold/Bold where clarity, seriousness, and operational readability matter more than expressive brand texture.
- Nunito does everything a user needs to tap, read, or act on.
- Do not swap Bubblegum Sans and Nunito roles, except under the strict functional density exception detailed above.

---

## 5. Spacing

**Base unit: 4px.** Every padding, margin, and gap is a multiple of this.

**Scale (px):** 0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128 · 160

### Component padding (V × H)

| Token | Value | Use |
|---|---|---|
| pad/xs | 4 × 8 | Tight chips, dense badges |
| pad/sm | 6 × 12 | Small buttons, compact tags |
| pad/md | 10 × 16 | Default buttons, inputs, chips |
| pad/lg | 14 × 24 | Large CTAs, prominent buttons |
| pad/xl | 20 × 32 | Hero CTAs, featured actions |

### Section spacing (vertical rhythm between major blocks)

| Breakpoint | Spacing |
|---|---|
| Mobile | 48px |
| Tablet | 64px |
| Desktop | 96px |

### Grid gaps

| Context | Gap |
|---|---|
| Tight list rows | 8px |
| Default stack | 16px |
| Card grid | 24px |
| Comfortable section | 32px |
| Generous / hero | 48px |

### Container

- **Max width:** 1280px
- **Horizontal gutter:** 24px mobile · 32px tablet · 48px desktop
- **Hero full-bleed:** breaks container, but inner content respects gutter

---

## 6. Border radius

| Token | Value | Use |
|---|---|---|
| radius/none | 0 | Full-bleed sections, rigid dividers |
| radius/xs | 2 | Inline code, tiny chips |
| radius/sm | 4 | Tags, badges, small pills, sticker corners |
| radius/md | 8 | Buttons, inputs, selects, dropdowns |
| radius/lg | 12 | Cards, menu chips, preview tiles |
| radius/xl | 16 | Modals, featured blocks, hero panels |
| radius/2xl | 24 | Spotlight surfaces, drop-feature cards |
| radius/full | 9999 | Avatars, status dots, pill badges, round icons |

**Rule:** Don't mix scales. Buttons + inputs live at 8px. Cards live at 12px. Never bump a button up to match a card — the radius gap is hierarchy.

---

## 7. Elevation

Boba Bear leans on editorial flatness + warm depth. Cards sit flat; elevation activates on hover and focus.

| Token | Value | Use |
|---|---|---|
| shadow/none | none | Static elements at rest |
| shadow/xs | `0 1px 2px rgba(26, 34, 16, 0.08)` | Subtle separation |
| shadow/sm | `0 2px 6px rgba(26, 34, 16, 0.10)` | Resting cards (optional) |
| shadow/md | `0 4px 12px rgba(26, 34, 16, 0.14)` | Card hover |
| shadow/lg | `0 8px 24px rgba(26, 34, 16, 0.18)` | Dropdowns, popovers |
| shadow/xl | `0 16px 40px rgba(26, 34, 16, 0.24)` | Modals |
| shadow/glow-firefly | `0 4px 20px rgba(168, 216, 50, 0.40)` | Primary CTA hover glow |
| shadow/glow-saffron | `0 4px 20px rgba(245, 166, 35, 0.35)` | Accent CTA hover glow |
| focus-ring | `0 0 0 3px rgba(168, 216, 50, 0.35)` | Focus state — an outer ring, not a shadow |

### Rules

- Cards at rest: flat, 1px border. Hover: shadow/md + 2px lift.
- Primary buttons on hover: add shadow/glow-firefly. Don't stack with other shadows.
- Nav: no shadow. Use backdrop-blur for elevation.
- Modals: shadow/xl over a dim overlay (`rgba(26, 34, 16, 0.60)`).
- Never put shadows on static decorative elements. Elevation is for hover and focus only.

---

## 8. Motion

### Duration

| Token | Value | Use |
|---|---|---|
| duration/instant | 0ms | State swap with no animation |
| duration/fast | 150ms | Small interactive feedback (press, toggle) |
| duration/normal | 250ms | Default hover, card lift, focus ring |
| duration/slow | 400ms | Dropdown open, accordion expand |
| duration/slower | 600ms | Modal enter, section reveal |
| duration/crawl | 1200ms+ | Marquee tickers, ambient loops |

### Easing

| Token | Value | Use |
|---|---|---|
| easing/linear | `linear` | Marquee tickers, continuous loops |
| easing/ease-out | `cubic-bezier(0, 0, 0.2, 1)` | Default enter, appear |
| easing/ease-in | `cubic-bezier(0.4, 0, 1, 1)` | Exit, disappear |
| easing/ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | Back-and-forth |
| easing/spring-gentle | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Subtle overshoot on confirm |

### Motion principles

- Unbothered speed. Never frantic. Never bouncy.
- Marquees and tickers: smooth, slow enough to read, fast enough to not feel stuck.
- No desperate bouncing CTAs. No jittery loops. No over-animated hero carousels.
- Functional product interactions should generally favor instant, fast, or normal motion. Slower motion is reserved exclusively for brand reveals, modals, immersive transitions, or campaign-led moments.
- Motion is a pacing device, not a decoration.

---

## 9. Components

### Buttons

| Variant | Style |
|---|---|
| Primary | interactive/primary fill, text/on-primary, radius/md, weight 700 |
| Secondary | interactive/secondary fill, text/on-secondary, radius/md, weight 700 |
| Outline | Transparent bg, border/strong 1.5px, text/primary, radius/md |
| Ghost | No bg, no border, text/primary, hover adds interactive/ghost-hover fill |
| Destructive | Transparent bg, interactive/destructive 1.5px border, interactive/destructive text |

**Sizes**

| Size | Height | Padding | Text |
|---|---|---|---|
| sm | 32px | pad/sm | body/sm |
| md | 40px | pad/md | body/md |
| lg | 48px | pad/lg | body/lg |

**Rules**

- Font: Nunito, weight 700. Never Luckiest Guy on buttons. Bubblegum Sans only on oversized campaign CTAs.
- Max one primary button per view section. Everything else is secondary, outline, or ghost.
- Hover: shift up 1px + apply corresponding glow shadow for primary/secondary. Never bounce.
- CTA copy follows access/discovery framing.

### Cards

- **Surface:** bg/surface
- **Border:** 1px border/default, radius/lg
- **Overflow:** hidden (die-cut sticker silhouette)
- **Image area** (preview cards): 200px mobile, 240px tablet+, Aurora bg or photography
- **Content padding:** 16px mobile, 20px tablet, 24px desktop
- **Hover:** lift 2px, border switches to border/strong, shadow/md applied
- **Transition:** 250ms ease-out on transform + shadow + border

### Inputs

- **Background:** bg/surface
- **Border:** 1px border/default, radius/md
- **Padding:** 10 × 14px
- **Font:** Nunito 15px
- **Placeholder:** text/tertiary
- **Focus:** border → border/focus, add 3px focus-ring
- **Error:** border → interactive/destructive, helper text in interactive/destructive
- **Label:** label/md Nunito uppercase, text/label colour, 6px spacing above input

### Chips & tags

- **Shape:** radius/full (pill)
- **Padding:** 4 × 12 (sm), 6 × 14 (md)
- **Font:** Nunito, weight 600, body/xs or body/sm
- **Default:** Neutral 100 bg (light) / bg/section (dark), text/secondary
- **Active:** interactive/primary bg, text/on-primary
- **Aurora variant** (merch / drops): Aurora soft fill bg, text/primary

### Badges (status)

Same geometry as chips. Semantic colour mapping:

| Status | Background | Text | Border |
|---|---|---|---|
| Success | Success/950 at 20% | Success/400 | Success/500 |
| Warning | Warning/950 at 20% | Warning/300 | Warning/600 |
| Error | Error/950 at 20% | Error/300 | Error/500 |
| Info | Info/950 at 20% | Info/300 | Info/500 |
| Neutral | bg/section | text/tertiary | border/default |

### Lists

- Stacked rows, 1px border/subtle dividers between items
- Row padding: 12 × 16px
- Flex space-between, hover: interactive/ghost-hover bg
- First / last rows: no divider

### Navigation

- Sticky top, 64px height (mobile 56px)
- Background: bg/page with `backdrop-filter: blur(12px)`
- 1px bottom border: border/subtle
- Logo left · links centre (desktop) / hamburger drawer (mobile) · action slot right
- Link font: Nunito 14px, weight 600
- Link hover: interactive/ghost-hover fill, radius/md
- Active link: text/label colour

### Marquee / ticker

Brand-specific primitive.

- **Font:** Luckiest Guy or Bubblegum Sans per hierarchy
- **Duration:** 20–30s linear loop per full cycle
- **Separator:** solid circle (4px, text/label)
- **Content:** chapter signals, tagline rotations, routing cues. Never promo spam.

### Focus state (all focusable elements)

- 3px outer ring using focus-ring token
- Offset: 2px from element edge
- Never use default browser outlines

---

## 10. Logo system (compressed)

**Variants:** Full-colour master · Black-only · White-only · Mascot-only · Horizontal · Avatar · Text-only.

### Use matrix

| Variant | Where |
|---|---|
| Full-colour master | Hero, primary identity |
| Black-only | Kraft stamp, 1-colour print |
| White-only | Dark substrates / dark UI blocks only |
| Mascot-only | Avatars, profile, compact icons |
| Horizontal | Narrow formats (nav bars, awnings) |
| Avatar | Favicons, social profiles |
| Text-only | App headers, web headers where mascot clutters |

**Fixed mascot anchors** (never change): deadpan eyes + subtle smirk · S-curve torso · solid black pearl nose + white crescent · sturdy blocky legs · premium aloof attitude.

**Approved mascot adaptations:** Cyberpunk visor · woven straw hat · retro aviator sunglasses · anime-inspired generalised tropes.

**Never:** stretch or distort · invert the face · hollow negative-space cup stencil · plush-toy proportions · remove the pearl nose or white highlight · literal boba cups, straws, splashes in core logo.

---

## 11. Imagery

**Tier 1** — Premium brand-facing. Studio quality, polished. Hero web, launch campaigns, key social, premium menu. This is the identity expression.

**Tier 2** — Raw / BTS. Quick-turn, flexible, reactive social support.

**Framing principle:** Products read as streetwear artefacts, not combo meals. Generous whitespace (or darkspace). Clean sectioning.

**Imagery Governance:** Product imagery in UI, web, and webapp surfaces must strictly inherit the relevant truth mode and usage rules from the locked BOBA BEAR: PHOTOGRAPHY & VIDEOGRAPHY RULES and BOBA BEAR: WEBSITE / LANDING PAGE PLAYBOOK. Campaign/editorial imagery must not replace clarity where the user needs product understanding.

**Never:** generic restaurant UI · gradient overload · cheap neon cyber-noise · fake-luxury minimalism that strips warmth.

---

## 12. Voice for on-surface copy

Copy is a design decision. Every button, loader, and error message runs through this filter.

**Voice:** Visionary, subtle, street-smart. Brevity of a fashion label. Deadpan where appropriate.

CTAs frame access or discovery, never transaction.

| Approved | Prohibited |
|---|---|
| Access the Drop | Order Now |
| View Current Drop | Buy Now |
| Ping on WhatsApp | Add to Cart |
| Access via Zomato | Click Here |
| Securing the Drop… | Loading… |

**Site-wide prohibited language:** best food in town · delicious · tasty · yummy · startup clichés (revolutionising boba) · loud urgency (HURRY!) · cloud kitchen · restaurant.

Never over-explain. Let the design speak.

---

## 13. Do's & don'ts

### Do
- Use Firefly Green only for primary interactive elements — CTAs, active states, focus rings
- Use Saffron Gold as secondary accent and the "BOBA BEAR" wordmark colour
- Maintain the 4px spacing grid across every padding, margin, and gap
- Keep buttons and inputs at radius/md (8px), cards at radius/lg (12px) — don't mix
- Apply one primary button per view section, maximum
- Test both dark and light modes for contrast
- Treat Aurora as the stage — the mascot and logo are always the performer
- Run copy through the access/discovery filter before shipping

### Don't
- Use pure black (`#000000`) or pure white (`#FFFFFF`) for text — always use palette values for typography. (Pure white is permitted selectively only as a defined surface token, e.g., light-mode bg/surface-raised).
- Place the logo on Aurora gradients, cluttered photography, or low-contrast surfaces
- Use Luckiest Guy on functional UI (menus, buttons, form labels, body)
- Swap Bubblegum Sans and Nunito roles — headings are Bubblegum, body is Nunito
- Stack more than two font families or two weights per family on one view
- Add decorative gradients, illustrations, or clipart — the mascot is the only illustrative element
- Use shadows on static elements — reserve elevation for hover and focus
- Print full-colour gradients on physical packaging (1-colour stamp rule)
- Use retired taglines (Stay Dreaming, Taste the Drop) or prohibited CTA language

---

## Quick reference

| | |
|---|---|
| **Core colours** | Firefly Green `#A8D832` · Saffron Gold `#F5A623` · Bear Brown `#7B4A2D` · Boba Cream `#FAF3E2` · Night Forest `#1A2210` |
| **Fonts** | Luckiest Guy (display) · Bubblegum Sans (headings) · Nunito (body + UI) · JetBrains Mono (code) |
| **Grid** | 4px base · max width 1280 · mobile gutter 24, desktop gutter 48 |
| **Radius anchors** | 8px buttons / inputs · 12px cards · 9999 pills |
| **Breakpoints** | Desktop ≥1024 · Tablet 768–1023 · Mobile <768 |
| **Governing rule** | Aurora is the stage. The bear is the performer. Brand carries delight. UI carries clarity. |

When a design decision isn't covered here, it isn't a design-system question — it's a brand-strategy or platform-playbook question, and lives elsewhere.
