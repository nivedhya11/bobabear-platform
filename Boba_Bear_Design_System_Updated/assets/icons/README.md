# Iconography

The Boba Bear system uses **Lucide** (https://lucide.dev) — MIT-licensed, ~1000 icons, 2px stroke.

## Default: CDN

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="shopping-bag" stroke-width="2"></i>
<script>lucide.createIcons();</script>
```

## Offline / production: sprite

`lucide.svg` in this folder is a hand-picked subset sprite for offline builds. Use with:

```html
<svg width="20" height="20"><use href="assets/icons/lucide.svg#shopping-bag"/></svg>
```

## Rules
- **Sizes:** 16 / 20 / 24 only.
- **Stroke:** 2 px. Never mix weights.
- **Color:** `currentColor`. Always inherit.
- **Pair with label or `aria-label`.** Icon-only buttons must be labeled for screen readers.

## What's in the subset sprite
shopping-bag · menu · x · search · map-pin · clock · instagram · arrow-right · arrow-up-right · plus · minus · heart · user · chevron-down · chevron-right · star · check · alert-triangle · info · sparkles

## ⚠ Substitution note
The sprite in this repo is a small placeholder built locally. For production, generate a full Lucide sprite via `lucide build-sprite` or pull from CDN.
