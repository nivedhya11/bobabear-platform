/**
 * Menu presentation domain types (IMP-013 / IMP-036F F3A).
 */

import type {
  MenuLifecycleStatus,
  MenuVersionLifecycleStatus,
} from "../../../shared/catalog/menu";
import type { WorkforcePrincipal } from "../../access-control/principal";

export type Menu = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  lifecycleStatus: MenuLifecycleStatus;
  revision: bigint;
  effectiveMenuVersionId: string | null;
  draftMenuVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export type MenuVersion = Readonly<{
  id: string;
  menuId: string;
  brandId: string;
  revision: bigint;
  lifecycleStatus: MenuVersionLifecycleStatus;
  createdAt: Date;
  createdBy: string | null;
  effectiveAt: Date | null;
  supersededAt: Date | null;
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
  /** Which version graph was loaded for admin reads, when versioned. */
  source: "draft" | "effective" | "legacy";
  menuVersionId: string | null;
}>;

export type ExpectedMenuRevisionInput = bigint | number | string;

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
  expectedMenuRevision: ExpectedMenuRevisionInput;
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
  expectedMenuRevision: ExpectedMenuRevisionInput;
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
  expectedMenuRevision: ExpectedMenuRevisionInput;
}>;

export type MenuEntryLifecycleInput = Readonly<{
  actor: WorkforcePrincipal;
  entryId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
}>;

export type MenuReadInput = Readonly<{
  actor: WorkforcePrincipal;
  menuId: string;
}>;

export type UpdateMenuSectionInput = Readonly<{
  actor: WorkforcePrincipal;
  sectionId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
  name?: string;
  description?: string | null;
  parentSectionId?: string | null;
}>;

export type ReorderMenuSectionsInput = Readonly<{
  actor: WorkforcePrincipal;
  menuId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
  /** null = reorder root sections; otherwise direct children of this parent. */
  parentSectionId: string | null;
  orderedSectionIds: readonly string[];
}>;

export type ReorderMenuEntriesInput = Readonly<{
  actor: WorkforcePrincipal;
  sectionId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
  orderedEntryIds: readonly string[];
}>;

export type MoveMenuEntryInput = Readonly<{
  actor: WorkforcePrincipal;
  entryId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
  targetSectionId: string;
  position?: number;
}>;

export type UpdateMenuEntryDisplayInput = Readonly<{
  actor: WorkforcePrincipal;
  entryId: string;
  expectedMenuRevision: ExpectedMenuRevisionInput;
  displayName?: string | null;
  displayDescription?: string | null;
  imagePath?: string | null;
}>;
