/**
 * Menu presentation domain types (IMP-013).
 */

import type { MenuLifecycleStatus } from "../../../shared/catalog/menu";
import type { WorkforcePrincipal } from "../../access-control/principal";

export type Menu = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  lifecycleStatus: MenuLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type MenuSection = Readonly<{
  id: string;
  brandId: string;
  menuId: string;
  parentSectionId: string | null;
  code: string;
  name: string;
  description: string | null;
  position: number;
  lifecycleStatus: MenuLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type MenuEntry = Readonly<{
  id: string;
  brandId: string;
  menuId: string;
  sectionId: string;
  productId: string;
  displayName: string | null;
  displayDescription: string | null;
  imagePath: string | null;
  position: number;
  lifecycleStatus: MenuLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type MenuGraph = Readonly<{
  menu: Menu;
  sections: readonly MenuSection[];
  entries: readonly MenuEntry[];
}>;

export type CreateMenuInput = Readonly<{
  actor: WorkforcePrincipal;
  brandId: string;
  code: string;
  name: string;
  id?: string;
}>;

export type CreateMenuSectionInput = Readonly<{
  actor: WorkforcePrincipal;
  brandId: string;
  menuId: string;
  parentSectionId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  position?: number;
  id?: string;
}>;

export type CreateMenuEntryInput = Readonly<{
  actor: WorkforcePrincipal;
  brandId: string;
  menuId: string;
  sectionId: string;
  productId: string;
  displayName?: string | null;
  displayDescription?: string | null;
  imagePath?: string | null;
  position?: number;
  id?: string;
}>;

export type MenuLifecycleInput = Readonly<{
  actor: WorkforcePrincipal;
  menuId: string;
}>;

export type MenuSectionLifecycleInput = Readonly<{
  actor: WorkforcePrincipal;
  sectionId: string;
}>;

export type MenuEntryLifecycleInput = Readonly<{
  actor: WorkforcePrincipal;
  entryId: string;
}>;

export type MenuReadInput = Readonly<{
  actor: WorkforcePrincipal;
  menuId: string;
}>;
