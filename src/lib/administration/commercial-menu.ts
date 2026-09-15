/**
 * Typed Admin client for Menu commercial authoring (IMP-036F F6B).
 */
import { adminRequest } from "./http";

export type MenuListItem = Readonly<{
  id: string;
  code: string;
  name: string;
  lifecycleStatus: string;
  revision: string;
  hasEffectiveVersion: boolean;
  hasDraftVersion: boolean;
}>;

export type MenuSection = Readonly<{
  id: string;
  parentSectionId: string | null;
  code: string;
  name: string;
  description: string | null;
  position: number;
  lifecycleStatus: string;
}>;

export type MenuEntry = Readonly<{
  id: string;
  sectionId: string;
  productId: string;
  displayName: string | null;
  displayDescription: string | null;
  imagePath: string | null;
  position: number;
  lifecycleStatus: string;
}>;

export type MenuDetail = Readonly<{
  menu: Readonly<{
    id: string;
    brandId: string;
    code: string;
    name: string;
    lifecycleStatus: string;
    revision: string;
    effectiveMenuVersionId: string | null;
    draftMenuVersionId: string | null;
  }>;
  effective: Readonly<{ versionId: string; sections: MenuSection[]; entries: MenuEntry[] }> | null;
  draft: Readonly<{ versionId: string; sections: MenuSection[]; entries: MenuEntry[] }> | null;
  draftDiffersFromEffective: boolean;
}>;

function brandMenus(brandId: string) {
  return `/api/admin/v1/brands/${brandId}/menus`;
}

export function listMenus(brandId: string) {
  return adminRequest<{ ok: true; menus: MenuListItem[] }>(brandMenus(brandId));
}

export function getMenu(brandId: string, menuId: string) {
  return adminRequest<{ ok: true } & MenuDetail>(`${brandMenus(brandId)}/${menuId}`);
}

export function createMenu(brandId: string, body: Readonly<{ code: string; name: string }>) {
  return adminRequest<{
    ok: true;
    menu: MenuDetail["menu"];
  }>(brandMenus(brandId), { method: "POST", body });
}

export function addMenuSection(
  brandId: string,
  menuId: string,
  body: Readonly<{
    expectedMenuRevision: string;
    code: string;
    name: string;
    description?: string;
    parentSectionId?: string | null;
    position?: number;
  }>,
) {
  return adminRequest<{ ok: true; section: MenuSection; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/sections`,
    { method: "POST", body },
  );
}

export function addMenuEntry(
  brandId: string,
  menuId: string,
  body: Readonly<{
    expectedMenuRevision: string;
    sectionId: string;
    productId: string;
    displayName?: string;
    displayDescription?: string;
    position?: number;
  }>,
) {
  return adminRequest<{ ok: true; entry: MenuEntry; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/entries`,
    { method: "POST", body },
  );
}

export function reorderMenuSections(
  brandId: string,
  menuId: string,
  body: Readonly<{
    expectedMenuRevision: string;
    orderedSectionIds: readonly string[];
    parentSectionId?: string | null;
  }>,
) {
  return adminRequest<{ ok: true; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/sections/reorder`,
    { method: "POST", body },
  );
}

export function reorderMenuEntries(
  brandId: string,
  menuId: string,
  sectionId: string,
  body: Readonly<{ expectedMenuRevision: string; orderedEntryIds: readonly string[] }>,
) {
  return adminRequest<{ ok: true; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/sections/${sectionId}/entries/reorder`,
    { method: "POST", body },
  );
}

export function saveMenuEntryDisplayDraft(
  brandId: string,
  menuId: string,
  entryId: string,
  body: Readonly<{
    expectedMenuRevision: string;
    displayName?: string | null;
    displayDescription?: string | null;
  }>,
) {
  return adminRequest<{ ok: true; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/entries/${entryId}/display-draft`,
    { method: "POST", body },
  );
}

export function previewMenuPublish(brandId: string, menuId: string) {
  return adminRequest<{
    ok: true;
    preview: Readonly<{
      menuId: string;
      brandId: string;
      expectedMenuRevision: string;
      draftDiffersFromEffective: boolean;
      wouldChangeCustomerTruth: boolean;
      validationOk: boolean;
      validationBlockers: readonly string[];
      activeMenuEffect: Readonly<{
        targetBecomesActive: boolean;
        replacesAnotherActiveMenu: boolean;
        currentActiveMenuId: string | null;
      }>;
      operation: "menu_revision_publish";
      hasPendingDraft: boolean;
    }>;
  }>(`${brandMenus(brandId)}/${menuId}/consequence-preview`, {
    method: "POST",
    body: {},
  });
}

export function publishMenu(
  brandId: string,
  menuId: string,
  body: Readonly<{ expectedMenuRevision: string }>,
) {
  return adminRequest<{
    ok: true;
    publication: Readonly<{
      changed: boolean;
      menuId: string;
      brandId: string;
      previousMenuRevision: string;
      menuRevision: string;
    }>;
  }>(`${brandMenus(brandId)}/${menuId}/publish`, { method: "POST", body });
}

export function activateMenuSection(
  brandId: string,
  menuId: string,
  sectionId: string,
  body: Readonly<{ expectedMenuRevision: string }>,
) {
  return adminRequest<{ ok: true; section: MenuSection; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/sections/${sectionId}/activate`,
    { method: "POST", body },
  );
}

export function retireMenuSection(
  brandId: string,
  menuId: string,
  sectionId: string,
  body: Readonly<{ expectedMenuRevision: string }>,
) {
  return adminRequest<{ ok: true; section: MenuSection; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/sections/${sectionId}/retire`,
    { method: "POST", body },
  );
}

export function activateMenuEntry(
  brandId: string,
  menuId: string,
  entryId: string,
  body: Readonly<{ expectedMenuRevision: string }>,
) {
  return adminRequest<{ ok: true; entry: MenuEntry; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/entries/${entryId}/activate`,
    { method: "POST", body },
  );
}

export function retireMenuEntry(
  brandId: string,
  menuId: string,
  entryId: string,
  body: Readonly<{ expectedMenuRevision: string }>,
) {
  return adminRequest<{ ok: true; entry: MenuEntry; menuRevision: string }>(
    `${brandMenus(brandId)}/${menuId}/entries/${entryId}/retire`,
    { method: "POST", body },
  );
}
