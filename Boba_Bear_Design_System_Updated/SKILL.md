---
name: boba-bear-design
description: Use this skill to generate well-branded interfaces and assets for Boba Bear — the premium Indo-Korean fusion food + boba tea brand for Gen Z ("For the Unbothered."). Covers production work and throwaway prototypes/mocks. Contains the full design system: colors, type, fonts, spacing, motion, components, brand voice, mascot rules, and ready-to-fork UI kits.
user-invocable: true
---

# Boba Bear · Design skill

Read `README.md` first — it is the source of truth and contains the full brand strategy, content fundamentals, visual foundations, iconography, and an index to every other file.

## What's in here

- `README.md` — brand context · content fundamentals · visual foundations · iconography · index
- `colors_and_type.css` — every design token as a CSS custom property (drop-in)
- `fonts/` — self-hosted brand TTFs (Luckiest Guy, Bubblegum Sans); license + reference
- `assets/logo/` — wordmark, mascot, horizontal lockup (SVG)
- `assets/icons/` — Lucide icon set reference (CDN-first, sprite fallback)
- `preview/` — design specimens for color · type · spacing · components · brand
- `ui_kits/marketing-site/` — full marketing site (React + JSX) — Nav, Hero, MenuStrip, DropFeature, ArtistGrid, Footer
- `ui_kits/ordering-app/` — mobile ordering app (React + iOS frame) — Menu, ItemDetail, Cart, Tracking

## How to use

**If creating visual artifacts** (slides, mocks, throwaway prototypes, social posts, packaging mocks):
1. Copy `colors_and_type.css` into your output folder, link it from your HTML, and you have every token.
2. Copy whatever assets you need from `assets/` into your output. Never reference cross-project paths.
3. Use the `preview/` cards as visual reference for what each spec looks like in practice.
4. For full surfaces, fork the relevant UI kit's index.html and trim down.
5. Follow the *content fundamentals* in README religiously — voice is half the brand.

**If working on production code:**
- The CSS token file is production-ready. Self-host the Google Fonts (Nunito, JetBrains Mono) for offline.
- The UI kits are *visual* recreations — not production components. Re-implement against your real component library, but use the tokens and behavior rules verbatim.

## Cardinal rules — never break

1. **Aurora is the stage. The bear is the performer.** Aurora pastels never replace Firefly Green / Saffron Gold as the identity anchor.
2. **Luckiest Guy is for hero peaks only.** Never on buttons, menus, labels, body. One peak per screen.
3. **Bubblegum Sans for headings. Nunito for everything you tap, read, or act on.** Don't swap roles.
4. **4 px spacing grid.** The only half-step allowed is `2px` for hairline insets.
5. **Buttons at 8 px radius. Cards at 12 px.** Don't mix the scales.
6. **CTAs frame access or discovery, never transaction.** Never *Order Now*, *Buy Now*, *Add to Cart*.
7. **No emoji.** No exclamation marks. No ALL CAPS in body.
8. **Cards: flat at rest. Elevation activates on hover and focus only.**
9. **No bottom-of-page sticky CTAs.** The bear doesn't chase you.
10. **No pure `#000000` or `#FFFFFF` for text.** Always palette values.

## If invoked without guidance

Ask:
- What surface? (marketing page · ordering app · packaging mock · social post · deck · merch print mock)
- One screen or a flow?
- Dark mode (default) or light?
- Should the bear appear?
- Do you have product imagery, or should we use Aurora-stage placeholders?

Then build, following the rules above, using the tokens in `colors_and_type.css`.
