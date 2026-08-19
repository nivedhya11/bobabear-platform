/**
 * Customer Menu read-projection DTO (IMP-028B / D-368).
 *
 * Display/projection data only — not payable or orderability authority.
 */

export type CustomerMenuAvailability = "available" | "sold_out" | "temporarily_unavailable";

export type CustomerMenuSection = Readonly<{
  id: string;
  parentSectionId: string | null;
  name: string;
  position: number;
}>;

export type CustomerMenuModifierOption = Readonly<{
  modifierOptionId: string;
  modifierGroupOptionId: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  position: number;
  displayPriceDeltaPaise: number;
  currency: "INR";
}>;

export type CustomerMenuModifierGroup = Readonly<{
  modifierGroupId: string;
  variantModifierGroupId: string;
  name: string;
  required: boolean;
  minTotalQuantity: number;
  maxTotalQuantity: number;
  position: number;
  options: readonly CustomerMenuModifierOption[];
}>;

export type CustomerMenuItem = Readonly<{
  productId: string;
  variantId: string;
  sectionId: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  displayPricePaise: number;
  currency: "INR";
  availability?: CustomerMenuAvailability;
  modifierGroups?: readonly CustomerMenuModifierGroup[];
}>;

export type CustomerMenuProjection = Readonly<{
  brandId: string;
  menuId: string;
  name: string;
  sections: readonly CustomerMenuSection[];
  items: readonly CustomerMenuItem[];
}>;
