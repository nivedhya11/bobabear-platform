/** Administration error → safe HTTP envelope (IMP-035). */
import "server-only";

import {
  AccessControlConflictError,
  AccessControlInvalidTransitionError,
  AccessControlNotFoundError,
  AccessControlValidationError,
  AuthorizationError,
  DelegationCeilingError,
  LastPlatformAdminError,
  SelfElevationError,
} from "../../access-control";
import {
  OrganizationConflictError,
  OrganizationNotFoundError,
  OrganizationValidationError,
} from "../../organization";
import { AdministrationError } from "../../administration/errors";

export type AdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
}>;

export type MappedAdminError = Readonly<{
  status: number;
  body: AdminErrorBody;
}>;

export function mapAdminError(error: unknown, requestId: string): MappedAdminError {
  if (error instanceof AdministrationError) {
    const status =
      error.code === "WORKFORCE_AUTH_REQUIRED"
        ? 401
        : error.code === "ADMIN_UNAUTHORIZED" || error.code === "ADMIN_FORBIDDEN"
          ? 403
          : error.code === "ADMIN_NOT_FOUND"
            ? 404
            : error.code === "ADMIN_CONFLICT"
              ? 409
              : 400;
    return {
      status,
      body: {
        ok: false,
        code: error.code,
        requestId,
        ...(error.field !== undefined ? { field: error.field } : {}),
      },
    };
  }
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "ADMIN_UNAUTHORIZED", requestId } };
  }
  if (
    error instanceof DelegationCeilingError ||
    error instanceof SelfElevationError ||
    error instanceof LastPlatformAdminError
  ) {
    return { status: 403, body: { ok: false, code: "ADMIN_FORBIDDEN", requestId } };
  }
  if (error instanceof AccessControlNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "ADMIN_NOT_FOUND", requestId } };
  }
  if (error instanceof AccessControlConflictError || error instanceof OrganizationConflictError) {
    return { status: 409, body: { ok: false, code: "ADMIN_CONFLICT", requestId } };
  }
  if (
    error instanceof AccessControlValidationError ||
    error instanceof AccessControlInvalidTransitionError ||
    error instanceof OrganizationValidationError
  ) {
    return { status: 400, body: { ok: false, code: "ADMIN_REQUEST_INVALID", requestId } };
  }
  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
