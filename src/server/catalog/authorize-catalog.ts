/**
 * Catalog RBAC helpers (IMP-012).
 *
 * Always authorize against the authoritative Brand loaded from PostgreSQL —
 * never trust a client-supplied brandId alone after the entity is loaded.
 */
import { requireAuthorization } from "../access-control/authorize";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findBrandById } from "../organization/brands";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { CatalogNotFoundError } from "./errors";

async function requireCatalogPermission(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
  permission: "catalog.read" | "catalog.manage",
  operation: string,
): Promise<void> {
  assertApplicationRole(context, operation);
  const principal = requireWorkforcePrincipal(actor);
  const brand = await findBrandById(context, brandId);
  if (!brand) {
    throw new CatalogNotFoundError("brand");
  }
  await requireAuthorization(context, {
    actor: principal,
    permission,
    resource: { type: "brand", brandId: brand.id },
  });
}

export async function requireCatalogManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireCatalogPermission(context, actor, brandId, "catalog.manage", "requireCatalogManage");
}

export async function requireCatalogRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireCatalogPermission(context, actor, brandId, "catalog.read", "requireCatalogRead");
}
