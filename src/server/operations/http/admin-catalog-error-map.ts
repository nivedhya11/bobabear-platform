/** Catalog commercial Admin HTTP error → safe envelope (IMP-036F F2). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "../../catalog";
import { OrganizationNotFoundError } from "../../organization";

export type CatalogAdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
  issues?: readonly string[];
}>;

export type MappedCatalogAdminError = Readonly<{
  status: number;
  body: CatalogAdminErrorBody;
}>;

export function mapCatalogAdminError(error: unknown, requestId: string): MappedCatalogAdminError {
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "CATALOG_UNAUTHORIZED", requestId } };
  }

  if (error instanceof CatalogNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "CATALOG_NOT_FOUND", requestId } };
  }

  if (error instanceof CatalogValidationError) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "CATALOG_REQUEST_INVALID",
        requestId,
        message: error.message,
        issues: [error.message],
      },
    };
  }

  if (error instanceof CatalogConflictError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "CATALOG_CONFLICT",
        requestId,
        message: error.message,
      },
    };
  }

  if (error instanceof CatalogInvalidStateError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "CATALOG_INVALID_STATE",
        requestId,
        message: error.message,
      },
    };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
