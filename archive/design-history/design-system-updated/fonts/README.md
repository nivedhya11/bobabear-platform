# Fonts

All four font families used by Boba Bear are free Google Fonts. The design system imports them via Google Fonts CDN in `colors_and_type.css`:

| Family | Role | Google Fonts URL |
|---|---|---|
| **Luckiest Guy** | Display only (hero, campaign titles) | https://fonts.google.com/specimen/Luckiest+Guy |
| **Bubblegum Sans** | Headings, section titles | https://fonts.google.com/specimen/Bubblegum+Sans |
| **Nunito** | Body, UI, buttons, labels | https://fonts.google.com/specimen/Nunito |
| **JetBrains Mono** | Code, SKUs | https://fonts.google.com/specimen/JetBrains+Mono |

## For production / offline

Download `.woff2` files from each Google Fonts page and drop them in this folder, then swap the `@import` in `colors_and_type.css` for `@font-face` rules pointing at the local files. We didn't ship the .woff2s here because the system is configured to pull from CDN by default and the licenses (SIL OFL) permit either approach.

## ⚠ Substitutions

**None for Luckiest Guy or Bubblegum Sans** — brand TTFs uploaded and self-hosted from this folder.

**Nunito + JetBrains Mono** are loaded from Google Fonts CDN. They are the canonical brand families on Google Fonts (no substitution), but if you want fully offline / production builds, download the `.woff2` files and add matching `@font-face` rules in `colors_and_type.css`.
