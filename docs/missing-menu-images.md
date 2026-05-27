# Missing Menu Images

Run `npm run audit:menu-images` at any time to see which images are still missing.

Menu images that have no file in `public/assets/menu/` render as a coloured **Aurora fallback card** (the item name centred over a brand-palette background). No code change is needed when a new photo is added — drop the file in the right place with the right name and the next build picks it up.

---

## Images needing new product photography (28)

These items have no matching source photo anywhere in the repo. A real product shot is required for each.

Place the finished photo at `public/assets/menu/<filename>` using the exact filename listed below.

### The Bar

| Menu item | Expected filename |
|---|---|
| Pink Velvet Cotton Candy Boba | `Pink_Velvet_Cotton_Candy_Boba.jpeg` |
| Mango Matcha Boba | `Mango_Matcha_Boba.jpeg` |
| Strawberry Matcha Boba | `Strawberry_Matcha_Boba.jpeg` |
| K-Cinema Popcorn Coffee Boba | `K-Cinema_Popcorn_Coffee_Boba.jpeg` |
| Filter Roast Cold Coffee Boba | `Filter_Roast_Cold_Coffee_Boba.jpeg` |
| Green Apple Black Iced Tea | `Green_Apple_Black_Iced_Tea.jpeg` |
| Strawberry Black Iced Tea | `Strawberry_Black_Iced_Tea.jpeg` |
| Seoul Peach Black Iced Tea | `Seoul_Peach_Black_Iced_Tea.jpeg` |
| Seoul Mango Peach Iced Tea | `Seoul_Mango_Peach_Iced_Tea.jpeg` |
| Lychee Iced Tea | `Lychee_Iced_Tea.jpeg` |
| Watermelon Iced Tea | `Watermelon_Iced_Tea.jpeg` |
| Hibiscus Ginger Mint Iced Tea | `Hibiscus_Ginger_Mint_Iced_Tea.jpeg` |
| Lime Black Tea Boba | `Lime_Black_Tea_Boba.jpeg` |
| Electric Blue Lime Refresher | `Electric_Blue_Lime_Refresher.jpeg` |
| Magic Galaxy Refresher Drink | `Magic_Galaxy_Refresher_Drink.jpeg` |

### Burgers & Wraps

| Menu item | Expected filename |
|---|---|
| Pink Velvet Cheesy Burger (Veg/Paneer) | `Pink_Velvet_Cheesy_Burger.jpg` |
| Classic Veg Burger | `Classic_Veg_Burger.jpeg` |
| Gangnam Big Stack Burger | `Gangnam_Big_Stack_Burger.jpeg` |
| Pink Velvet Wrap (Veg/Paneer) | `Pink_Velvet_Wrap.jpg` |

### Fries & Bites

| Menu item | Expected filename |
|---|---|
| Pink Velvet Fries | `Pink_Velvet_Fries.jpg` |
| Cheesy Potato Bites | `Cheesy_Potato_Bites.jpg` |

### Meals & Combos

| Menu item | Expected filename |
|---|---|
| Classic Veg Burger Meal | `Classic_Veg_Burger_Meal.jpeg` |
| Veg Burger Meal | `Veg_Burger_Meal.jpeg` |
| Veg Wrap Meal | `Veg_Wrap_Meal.jpeg` |
| Paneer Wrap Meal | `Paneer_Wrap_Meal.jpeg` |
| Veggie Rice Bowl | `Veggie_Rice_Bowl.jpeg` |
| Paneer Rice Bowl | `Paneer_Rice_Bowl.jpeg` |

### The Sweet

| Menu item | Expected filename |
|---|---|
| Choco Cloud Marshmallow Sticks | `Choco_Cloud_Marshmallow_Sticks.jpg` |

---

## Image needing manual confirmation (1)

`Paneer_Burger_Meal.jpeg` — the repo contains `Boba_Bear_Images/Premium_Paneer_Meal.jpeg`, which *may* correspond to this menu item, but the names differ enough to be ambiguous. **Do not copy blindly.**

Steps to resolve:
1. Check whether `Premium_Paneer_Meal.jpeg` is a photo of the "Paneer Burger Meal" combo.
2. If yes: `cp Boba_Bear_Images/Premium_Paneer_Meal.jpeg public/assets/menu/Paneer_Burger_Meal.jpeg`
3. If it's a different product: shoot or source the correct photo and place it at `public/assets/menu/Paneer_Burger_Meal.jpeg`.

---

## Veg/Paneer combo image choices (6)

These menu cards cover both Veg and Paneer variants under a single card (`"Dynamite Red Burger (Veg/Paneer)"`). `lib/menuImages.ts` maps each to one image path. The **Veg** variant photo was used as the default. Swap to the Paneer photo at any time by replacing the file:

| Menu item | Current file | Veg source | Paneer alternative |
|---|---|---|---|
| Dynamite Red Burger | `public/assets/menu/Dynamite_Red_Burger.jpg` | `Dynamite_Red_Veg_Burger.jpeg` | `Dynamite_Red_Paneer_Burger.jpeg` |
| Gangnam Glaze Burger | `public/assets/menu/Gangnam_Glaze_Burger.jpg` | `Gangnam_Glaze_Veg_Burger.jpeg` | `Gangnam_Glaze_Paneer_Burger.jpeg` |
| Seoul Masala Burger | `public/assets/menu/Seoul_Masala_Burger.jpg` | `Seoul_Masala_Veg_Burger.jpeg` | `Seoul_Masala_Paneer_Burger.jpeg` |
| Dynamite Red Wrap | `public/assets/menu/Dynamite_Red_Wrap.jpg` | `Dynamite_Red_Veg_Wrap.jpeg` | `Dynamite_Red_Paneer_Wrap.jpeg` |
| Gangnam Glaze Wrap | `public/assets/menu/Gangnam_Glaze_Wrap.jpg` | `Gangnam_Glaze_Veg_Wrap.jpeg` | `Gangnam_Glaze_Paneer_Wrap.jpeg` |
| Seoul Masala Wrap | `public/assets/menu/Seoul_Masala_Wrap.jpg` | `Seoul_Masala_Veg_Wrap.jpeg` | `Seoul_Masala_Paneer_Wrap.jpeg` |

Source photos for all six are in `Boba_Bear_Images/`.

---

## Naming convention for future uploads

1. Match the filename **exactly** as listed in `lib/menuImages.ts` — including case, underscores, and extension (`.jpeg` vs `.jpg`).
2. Extension must match what `lib/menuImages.ts` expects. `.jpeg` and `.jpg` are both valid JPEG containers; pick the one the entry uses.
3. Reasonable file size: compress to ≤ 300 KB where possible. Cards display images at ≤ 400 px wide; high-DPI screens benefit from 2× resolution.
4. Aspect ratios by card type:
   - **Drink** cards render `aspect-[3/4]` (portrait) — shoot tall.
   - **Plate / K-street** cards render `aspect-[4/3]` (landscape) — shoot wide.
   - **Sweet** cards use a square crop on mobile.
5. Place the file in `public/assets/menu/`. The next `npm run build` will include it in the static export automatically.

---

## How to add a new image

```bash
# 1. Drop the photo into the correct directory
cp /path/to/your/photo.jpeg public/assets/menu/Your_Item_Name.jpeg

# 2. Make sure lib/menuImages.ts has an entry for it
#    (open the file and add the mapping if it isn't already there)

# 3. Verify the audit passes without warnings
npm run audit:menu-images

# 4. Build and confirm the image appears in the static export
npm run build
ls out/assets/menu/Your_Item_Name.jpeg
```

If the menu item is new (not yet in `data/menu.json` or `lib/menuImages.ts`), add it there first, then follow the steps above.
