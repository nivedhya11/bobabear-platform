/** Assortment commercial Admin HTTP error → safe envelope (IMP-036F F4). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import {
  AssortmentConflictError,
  AssortmentInvalidStateError,
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "../../assortment";
import { OrganizationNotFoundError } from "../../organization";

export type AssortmentAdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
  issues?: readonly string[];
}>;

export type MappedAssortmentAdminError = Readonly<{
  status: number;
  body: AssortmentAdminErrorBody;
}>;

export function mapAssortmentAdminError(
  error: unknown,
  requestId: string,
): MappedAssortmentAdminError {
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "ASSORTMENT_UNAUTHORIZED", requestId } };
  }

  if (error instanceof AssortmentNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "ASSORTMENT_NOT_FOUND", requestId } };
  }

  if (error instanceof AssortmentValidationError) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "ASSORTMENT_REQUEST_INVALID",
        requestId,
        message: error.message,
        issues: [error.message],
      },
    };
  }

  if (error instanceof AssortmentConflictError) {
    const code =
      error.assortmentErrorCode === "ASSORTMENT_STALE_REVISION"
        ? "ASSORTMENT_STALE_REVISION"
        : "ASSORTMENT_CONFLICT";
    return {
      status: 409,
      body: { ok: false, code, requestId, message: error.message },
    };
  }

  if (error instanceof AssortmentInvalidStateError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "ASSORTMENT_INVALID_STATE",
        requestId,
        message: error.message,
      },
    };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
