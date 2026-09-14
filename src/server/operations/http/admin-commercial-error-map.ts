/** Commercial Admin HTTP error → safe envelope (IMP-036F F6A). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import { AdministrationError } from "../../administration/errors";
import { OrganizationNotFoundError } from "../../organization";
import { WorkforcePrincipalError } from "../../access-control/principal";

export type CommercialAdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
  issues?: readonly string[];
}>;

export type MappedCommercialAdminError = Readonly<{
  status: number;
  body: CommercialAdminErrorBody;
}>;

export function mapCommercialAdminError(
  error: unknown,
  requestId: string,
): MappedCommercialAdminError {
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "COMMERCIAL_UNAUTHORIZED", requestId } };
  }

  if (error instanceof WorkforcePrincipalError) {
    return {
      status: 401,
      body: { ok: false, code: "WORKFORCE_AUTH_REQUIRED", requestId },
    };
  }

  if (error instanceof AdministrationError) {
    if (error.code === "WORKFORCE_AUTH_REQUIRED") {
      return { status: 401, body: { ok: false, code: error.code, requestId } };
    }
    if (error.code === "ADMIN_UNAUTHORIZED" || error.code === "ADMIN_FORBIDDEN") {
      return { status: 403, body: { ok: false, code: "COMMERCIAL_UNAUTHORIZED", requestId } };
    }
    if (error.code === "ADMIN_NOT_FOUND") {
      return { status: 404, body: { ok: false, code: "COMMERCIAL_NOT_FOUND", requestId } };
    }
    if (error.code === "ADMIN_REQUEST_INVALID") {
      return {
        status: 400,
        body: {
          ok: false,
          code: "COMMERCIAL_REQUEST_INVALID",
          requestId,
          field: error.field,
          message: error.message,
          issues: [error.message],
        },
      };
    }
    return {
      status: 409,
      body: { ok: false, code: error.code, requestId, message: error.message },
    };
  }

  if (error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "COMMERCIAL_NOT_FOUND", requestId } };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
