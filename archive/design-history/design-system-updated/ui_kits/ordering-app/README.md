# Ordering app · UI kit

Mobile ordering app for Boba Bear, wrapped in an iOS 26 frame. **First-principles recreation** — no real product code or Figma was supplied; rerun when real source is available.

## Components
| File | Purpose |
|---|---|
| `index.html` | Click-through demo with tab-style screen switcher |
| `App.jsx` | Top-level state + screen routing |
| `screens/Menu.jsx` | Browse — category chips, food cards (4:3) |
| `screens/ItemDetail.jsx` | Item page — image, modifiers, add-to-bar |
| `screens/Cart.jsx` | Cart sheet — line items, total, secure CTA |
| `screens/Tracking.jsx` | Post-order — status pearls + ETA |
| `screens/Components.jsx` | Shared bits (TopBar, BottomTabBar, CartFab) |
| `styles.css` | App-specific styles consuming design tokens |
| `ios-frame.jsx` | iOS device bezel (starter component) |

## Surfaces represented
- Menu (home)
- Item detail
- Cart
- Order tracking

## Notes on brand discipline
- **No bottom-of-page sticky "Order Now" bar.** The brand rule: *the bear doesn't chase you*. Cart is accessed via a top-right indicator chip.
- **CTA copy** uses access/discovery framing throughout: *Add to the bar · Securing the Drop · Ping the bar*.
- **Dark mode default** — Night Forest base.
