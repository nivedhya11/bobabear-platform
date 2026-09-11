/**
 * Catalog commercial authoring Admin HTTP routes (IMP-036F F2).
 *
 * Thin transport: trusted workforce session → Brand-scoped Catalog domain.
 * Path brandId is a locator only; authorization is server-side via catalog.read /
 * catalog.manage. Draft edits use F1 revision-safe save*ContentDraft ops.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import { eq } from "drizzle-orm";

import { catalogContentRevisionsTable } from "../../../platform/database/schema/catalog";
import { isProductKind } from "../../../shared/catalog";
import type { WorkforcePrincipal } from "../../access-control";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  CatalogValidationError,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
  findModifierGroupById,
  findModifierGroupOptionById,
  findModifierOptionById,
  findProductById,
  findVariantById,
  findVariantModifierGroupById,
  getBrandCatalogModifierGroup,
  getBrandCatalogModifierOption,
  getBrandCatalogProduct,
  getBrandCatalogProductGraph,
  listBrandCatalogModifierGroups,
  listBrandCatalogModifierOptions,
  listBrandCatalogProducts,
  previewCatalogPublicationConsequence,
  publishCatalogContentChange,
  requireCatalogManage,
  retireModifierGroup,
  retireModifierGroupOption,
  retireModifierOption,
  retireProduct,
  retireVariant,
  retireVariantModifierGroup,
  saveModifierGroupContentDraft,
  saveModifierGroupOptionContentDraft,
  saveModifierOptionContentDraft,
  saveProductContentDraft,
  saveVariantContentDraft,
  saveVariantModifierGroupContentDraft,
  validateCatalogPublication,
} from "../../catalog";
import { CatalogNotFoundError } from "../../catalog/errors";
import {
  projectModifierGroupInspection,
  projectModifierOptionInspection,
  projectProductGraphInspection,
  projectProductInspection,
} from "../../catalog/inspection";
import type { Persistence } from "../../persistence";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapCatalogAdminError } from "./admin-catalog-error-map";

export type AdminCatalogRouteKind =
  | "list_products"
  | "get_product"
  | "get_product_graph"
  | "content_revision"
  | "list_modifier_groups"
  | "get_modifier_group"
  | "list_modifier_options"
  | "get_modifier_option"
  | "create_product"
  | "create_variant"
  | "product_content_draft"
  | "variant_content_draft"
  | "modifier_group_content_draft"
  | "modifier_option_content_draft"
  | "modifier_group_option_content_draft"
  | "variant_modifier_group_content_draft"
  | "create_modifier_group"
  | "create_modifier_option"
  | "add_modifier_option_to_group"
  | "apply_modifier_group_to_variant"
  | "activate_product"
  | "retire_product"
  | "activate_variant"
  | "retire_variant"
  | "activate_modifier_group"
  | "retire_modifier_group"
  | "activate_modifier_option"
  | "retire_modifier_option"
  | "activate_modifier_group_option"
  | "retire_modifier_group_option"
  | "activate_variant_modifier_group"
  | "retire_variant_modifier_group"
  | "validate_publication"
  | "consequence_preview"
  | "publish";

export type AdminCatalogRoute = Readonly<{
  kind: AdminCatalogRouteKind;
  brandId: string;
  productId?: string;
  variantId?: string;
  modifierGroupId?: string;
  modifierOptionId?: string;
  modifierGroupOptionId?: string;
  variantModifierGroupId?: string;
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
  "workforceUserIdAuthority",
  "brandId",
  "organizationId",
  "territoryId",
  "outletId",
]);

function rejectForgedBody(body: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new CatalogValidationError({
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
    throw new CatalogValidationError({ message: `${field} must be a non-empty string.` });
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
    throw new CatalogValidationError({ message: `${field} must be a string or null.` });
  }
  return value;
}

function optionalBoolean(
  body: Readonly<Record<string, unknown>>,
  field: string,
): boolean | undefined {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (typeof value !== "boolean") {
    throw new CatalogValidationError({ message: `${field} must be a boolean.` });
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
    throw new CatalogValidationError({ message: `${field} must be a number.` });
  }
  return value;
}

function requireExpectedContentRevision(
  body: Readonly<Record<string, unknown>>,
): string {
  const value = body.expectedContentRevision;
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  throw new CatalogValidationError({
    message: "expectedContentRevision must be a non-empty decimal string or safe non-negative integer.",
  });
}

export function classifyAdminCatalogRoute(pathname: string): AdminCatalogRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  // api admin v1 brands {brandId} catalog ...
  if (
    segments.length < 6 ||
    segments[0] !== "api" ||
    segments[1] !== "admin" ||
    segments[2] !== "v1" ||
    segments[3] !== "brands" ||
    !segments[4] ||
    segments[5] !== "catalog"
  ) {
    return null;
  }

  const brandId = segments[4];
  const rest = segments.slice(6);

  if (rest.length === 1 && rest[0] === "content-revision") {
    return { kind: "content_revision", brandId };
  }
  if (rest.length === 1 && rest[0] === "products") {
    return { kind: "list_products", brandId };
  }
  if (rest.length === 1 && rest[0] === "modifier-groups") {
    return { kind: "list_modifier_groups", brandId };
  }
  if (rest.length === 1 && rest[0] === "modifier-options") {
    return { kind: "list_modifier_options", brandId };
  }

  if (rest[0] === "products" && rest[1]) {
    const productId = rest[1];
    if (rest.length === 2) {
      return { kind: "get_product", brandId, productId };
    }
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "graph") return { kind: "get_product_graph", brandId, productId };
      if (action === "variants") return { kind: "create_variant", brandId, productId };
      if (action === "content-draft") return { kind: "product_content_draft", brandId, productId };
      if (action === "activate") return { kind: "activate_product", brandId, productId };
      if (action === "retire") return { kind: "retire_product", brandId, productId };
      if (action === "validate") return { kind: "validate_publication", brandId, productId };
      if (action === "consequence-preview") {
        return { kind: "consequence_preview", brandId, productId };
      }
      if (action === "publish") return { kind: "publish", brandId, productId };
    }
  }

  if (rest[0] === "variants" && rest[1]) {
    const variantId = rest[1];
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "content-draft") return { kind: "variant_content_draft", brandId, variantId };
      if (action === "activate") return { kind: "activate_variant", brandId, variantId };
      if (action === "retire") return { kind: "retire_variant", brandId, variantId };
      if (action === "modifier-groups") {
        return { kind: "apply_modifier_group_to_variant", brandId, variantId };
      }
    }
  }

  if (rest[0] === "modifier-groups" && rest[1]) {
    const modifierGroupId = rest[1];
    if (rest.length === 2) {
      return { kind: "get_modifier_group", brandId, modifierGroupId };
    }
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "content-draft") {
        return { kind: "modifier_group_content_draft", brandId, modifierGroupId };
      }
      if (action === "activate") return { kind: "activate_modifier_group", brandId, modifierGroupId };
      if (action === "retire") return { kind: "retire_modifier_group", brandId, modifierGroupId };
      if (action === "options") {
        return { kind: "add_modifier_option_to_group", brandId, modifierGroupId };
      }
    }
  }

  if (rest[0] === "modifier-options" && rest[1]) {
    const modifierOptionId = rest[1];
    if (rest.length === 2) {
      return { kind: "get_modifier_option", brandId, modifierOptionId };
    }
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "content-draft") {
        return { kind: "modifier_option_content_draft", brandId, modifierOptionId };
      }
      if (action === "activate") {
        return { kind: "activate_modifier_option", brandId, modifierOptionId };
      }
      if (action === "retire") {
        return { kind: "retire_modifier_option", brandId, modifierOptionId };
      }
    }
  }

  if (rest[0] === "modifier-group-options" && rest[1]) {
    const modifierGroupOptionId = rest[1];
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "content-draft") {
        return {
          kind: "modifier_group_option_content_draft",
          brandId,
          modifierGroupOptionId,
        };
      }
      if (action === "activate") {
        return {
          kind: "activate_modifier_group_option",
          brandId,
          modifierGroupOptionId,
        };
      }
      if (action === "retire") {
        return {
          kind: "retire_modifier_group_option",
          brandId,
          modifierGroupOptionId,
        };
      }
    }
  }

  if (rest[0] === "variant-modifier-groups" && rest[1]) {
    const variantModifierGroupId = rest[1];
    if (rest.length === 3) {
      const action = rest[2];
      if (action === "content-draft") {
        return {
          kind: "variant_modifier_group_content_draft",
          brandId,
          variantModifierGroupId,
        };
      }
      if (action === "activate") {
        return {
          kind: "activate_variant_modifier_group",
          brandId,
          variantModifierGroupId,
        };
      }
      if (action === "retire") {
        return {
          kind: "retire_variant_modifier_group",
          brandId,
          variantModifierGroupId,
        };
      }
    }
  }

  return null;
}

function allowedMethodFor(kind: AdminCatalogRouteKind): "GET" | "POST" {
  switch (kind) {
    case "list_products":
    case "get_product":
    case "get_product_graph":
    case "content_revision":
    case "list_modifier_groups":
    case "get_modifier_group":
    case "list_modifier_options":
    case "get_modifier_option":
      return "GET";
    default:
      return "POST";
  }
}

function isMutationKind(kind: AdminCatalogRouteKind): boolean {
  return allowedMethodFor(kind) === "POST";
}

/** Dual-method: GET list vs POST create on same collection paths. */
function resolveRouteForMethod(route: AdminCatalogRoute, method: string): AdminCatalogRoute {
  if (method === "POST" && route.kind === "list_products") {
    return { kind: "create_product", brandId: route.brandId };
  }
  if (method === "POST" && route.kind === "list_modifier_groups") {
    return { kind: "create_modifier_group", brandId: route.brandId };
  }
  if (method === "POST" && route.kind === "list_modifier_options") {
    return { kind: "create_modifier_option", brandId: route.brandId };
  }
  if (method === "GET" && route.kind === "get_product") {
    return route;
  }
  return route;
}

export async function handleAdminCatalogRoute(
  req: IncomingMessage,
  route: AdminCatalogRoute,
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
      body: { ok: false, code: "CATALOG_REQUEST_INVALID", requestId },
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
          code: "CATALOG_REQUEST_INVALID",
          body: { ok: false, code: "CATALOG_REQUEST_INVALID", requestId },
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
    const mapped = mapCatalogAdminError(error, requestId);
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
  route: AdminCatalogRoute,
): Promise<Record<string, unknown>> {
  switch (route.kind) {
    case "content_revision": {
      await listBrandCatalogProducts(context, {
        actor: principal,
        brandId: route.brandId,
      });
      const rows = await context.db
        .select()
        .from(catalogContentRevisionsTable)
        .where(eq(catalogContentRevisionsTable.brandId, route.brandId))
        .limit(1);
      const contentRevision = rows[0]?.contentRevision ?? BigInt(0);
      return { contentRevision: contentRevision.toString(10) };
    }
    case "list_products": {
      const products = await listBrandCatalogProducts(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return {
        products: await Promise.all(
          products.map((product) => projectProductInspection(context, product)),
        ),
      };
    }
    case "get_product": {
      const product = await getBrandCatalogProduct(context, {
        actor: principal,
        brandId: route.brandId,
        productId: route.productId!,
      });
      return { product: await projectProductInspection(context, product) };
    }
    case "get_product_graph": {
      const graph = await getBrandCatalogProductGraph(context, {
        actor: principal,
        brandId: route.brandId,
        productId: route.productId!,
      });
      return { graph: await projectProductGraphInspection(context, graph) };
    }
    case "list_modifier_groups": {
      const modifierGroups = await listBrandCatalogModifierGroups(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return {
        modifierGroups: await Promise.all(
          modifierGroups.map((group) => projectModifierGroupInspection(context, group)),
        ),
      };
    }
    case "get_modifier_group": {
      const modifierGroup = await getBrandCatalogModifierGroup(context, {
        actor: principal,
        brandId: route.brandId,
        modifierGroupId: route.modifierGroupId!,
      });
      return {
        modifierGroup: await projectModifierGroupInspection(context, modifierGroup),
      };
    }
    case "list_modifier_options": {
      const modifierOptions = await listBrandCatalogModifierOptions(context, {
        actor: principal,
        brandId: route.brandId,
      });
      return {
        modifierOptions: await Promise.all(
          modifierOptions.map((option) => projectModifierOptionInspection(context, option)),
        ),
      };
    }
    case "get_modifier_option": {
      const modifierOption = await getBrandCatalogModifierOption(context, {
        actor: principal,
        brandId: route.brandId,
        modifierOptionId: route.modifierOptionId!,
      });
      return {
        modifierOption: await projectModifierOptionInspection(context, modifierOption),
      };
    }
    default:
      throw new CatalogValidationError({ message: "Unsupported catalog read route." });
  }
}

async function dispatchMutation(
  context: PersistenceTransactionContext,
  principal: WorkforcePrincipal,
  route: AdminCatalogRoute,
  body: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  // Path-Brand authority before resource lookup (anti-oracle).
  // Consequence preview uses the same manage permission as publication (US-010).
  await requireCatalogManage(context, principal, route.brandId);

  switch (route.kind) {
    case "create_product": {
      const productKindRaw = body.productKind;
      if (!isProductKind(productKindRaw)) {
        throw new CatalogValidationError({ message: "productKind must be standard or bundle." });
      }
      const product = await createProduct(context, {
        actor: principal,
        brandId: route.brandId,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        description: optionalString(body, "description") ?? null,
        productKind: productKindRaw,
      });
      return { product };
    }
    case "create_variant": {
      const product = await findProductById(context, route.productId!);
      if (!product || product.brandId !== route.brandId) {
        throw new CatalogNotFoundError("product");
      }
      const variant = await createVariant(context, {
        actor: principal,
        productId: product.id,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        description: optionalString(body, "description") ?? null,
        isDefault: optionalBoolean(body, "isDefault"),
        isSelectorVisible: optionalBoolean(body, "isSelectorVisible"),
      });
      return { variant };
    }
    case "product_content_draft": {
      const product = await findProductById(context, route.productId!);
      if (!product || product.brandId !== route.brandId) {
        throw new CatalogNotFoundError("product");
      }
      const draft = await saveProductContentDraft(context, {
        actor: principal,
        productId: product.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        name: optionalString(body, "name") ?? undefined,
        description: optionalString(body, "description"),
      });
      return { draft };
    }
    case "variant_content_draft": {
      const variant = await findVariantById(context, route.variantId!);
      if (!variant || variant.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant");
      }
      const draft = await saveVariantContentDraft(context, {
        actor: principal,
        variantId: variant.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        name: optionalString(body, "name") ?? undefined,
        description: optionalString(body, "description"),
        isDefault: optionalBoolean(body, "isDefault"),
        isSelectorVisible: optionalBoolean(body, "isSelectorVisible"),
      });
      return { draft };
    }
    case "modifier_group_content_draft": {
      const group = await findModifierGroupById(context, route.modifierGroupId!);
      if (!group || group.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group");
      }
      const draft = await saveModifierGroupContentDraft(context, {
        actor: principal,
        modifierGroupId: group.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        name: optionalString(body, "name") ?? undefined,
        description: optionalString(body, "description"),
      });
      return { draft };
    }
    case "modifier_option_content_draft": {
      const option = await findModifierOptionById(context, route.modifierOptionId!);
      if (!option || option.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_option");
      }
      const draft = await saveModifierOptionContentDraft(context, {
        actor: principal,
        modifierOptionId: option.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        name: optionalString(body, "name") ?? undefined,
        description: optionalString(body, "description"),
      });
      return { draft };
    }
    case "modifier_group_option_content_draft": {
      const binding = await findModifierGroupOptionById(context, route.modifierGroupOptionId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group_option");
      }
      const draft = await saveModifierGroupOptionContentDraft(context, {
        actor: principal,
        modifierGroupOptionId: binding.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        minQuantity: optionalNumber(body, "minQuantity"),
        maxQuantity: optionalNumber(body, "maxQuantity"),
        defaultQuantity: optionalNumber(body, "defaultQuantity"),
        position: optionalNumber(body, "position"),
      });
      return { draft };
    }
    case "variant_modifier_group_content_draft": {
      const binding = await findVariantModifierGroupById(context, route.variantModifierGroupId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant_modifier_group");
      }
      const draft = await saveVariantModifierGroupContentDraft(context, {
        actor: principal,
        variantModifierGroupId: binding.id,
        expectedContentRevision: requireExpectedContentRevision(body),
        minTotalQuantity: optionalNumber(body, "minTotalQuantity"),
        maxTotalQuantity: optionalNumber(body, "maxTotalQuantity"),
        position: optionalNumber(body, "position"),
      });
      return { draft };
    }
    case "create_modifier_group": {
      const group = await createModifierGroup(context, {
        actor: principal,
        brandId: route.brandId,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        description: optionalString(body, "description") ?? null,
      });
      return { modifierGroup: group };
    }
    case "create_modifier_option": {
      const option = await createModifierOption(context, {
        actor: principal,
        brandId: route.brandId,
        code: requireString(body, "code"),
        name: requireString(body, "name"),
        description: optionalString(body, "description") ?? null,
      });
      return { modifierOption: option };
    }
    case "add_modifier_option_to_group": {
      const group = await findModifierGroupById(context, route.modifierGroupId!);
      if (!group || group.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group");
      }
      const binding = await addModifierOptionToGroup(context, {
        actor: principal,
        modifierGroupId: group.id,
        modifierOptionId: requireString(body, "modifierOptionId"),
        minQuantity: optionalNumber(body, "minQuantity"),
        maxQuantity: optionalNumber(body, "maxQuantity") ?? 1,
        defaultQuantity: optionalNumber(body, "defaultQuantity"),
        position: optionalNumber(body, "position"),
      });
      return { modifierGroupOption: binding };
    }
    case "apply_modifier_group_to_variant": {
      const variant = await findVariantById(context, route.variantId!);
      if (!variant || variant.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant");
      }
      const binding = await applyModifierGroupToVariant(context, {
        actor: principal,
        variantId: variant.id,
        modifierGroupId: requireString(body, "modifierGroupId"),
        minTotalQuantity: optionalNumber(body, "minTotalQuantity"),
        maxTotalQuantity: optionalNumber(body, "maxTotalQuantity") ?? 1,
        position: optionalNumber(body, "position"),
      });
      return { variantModifierGroup: binding };
    }
    case "activate_product": {
      const product = await findProductById(context, route.productId!);
      if (!product || product.brandId !== route.brandId) {
        throw new CatalogNotFoundError("product");
      }
      return { product: await activateProduct(context, { actor: principal, productId: product.id }) };
    }
    case "retire_product": {
      const product = await findProductById(context, route.productId!);
      if (!product || product.brandId !== route.brandId) {
        throw new CatalogNotFoundError("product");
      }
      return { product: await retireProduct(context, { actor: principal, productId: product.id }) };
    }
    case "activate_variant": {
      const variant = await findVariantById(context, route.variantId!);
      if (!variant || variant.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant");
      }
      return {
        variant: await activateVariant(context, { actor: principal, variantId: variant.id }),
      };
    }
    case "retire_variant": {
      const variant = await findVariantById(context, route.variantId!);
      if (!variant || variant.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant");
      }
      return { variant: await retireVariant(context, { actor: principal, variantId: variant.id }) };
    }
    case "activate_modifier_group": {
      const group = await findModifierGroupById(context, route.modifierGroupId!);
      if (!group || group.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group");
      }
      return {
        modifierGroup: await activateModifierGroup(context, {
          actor: principal,
          modifierGroupId: group.id,
        }),
      };
    }
    case "retire_modifier_group": {
      const group = await findModifierGroupById(context, route.modifierGroupId!);
      if (!group || group.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group");
      }
      return {
        modifierGroup: await retireModifierGroup(context, {
          actor: principal,
          modifierGroupId: group.id,
        }),
      };
    }
    case "activate_modifier_option": {
      const option = await findModifierOptionById(context, route.modifierOptionId!);
      if (!option || option.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_option");
      }
      return {
        modifierOption: await activateModifierOption(context, {
          actor: principal,
          modifierOptionId: option.id,
        }),
      };
    }
    case "retire_modifier_option": {
      const option = await findModifierOptionById(context, route.modifierOptionId!);
      if (!option || option.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_option");
      }
      return {
        modifierOption: await retireModifierOption(context, {
          actor: principal,
          modifierOptionId: option.id,
        }),
      };
    }
    case "activate_modifier_group_option": {
      const binding = await findModifierGroupOptionById(context, route.modifierGroupOptionId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group_option");
      }
      return {
        modifierGroupOption: await activateModifierGroupOption(context, {
          actor: principal,
          modifierGroupOptionId: binding.id,
        }),
      };
    }
    case "retire_modifier_group_option": {
      const binding = await findModifierGroupOptionById(context, route.modifierGroupOptionId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("modifier_group_option");
      }
      return {
        modifierGroupOption: await retireModifierGroupOption(context, {
          actor: principal,
          modifierGroupOptionId: binding.id,
        }),
      };
    }
    case "activate_variant_modifier_group": {
      const binding = await findVariantModifierGroupById(context, route.variantModifierGroupId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant_modifier_group");
      }
      return {
        variantModifierGroup: await activateVariantModifierGroup(context, {
          actor: principal,
          variantModifierGroupId: binding.id,
        }),
      };
    }
    case "retire_variant_modifier_group": {
      const binding = await findVariantModifierGroupById(context, route.variantModifierGroupId!);
      if (!binding || binding.brandId !== route.brandId) {
        throw new CatalogNotFoundError("variant_modifier_group");
      }
      return {
        variantModifierGroup: await retireVariantModifierGroup(context, {
          actor: principal,
          variantModifierGroupId: binding.id,
        }),
      };
    }
    case "validate_publication": {
      const result = await validateCatalogPublication(context, {
        actor: principal,
        brandId: route.brandId,
        productId: route.productId!,
      });
      return result;
    }
    case "consequence_preview": {
      const preview = await previewCatalogPublicationConsequence(context, {
        actor: principal,
        brandId: route.brandId,
        productId: route.productId!,
      });
      return { preview };
    }
    case "publish": {
      const result = await publishCatalogContentChange(context, {
        actor: principal,
        brandId: route.brandId,
        productId: route.productId!,
        expectedContentRevision: requireExpectedContentRevision(body),
      });
      return { publication: result };
    }
    default:
      throw new CatalogValidationError({ message: "Unsupported catalog mutation route." });
  }
}
