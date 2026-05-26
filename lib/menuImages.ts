/**
 * menuImages — item name → public image path
 *
 * Decoupled from menu.json so the data file stays clean.
 * Any item not listed here falls back to the Aurora watermark in MenuCard.
 */
const M = "/assets/menu/";

export const MENU_IMAGES: Record<string, string> = {
  // ── The Bar · Signature Boba ───────────────────────────────────────────────
  "Gangnam Style Iced Coffee Boba":        M + "Gangnam_Style_Iced_Coffee_Boba.jpeg",
  "Purple Rain Taro Boba":                 M + "Purple_Rain_Taro_Boba.jpg",
  "Zen Master Matcha Boba":                M + "Zen_Master_Matcha_Boba.jpeg",
  "Hong Kong Milk Tea Boba":               M + "Hong_Kong_Milk_Tea_Boba.jpeg",
  "Bangkok Thai Tea Boba":                 M + "Bangkok_Thai_Tea_Boba.jpeg",
  "Dirty Cheesecake Boba":                 M + "Dirty_Cheesecake_Boba.jpeg",
  "Pink Velvet Cotton Candy Boba":         M + "Pink_Velvet_Cotton_Candy_Boba.jpeg",

  // ── The Bar · Matcha Studio ────────────────────────────────────────────────
  "Purple Rain Layered Matcha":            M + "Purple_Rain_Layered_Matcha.jpeg",
  "Wild Berry Dirty Matcha":               M + "Wild_Berry_Dirty_Matcha.jpeg",
  "Mango Matcha Boba":                     M + "Mango_Matcha_Boba.jpeg",
  "Strawberry Matcha Boba":                M + "Strawberry_Matcha_Boba.jpeg",

  // ── The Bar · Iced Coffees ─────────────────────────────────────────────────
  "Hazelnut Iced Coffee Boba":             M + "Hazelnut_Iced_Coffee_Boba.jpeg",
  "Butterscotch Caramel Iced Coffee Boba": M + "Butterscotch_Caramel_Iced_Coffee_Boba.jpeg",
  "Seoul Tiramisu Iced Coffee Boba":       M + "Seoul_Tiramisu_Iced_Coffee_Boba.jpeg",
  "K-Cinema Popcorn Coffee Boba":          M + "K-Cinema_Popcorn_Coffee_Boba.jpeg",
  "Filter Roast Cold Coffee Boba":         M + "Filter_Roast_Cold_Coffee_Boba.jpeg",

  // ── The Bar · Iced Teas ────────────────────────────────────────────────────
  "Electric Blue Iced Tea":                M + "Electric_Blue_Iced_Tea.jpeg",
  "Kala Khatta Iced Tea":                  M + "Kala_Khatta_Iced_Tea.jpeg",
  "Magic Galaxy Iced Tea":                 M + "Magic_Galaxy_Iced_Tea.jpeg",
  "Green Apple Black Iced Tea":            M + "Green_Apple_Black_Iced_Tea.jpeg",
  "Strawberry Black Iced Tea":             M + "Strawberry_Black_Iced_Tea.jpeg",
  "Seoul Peach Black Iced Tea":            M + "Seoul_Peach_Black_Iced_Tea.jpeg",
  "Seoul Mango Peach Iced Tea":            M + "Seoul_Mango_Peach_Iced_Tea.jpeg",
  "Lychee Iced Tea":                       M + "Lychee_Iced_Tea.jpeg",
  "Watermelon Iced Tea":                   M + "Watermelon_Iced_Tea.jpeg",
  "Hibiscus Ginger Mint Iced Tea":         M + "Hibiscus_Ginger_Mint_Iced_Tea.jpeg",
  "Lime Black Tea Boba":                   M + "Lime_Black_Tea_Boba.jpeg",

  // ── The Bar · Refreshers ───────────────────────────────────────────────────
  "Jiji Mint Mojito":                      M + "Jiji_Mint_Mojito.jpeg",
  "Electric Blue Lime Refresher":          M + "Electric_Blue_Lime_Refresher.jpeg",
  "Magic Galaxy Refresher Drink":          M + "Magic_Galaxy_Refresher_Drink.jpeg",

  // ── Ramyum ─────────────────────────────────────────────────────────────────
  "Viral Spicy Carbonara Ramyun Noodles":  M + "Viral_Spicy_Carbonara_Ramyun_Noodles.jpg",
  "Cheesy Ramyum":                         M + "Cheesy_Ramyum.jpeg",
  "Volcanic Fire Spicy Ramyun Noodles":    M + "Volcanic_Fire_Spicy_Ramyun_Noodles.jpg",
  "Tangy Kimchi Ramyun Noodles":           M + "Tangy_Kimchi_Ramyun_Noodles.jpg",

  // ── Momos ──────────────────────────────────────────────────────────────────
  "Steamed Veg Momos":                     M + "Steamed_Veg_Momos.jpg",
  "Steamed Paneer Momos":                  M + "Steamed_Paneer_Momos.jpg",
  "Fried Veg Momos":                       M + "Fried_Veg_Momos.jpg",
  "Fried Paneer Momos":                    M + "Fried_Paneer_Momos.jpg",
  "Dynamite Red Veg Momos":                M + "Dynamite_Red_Veg_Momos.jpeg",
  "Dynamite Red Paneer Momos":             M + "Dynamite_Red_Paneer_Momos.jpeg",
  "Gangnam Glaze Veg Momos":               M + "Gangnam_Glaze_Veg_Momos.jpeg",
  "Gangnam Glaze Paneer Momos":            M + "Gangnam_Glaze_Paneer_Momos.jpeg",
  "Seoul Masala Veg Momos":                M + "Seoul_Masala_Veg_Momos.jpg",
  "Seoul Masala Paneer Momos":             M + "Seoul_Masala_Paneer_Momos.jpeg",

  // ── Burger ─────────────────────────────────────────────────────────────────
  "Dynamite Red Burger (Veg/Paneer)":      M + "Dynamite_Red_Burger.jpg",
  "Gangnam Glaze Burger (Veg/Paneer)":     M + "Gangnam_Glaze_Burger.jpg",
  "Pink Velvet Cheesy Burger (Veg/Paneer)":M + "Pink_Velvet_Cheesy_Burger.jpg",
  "Seoul Masala Burger (Veg/Paneer)":      M + "Seoul_Masala_Burger.jpg",
  "Classic Veg Burger":                    M + "Classic_Veg_Burger.jpeg",
  "Gangnam Big Stack Burger":              M + "Gangnam_Big_Stack_Burger.jpeg",

  // ── Wraps ──────────────────────────────────────────────────────────────────
  "Dynamite Red Wrap (Veg/Paneer)":        M + "Dynamite_Red_Wrap.jpg",
  "Gangnam Glaze Wrap (Veg/Paneer)":       M + "Gangnam_Glaze_Wrap.jpg",
  "Pink Velvet Wrap (Veg/Paneer)":         M + "Pink_Velvet_Wrap.jpg",
  "Seoul Masala Wrap (Veg/Paneer)":        M + "Seoul_Masala_Wrap.jpg",

  // ── Fries ──────────────────────────────────────────────────────────────────
  "The OG Salted Fries":                   M + "The_OG_Salted_Fries.jpg",
  "Dynamite Red Street Fries":             M + "Dynamite_Red_Street_Fries.jpg",
  "Gangnam Glaze Loaded Fries":            M + "Gangnam_Glaze_Loaded_Fries.jpg",
  "Seoul Masala Fusion Fries":             M + "Seoul_Masala_Fusion_Fries.jpg",
  "Peri Peri Dynamite Fries":              M + "Peri_Peri_Dynamite_Fries.jpg",
  "Pink Velvet Fries":                     M + "Pink_Velvet_Fries.jpg",
  "Cheesy Potato Bites":                   M + "Cheesy_Potato_Bites.jpg",
  "Seoul Golden Hash Browns":              M + "Seoul_Golden_Hash_Browns.jpeg",

  // ── Meals & Combos ─────────────────────────────────────────────────────────
  "Classic Veg Burger Meal":               M + "Classic_Veg_Burger_Meal.jpeg",
  "Veg Burger Meal":                       M + "Veg_Burger_Meal.jpeg",
  "Paneer Burger Meal":                    M + "Paneer_Burger_Meal.jpeg",
  "Veg Wrap Meal":                         M + "Veg_Wrap_Meal.jpeg",
  "Paneer Wrap Meal":                      M + "Paneer_Wrap_Meal.jpeg",
  "Veggie Rice Bowl":                      M + "Veggie_Rice_Bowl.jpeg",
  "Paneer Rice Bowl":                      M + "Paneer_Rice_Bowl.jpeg",
  "Exam Survivor Combo":                   M + "Exam_Survivor_Combo.jpeg",

  // ── Corn Dogs & More ───────────────────────────────────────────────────────
  "Classic Corndog":                       M + "Classic_Corndog.jpeg",
  "Dynamite Corndog":                      M + "Dynamite_Corndog.jpeg",

  // ── The Sweet ──────────────────────────────────────────────────────────────
  "Boba Bear Signature Ice Cream Sundae":  M + "Boba_Bear_Signature_Ice_Cream_Sundae.jpeg",
  "Berry Popping Sundae":                  M + "Berry_Popping_Sundae.jpeg",
  "Nutella Oreo Crunch Ice Cream Sundae":  M + "Nutella_Oreo_Crunch_Ice_Cream_Sundae.jpeg",
  "Choco Cloud Marshmallow Sticks":        M + "Choco_Cloud_Marshmallow_Sticks.jpg",
};
