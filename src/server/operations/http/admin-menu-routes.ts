/**
 * Menu commercial authoring Admin HTTP routes (IMP-036F F3B).
 *
 * Thin transport: trusted workforce session → Brand-scoped Menu domain.
 * Path brandId is a locator only; authorization is server-side via menu.read /
 * menu.manage. Material mutations consume expectedMenuRevision (F3A CAS).
 * Publication uses publishMenuRevision only — activateMenu is not exposed.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import { and, eq } from "drizzle-orm";

import { menusTable } from "../../../platform/database/schema/menu";
import type { WorkforcePrincipal } from "../../access-control";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  findMenuEntryById,
  findMenuSectionById,
  getBrandMenuInspection,
  listBrandMenus,
  MenuNotFoundError,
  MenuValidationError,
  moveMenuEntry,
  previewMenuPublication,
  publishMenuRevision,
  reorderMenuEntries,
  reorderMenuSections,
  requireMenuManage,
  requireMenuRead,
  retireMenuEntry,
  retireMenuSection,
  updateMenuEntryDisplay,
  updateMenuSection,
  validateMenuPublication,
} from "../../catalog";
import type { Persistence } from "../../persistence";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapMenuAdminError } from "./admin-menu-error-map";

export type AdminMenuRouteKind =
  | "list_menus"
  | "get_menu"
  | "create_menu"
  | "create_section"
  | "section_content_draft"
  | "activate_section"
  | "retire_section"
  | "reorder_sections"
  | "create_entry"
  | "entry_display_draft"
  | "move_entry"
  | "activate_entry"
  | "retire_entry"
  | "reorder_entries"
  | "validate_publication"
  | "consequence_preview"
  | "publish";

export type AdminMenuRoute = Readonly<{
  kind: AdminMenuRouteKind;
  brandId: string;
  menuId?: string;
  sectionId?: string;
  entryId?: string;
}>;

const FORBIDDEN_BODY_KEYS = new Set([
  "actor",
  "actorId",
  "principal",
  "permission",
  "permissions",
  "role",
  "roles",
  "scope",
  "scopeApproved",
  "authorized",
  "workforceUserId",
  "workforceUserIdAuthority",
  "brandId",
  "organizationId",
  "territoryId",
  "outletId",
]);

function rejectForgedBody(body: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new MenuValidationError({
        message: "Caller-supplied authority fields are not accepted.",
      });
    }
  }
}

function dateJson(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return v.toString(10);
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  );
}

function requireString(body: Readonly<Record<string, unknown>>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new MenuValidationError({ message: `${field} must be a non-empty string.` });
  }
  return value;
}

function optionalString(
  body: Readonly<Record<string, unknown>>,
  field: string,
): string | null | undefined {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new MenuValidationError({ message: `${field} must be a string or null.` });
  }
  return value;
}

function optionalNumber(
  body: Readonly<Record<string, unknown>>,
  field: string,
): number | undefined {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MenuValidationError({ message: `${field} must be a number.` });
  }
  return value;
}

function optionalParentSectionId(
  body: Readonly<Record<string, unknown>>,
): string | null | undefined {
  if (!("parentSectionId" in body)) return undefined;
  const value = body.parentSectionId;
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0) {
    throw new MenuValidationError({
      message: "parentSectionId must be a non-empty string or null.",
    });
  }
  return value;
}

/** HTTP parser: positive decimal string or safe positive JS integer. */
function requireExpectedMenuRevision(body: Readonly<Record<string, unknown>>): string {
  const value = body.expectedMenuRevision;
  if (typeof value === "string" && /^\d+$/.test(value) && value !== "0" && !/^0\d+/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  throw new MenuValidationError({
    message:
      "expectedMenuRevision must be a non-empty positive decimal string or safe positive integer.",
  });
}

function requireStringArray(
  body: Readonly<Record<string, unknown>>,
  field: string,
): readonly string[] {
  const value = body[field];
  if (!Array.isArray(value) || value.length === 0 || value.some((v) => typeof v !== "string" || !v)) {
    throw new MenuValidationError({
      message: `${field} must be a non-empty array of non-empty strings.`,
    });
  }
  return value as readonly string[];
}

function rejectImagePathMutation(body: Readonly<Record<string, unknown>>): void {
  if ("imagePath" in body) {
    throw new MenuValidationError({
      message: "imagePath mutation is not exposed on this Admin surface.",
    });
  }
}

export function classifyAdminMenuRoute(pathname: string): AdminMenuRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  // api admin v1 brands {brandId} menus ...
  if (
    segments.length < 6 ||
    segments[0] !== "api" ||
    segments[1] !== "admin" ||
    segments[2] !== "v1" ||
    segments[3] !== "brands" ||
    !segments[4] ||
    segments[5] !== "menus"
  ) {
    return null;
  }

  const brandId = segments[4];
  const rest = segments.slice(6);

  if (rest.length === 0) {
    return { kind: "list_menus", brandId };
  }

  const menuId = rest[0];
  if (!menuId) return null;

  if (rest.length === 1) {
    return { kind: "get_menu", brandId, menuId };
  }

  if (rest.length === 2) {
    const action = rest[1];
    if (action === "sections") return { kind: "create_section", brandId, menuId };
    if (action === "entries") return { kind: "create_entry", brandId, menuId };
    if (action === "validate") return { kind: "validate_publication", brandId, menuId };
    if (action === "consequence-preview") {
      return { kind: "consequence_preview", brandId, menuId };
    }
    if (action === "publish") return { kind: "publish", brandId, menuId };
    return null;
  }

  if (rest[1] === "sections" && rest[2] === "reorder" && rest.length === 3) {
    return { kind: "reorder_sections", brandId, menuId };
  }

  if (rest[1] === "sections" && rest[2] && rest.length === 4) {
    const sectionId = rest[2];
    const action = rest[3];
    if (action === "content-draft") {
      return { kind: "section_content_draft", brandId, menuId, sectionId };
    }
    if (action === "activate") return { kind: "activate_section", brandId, menuId, sectionId };
    if (action === "retire") return { kind: "retire_section", brandId, menuId, sectionId };
    return null;
  }

  if (
    rest[1] === "sections" &&
    rest[2] &&
    rest[3] === "entries" &&
    rest[4] === "reorder" &&
    rest.length === 5
  ) {
    return {
      kind: "reorder_entries",
      brandId,
      menuId,
      sectionId: rest[2],
    };
  }

  if (rest[1] === "entries" && rest[2] && rest.length === 4) {
    const entryId = rest[2];
    const action = rest[3];
    if (action === "display-draft") {
      return { kind: "entry_display_draft", brandId, menuId, entryId };
    }
    if (action === "move") return { kind: "move_entry", brandId, menuId, entryId };
    if (action === "activate") return { kind: "activate_entry", brandId, menuId, entryId };
    if (action === "retire") return { kind: "retire_entry", brandId, menuId, entryId };
  }

  return null;
}

function allowedMethodFor(kind: AdminMenuRouteKind): "GET" | "POST" {
  switch (kind) {
    case "list_menus":
    case "get_menu":
      return "GET";
    default:
      return "POST";
  }
}

function isMutationKind(kind: AdminMenuRouteKind): boolean {
  return allowedMethodFor(kind) === "POST";
}

/** Dual-method: GET list vs POST create on `/menus`. */
function resolveRouteForMethod(route: AdminMenuRoute, method: string): AdminMenuRoute {
  if (method === "POST" && route.kind === "list_menus") {
    return { kind: "create_menu", brandId: route.brandId };
  }
  return route;
}

async function loadPathMenu(
  context: PersistenceQueryContext,
  brandId: string,
  menuId: string,
): Promise<Awaited<ReturnType<typeof findMenuById>> & object> {
  const rows = await context.db
    .select({ id: menusTable.id })
    .from(menusTable)
    .where(and(eq(menusTable.id, menuId), eq(menusTable.brandId, brandId)))
    .limit(1);
  if (!rows[0]) throw new MenuNotFoundError("menu");
  const menu = await findMenuById(context, menuId);
  if (!menu || menu.brandId !== brandId) throw new MenuNotFoundError("menu");
  return menu;
}

async function requirePathSection(
  context: PersistenceQueryContext,
  brandId: string,
  menuId: string,
  sectionId: string,
): Promise<void> {
  await loadPathMenu(context, brandId, menuId);
  const section = await findMenuSectionById(context, sectionId);
  if (!section || section.brandId !== brandId || section.menuId !== menuId) {
    throw new MenuNotFoundError("menu_section");
  }
}

async function requirePathEntry(
  context: PersistenceQueryContext,
  brandId: string,
  menuId: string,
  entryId: string,
): Promise<void> {
  await loadPathMenu(context, brandId, menuId);
  const entry = await findMenuEntryById(context, entryId);
  if (!entry || entry.brandId !== brandId || entry.menuId !== menuId) {
    throw new MenuNotFoundError("menu_entry");
  }
}

export async function handleAdminMenuRoute(
  req: IncomingMessage,
  route: AdminMenuRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const effective = resolveRouteForMethod(route, method);
  const operation = effective.kind;
  const allowed = allowedMethodFor(effective.kind);

  if (method !== allowed) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "MENU_REQUEST_INVALID", requestId },
    };
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    if (!principal) {
      return {
        status: 401,
        operation,
        code: "WORKFORCE_AUTH_REQUIRED",
        body: { ok: false, code: "WORKFORCE_AUTH_REQUIRED", requestId },
      };
    }

    if (isMutationKind(effective.kind)) {
      const body = await readOperationsJsonObjectBody(req);
      if (!body.ok) {
        return {
          status: 400,
          operation,
          code: "MENU_REQUEST_INVALID",
          body: { ok: false, code: "MENU_REQUEST_INVALID", requestId },
        };
      }
      rejectForgedBody(body.value);
      const result = await deps.persistence.transaction((tx) =>
        dispatchMutation(tx, principal, effective, body.value),
      );
      return {
        status: 200,
        operation,
        code: "OK",
        body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
      };
    }

    const result = await deps.persistence.withContext((ctx) =>
      dispatchRead(ctx, principal, effective),
    );
    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, ...(dateJson(result) as Record<string, unknown>) },
    };
  } catch (error) {
    const mapped = mapMenuAdminError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body as Record<string, unknown>,
    };
  }
}

async function dispatchRead(
  context: PersistenceQueryContext,
  principal: WorkforcePrincipal,
  route: AdminMenuRoute,
): Promise<Record<string, unknown>> {
  switch (route.kind) {
    case "list_menus": {
      const menus = await listBrandMenus(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return { menus };
    }
    case "get_menu": {
      const inspection = await getBrandMenuInspection(context, {
        actor: principal,
        brandId: route.brandId,
        menuId: route.menuId!,
      });
      return {
        menu: inspection.menu,
        effective: inspection.effective,
        draft: inspection.draft,
        draftDiffersFromEffective: inspection.draftDiffersFromEffective,
      };
    }
    default:
      throw new MenuValidationError({ message: `Unsupported read route: ${route.kind}` });
  }
}

async function dispatchMutation(
  context: PersistenceTransactionContext,
  principal: WorkforcePrincipal,
  route: AdminMenuRoute,
  body: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  // Path-Brand authority before resource lookup (anti-oracle).
  // Consequence preview uses the same manage permission as publication.
  if (route.kind === "list_menus" || route.kind === "get_menu") {
    await requireMenuRead(context, principal, route.brandId);
  } else {
    await requireMenuManage(context, principal, route.brandId);
  }

  switch (route.kind) {
    case "create_menu": {
      const menu = await createMenu(context, {
        actor: principal,
        brandId: route.brandId,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
      });
      return {
        menu: {
          id: menu.id,
          brandId: menu.brandId,
          code: menu.code,
          name: menu.name,
          lifecycleStatus: menu.lifecycleStatus,
          revision: menu.revision.toString(10),
          effectiveMenuVersionId: menu.effectiveMenuVersionId,
          draftMenuVersionId: menu.draftMenuVersionId,
        },
      };
    }

    case "create_section": {
      await loadPathMenu(context, route.brandId, route.menuId!);
      const section = await createMenuSection(context, {
        actor: principal,
        brandId: route.brandId,
        menuId: route.menuId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        parentSectionId: optionalParentSectionId(body) ?? null,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        description: optionalString(body, "description") ?? null,
        position: optionalNumber(body, "position"),
      });
      return { section, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "section_content_draft": {
      await requirePathSection(context, route.brandId, route.menuId!, route.sectionId!);
      const result = await updateMenuSection(context, {
        actor: principal,
        sectionId: route.sectionId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        name: optionalString(body, "name") ?? undefined,
        description: optionalString(body, "description"),
        parentSectionId: optionalParentSectionId(body),
      });
      return result;
    }

    case "activate_section": {
      await requirePathSection(context, route.brandId, route.menuId!, route.sectionId!);
      const section = await activateMenuSection(context, {
        actor: principal,
        sectionId: route.sectionId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
      });
      return { section, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "retire_section": {
      await requirePathSection(context, route.brandId, route.menuId!, route.sectionId!);
      const section = await retireMenuSection(context, {
        actor: principal,
        sectionId: route.sectionId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
      });
      return { section, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "reorder_sections": {
      await loadPathMenu(context, route.brandId, route.menuId!);
      let parentSectionId: string | null = null;
      if ("parentSectionId" in body) {
        const raw = body.parentSectionId;
        if (raw === null) parentSectionId = null;
        else if (typeof raw === "string" && raw.length > 0) parentSectionId = raw;
        else {
          throw new MenuValidationError({
            message: "parentSectionId must be a non-empty string or null.",
          });
        }
      }
      const result = await reorderMenuSections(context, {
        actor: principal,
        menuId: route.menuId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        parentSectionId,
        orderedSectionIds: requireStringArray(body, "orderedSectionIds"),
      });
      return result;
    }

    case "create_entry": {
      rejectImagePathMutation(body);
      await loadPathMenu(context, route.brandId, route.menuId!);
      const entry = await createMenuEntry(context, {
        actor: principal,
        brandId: route.brandId,
        menuId: route.menuId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        sectionId: requireString(body, "sectionId"),
        productId: requireString(body, "productId"),
        displayName: optionalString(body, "displayName"),
        displayDescription: optionalString(body, "displayDescription"),
        position: optionalNumber(body, "position"),
      });
      return { entry, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "entry_display_draft": {
      rejectImagePathMutation(body);
      await requirePathEntry(context, route.brandId, route.menuId!, route.entryId!);
      if (!("displayName" in body) && !("displayDescription" in body)) {
        throw new MenuValidationError({
          message: "display-draft requires displayName and/or displayDescription.",
        });
      }
      const result = await updateMenuEntryDisplay(context, {
        actor: principal,
        entryId: route.entryId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        displayName: optionalString(body, "displayName"),
        displayDescription: optionalString(body, "displayDescription"),
      });
      return result;
    }

    case "move_entry": {
      await requirePathEntry(context, route.brandId, route.menuId!, route.entryId!);
      const result = await moveMenuEntry(context, {
        actor: principal,
        entryId: route.entryId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        targetSectionId: requireString(body, "targetSectionId"),
        position: optionalNumber(body, "position"),
      });
      return result;
    }

    case "activate_entry": {
      await requirePathEntry(context, route.brandId, route.menuId!, route.entryId!);
      const entry = await activateMenuEntry(context, {
        actor: principal,
        entryId: route.entryId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
      });
      return { entry, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "retire_entry": {
      await requirePathEntry(context, route.brandId, route.menuId!, route.entryId!);
      const entry = await retireMenuEntry(context, {
        actor: principal,
        entryId: route.entryId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
      });
      return { entry, menuRevision: (await findMenuById(context, route.menuId!))!.revision };
    }

    case "reorder_entries": {
      await requirePathSection(context, route.brandId, route.menuId!, route.sectionId!);
      const result = await reorderMenuEntries(context, {
        actor: principal,
        sectionId: route.sectionId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
        orderedEntryIds: requireStringArray(body, "orderedEntryIds"),
      });
      return result;
    }

    case "validate_publication": {
      await loadPathMenu(context, route.brandId, route.menuId!);
      const validation = await validateMenuPublication(context, {
        actor: principal,
        menuId: route.menuId!,
      });
      return { validation };
    }

    case "consequence_preview": {
      await loadPathMenu(context, route.brandId, route.menuId!);
      const preview = await previewMenuPublication(context, {
        actor: principal,
        menuId: route.menuId!,
      });
      return { preview };
    }

    case "publish": {
      await loadPathMenu(context, route.brandId, route.menuId!);
      const publication = await publishMenuRevision(context, {
        actor: principal,
        menuId: route.menuId!,
        expectedMenuRevision: requireExpectedMenuRevision(body),
      });
      return {
        publication: {
          changed: publication.changed,
          menuId: publication.menuId,
          brandId: publication.brandId,
          previousMenuRevision: publication.previousMenuRevision.toString(10),
          menuRevision: publication.menuRevision.toString(10),
          previousEffectiveMenuVersionId: publication.previousEffectiveMenuVersionId,
          effectiveMenuVersionId: publication.effectiveMenuVersionId,
        },
      };
    }

    default:
      throw new MenuValidationError({ message: `Unsupported mutation route: ${route.kind}` });
  }
}
