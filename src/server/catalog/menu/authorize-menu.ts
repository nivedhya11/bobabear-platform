/**
 * Menu RBAC helpers (IMP-013).
 *
 * Authorize against the authoritative Brand loaded from PostgreSQL.
 */
import { requireAuthorization } from "../../access-control/authorize";
import { requireWorkforcePrincipal } from "../../access-control/principal";
import { findBrandById } from "../../organization/brands";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../assert-role";
import { MenuNotFoundError } from "./errors";

async function requireMenuPermission(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
  permission: "menu.read" | "menu.manage",
  operation: string,
): Promise<void> {
  assertApplicationRole(context, operation);
  const principal = requireWorkforcePrincipal(actor);
  const brand = await findBrandById(context, brandId);
  if (!brand) {
    throw new MenuNotFoundError("brand");
  }
  await requireAuthorization(context, {
    actor: principal,
    permission,
    resource: { type: "brand", brandId: brand.id },
  });
}

export async function requireMenuManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireMenuPermission(context, actor, brandId, "menu.manage", "requireMenuManage");
}

export async function requireMenuRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireMenuPermission(context, actor, brandId, "menu.read", "requireMenuRead");
}
