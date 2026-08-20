/**
 * Customer Menu transport wrapper (IMP-028B). No projection business rules.
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CustomerMenuProjection } from "../../shared/customer-menu/types";

type MenuEnvelope = Readonly<{ ok: true; menu: CustomerMenuProjection }>;

export async function getCustomerMenu(input: {
  brandId: string;
  outletId?: string;
}): Promise<CommerceHttpResult<{ menu: CustomerMenuProjection }>> {
  const query: Record<string, string | undefined> = { brandId: input.brandId };
  if (input.outletId) query.outletId = input.outletId;
  const result = await commerceRequest<MenuEnvelope>("/api/v1/menu", {
    method: "GET",
    query,
  });
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { menu: result.data.menu } };
}
