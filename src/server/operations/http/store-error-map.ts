/** Store Operations error → safe HTTP envelope (IMP-036E). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import {
  AssortmentConflictError,
  AssortmentInvalidStateError,
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "../../assortment";
import { OrganizationNotFoundError } from "../../organization";
import { ServiceabilityError } from "../../serviceability";

export type StoreOperationsErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
}>;

export type MappedStoreError = Readonly<{
  status: number;
  body: StoreOperationsErrorBody;
}>;

const SERVICEABILITY_STATUSES: Readonly<Record<string, number>> = {
  SERVICEABILITY_UNAUTHENTICATED: 401,
  SERVICEABILITY_UNAUTHORIZED: 403,
  SERVICEABILITY_OUTLET_NOT_FOUND: 404,
  SERVICEABILITY_VALIDATION_ERROR: 400,
  SERVICEABILITY_POSTAL_CODE_INVALID: 400,
  SERVICEABILITY_COORDINATES_INVALID: 400,
  SERVICEABILITY_FORBIDDEN_FIELD: 400,
  SERVICEABILITY_ROUTING_PRIORITY_INVALID: 400,
  SERVICEABILITY_CONFIGURATION_CONFLICT: 409,
  SERVICEABILITY_ROUTING_PRIORITY_REQUIRED: 409,
  SERVICEABILITY_PERSISTENCE_ERROR: 500,
  SERVICEABILITY_AUDIT_ERROR: 500,
};

export function mapStoreOperationsError(error: unknown, requestId: string): MappedStoreError {
  if (error instanceof ServiceabilityError) {
    const status = SERVICEABILITY_STATUSES[error.code] ?? 500;
    if (status === 500) {
      return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
    }
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
    return { status: 403, body: { ok: false, code: "STORE_UNAUTHORIZED", requestId } };
  }

  if (error instanceof AssortmentNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "STORE_NOT_FOUND", requestId } };
  }

  if (error instanceof AssortmentValidationError) {
    return { status: 400, body: { ok: false, code: "STORE_REQUEST_INVALID", requestId } };
  }

  if (error instanceof AssortmentConflictError) {
    return { status: 409, body: { ok: false, code: "STORE_CONFLICT", requestId } };
  }

  if (error instanceof AssortmentInvalidStateError) {
    return { status: 409, body: { ok: false, code: "STORE_INVALID_STATE", requestId } };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
