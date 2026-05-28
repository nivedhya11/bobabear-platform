# Menu Image Mapping

Run `npm run audit:menu-images` at any time to see missing images, unused files, stale keys, and suspicious mappings.

Items without a photo render as a coloured **Aurora fallback card** — no code change needed when a new photo is added. Drop the file at `public/assets/menu/<filename>` and the next build picks it up automatically.

---

## Confirmed mappings needing filename cleanup

These images exist in `public/assets/menu/` and are correctly shown on the site, but the filename still reflects an older product name. The files should be renamed when convenient so the filename matches the current menu item name.

| Menu item | Current filename | Preferred filename |
|---|---|---|
| Electric Blue Lime Refresher | `Electric_Blue_Iced_Tea.jpeg` | `Electric_Blue_Lime_Refresher.jpeg` |
| Magic Galaxy Refresher Drink | `Magic_Galaxy_Iced_Tea.jpeg` | `Magic_Galaxy_Refresher_Drink.jpeg` |

**To rename**: copy the file to the new name, update `lib/menuImages.ts`, rebuild.

---

## Images needing new product photography

All 74 mapped items currently have photos. Run `npm run audit:menu-images` to recheck if this changes after a menu update.

---

## Veg/Paneer combo image choices

Menu cards labelled `(Veg/Paneer)` use a single image. The current files in `public/assets/menu/` use the Veg photo as default. To swap to a Paneer photo, replace the file at the listed path with the Paneer shot:

| Menu item | File in public/assets/menu/ |
|---|---|
| Dynamite Red Burger | `Dynamite_Red_Burger.jpg` |
| Gangnam Glaze Burger | `Gangnam_Glaze_Burger.jpg` |
| Seoul Masala Burger | `Seoul_Masala_Burger.jpg` |
| Dynamite Red Wrap | `Dynamite_Red_Wrap.jpg` |
| Gangnam Glaze Wrap | `Gangnam_Glaze_Wrap.jpg` |
| Seoul Masala Wrap | `Seoul_Masala_Wrap.jpg` |

---

## Naming convention

1. Match the filename **exactly** as listed in `lib/menuImages.ts` — including case, underscores, and extension (`.jpeg` vs `.jpg`).
2. Both `.jpeg` and `.jpg` are valid; pick the one the entry uses.
3. Compress to ≤ 300 KB where possible. Cards display at ≤ 400 px wide.
4. Aspect ratios by card type:
   - **Drink** cards: `aspect-[3/4]` (portrait) — shoot tall.
   - **Plate / K-street** cards: `aspect-[4/3]` (landscape) — shoot wide.
   - **Sweet** cards: square crop on mobile.

## How to add a new image

```bash
# 1. Drop the photo into the correct directory
cp /path/to/your/photo.jpeg public/assets/menu/Your_Item_Name.jpeg

# 2. Ensure lib/menuImages.ts has an entry for it

# 3. Verify audit is clean
npm run audit:menu-images

# 4. Build and confirm
npm run build
ls out/assets/menu/Your_Item_Name.jpeg
```
