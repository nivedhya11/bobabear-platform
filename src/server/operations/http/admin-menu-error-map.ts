/** Menu commercial Admin HTTP error → safe envelope (IMP-036F F3B). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import {
  CatalogInvalidStateError,
  CatalogValidationError,
} from "../../catalog/errors";
import {
  MenuConflictError,
  MenuInvalidStateError,
  MenuNotFoundError,
  MenuValidationError,
} from "../../catalog/menu";
import { OrganizationNotFoundError } from "../../organization";

export type MenuAdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
  issues?: readonly string[];
}>;

export type MappedMenuAdminError = Readonly<{
  status: number;
  body: MenuAdminErrorBody;
}>;

export function mapMenuAdminError(error: unknown, requestId: string): MappedMenuAdminError {
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "MENU_UNAUTHORIZED", requestId } };
  }

  if (error instanceof MenuNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "MENU_NOT_FOUND", requestId } };
  }

  if (error instanceof MenuValidationError || error instanceof CatalogValidationError) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "MENU_REQUEST_INVALID",
        requestId,
        message: error.message,
        issues: [error.message],
      },
    };
  }

  if (error instanceof MenuConflictError) {
    const code =
      error.menuErrorCode === "MENU_STALE_REVISION" ? "MENU_STALE_REVISION" : "MENU_CONFLICT";
    return {
      status: 409,
      body: {
        ok: false,
        code,
        requestId,
        message: error.message,
      },
    };
  }

  if (error instanceof MenuInvalidStateError || error instanceof CatalogInvalidStateError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "MENU_INVALID_STATE",
        requestId,
        message: error.message,
      },
    };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
