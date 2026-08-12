export type MenuCardTag =
  | "signature"
  | "new"
  | "bestseller"
  | "limited"
  | "staff";

export interface MenuItem {
  name: string;
  description: string;
  price: number;
  tier: string;
  addons: string[];
  tags: MenuCardTag[];
}

export interface MenuSubcategory {
  name: string;
  items: MenuItem[];
}

export interface MenuCategory {
  name: string;
  slug: string;
  subcategories: MenuSubcategory[];
}

export interface MenuData {
  categories: MenuCategory[];
}
