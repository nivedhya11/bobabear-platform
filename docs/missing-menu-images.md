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

## Images needing new product photography (27)

These items have no matching photo in `public/assets/menu/`. An Aurora fallback card is shown.

Place the finished photo at `public/assets/menu/<filename>` using the exact filename listed.

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

## Needs new product photography

`Paneer_Burger_Meal.jpeg` — no source file has been confirmed for this item. Shoot or source a photo of the "Paneer Burger Meal" combo and drop it at `public/assets/menu/Paneer_Burger_Meal.jpeg`.

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
