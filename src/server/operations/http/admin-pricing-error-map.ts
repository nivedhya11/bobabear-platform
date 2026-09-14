/** Pricing commercial Admin HTTP error → safe envelope (IMP-036F F4). */
import "server-only";

import { AuthorizationError } from "../../access-control";
import { OrganizationNotFoundError } from "../../organization";
import {
  PricingConflictError,
  PricingInvalidStateError,
  PricingNotFoundError,
  PricingValidationError,
} from "../../pricing";

export type PricingAdminErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  message?: string;
  issues?: readonly string[];
}>;

export type MappedPricingAdminError = Readonly<{
  status: number;
  body: PricingAdminErrorBody;
}>;

export function mapPricingAdminError(error: unknown, requestId: string): MappedPricingAdminError {
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { ok: false, code: "PRICING_UNAUTHORIZED", requestId } };
  }

  if (error instanceof PricingNotFoundError || error instanceof OrganizationNotFoundError) {
    return { status: 404, body: { ok: false, code: "PRICING_NOT_FOUND", requestId } };
  }

  if (error instanceof PricingValidationError) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "PRICING_REQUEST_INVALID",
        requestId,
        message: error.message,
        issues: [error.message],
      },
    };
  }

  if (error instanceof PricingConflictError) {
    const code =
      error.pricingErrorCode === "PRICE_BOOK_STALE_REVISION"
        ? "PRICE_BOOK_STALE_REVISION"
        : error.pricingErrorCode === "TARIFF_STALE_REVISION"
          ? "TARIFF_STALE_REVISION"
          : error.pricingErrorCode === "PRICE_BOOK_OVERLAP"
            ? "PRICE_BOOK_OVERLAP"
            : "PRICING_CONFLICT";
    return {
      status: 409,
      body: { ok: false, code, requestId, message: error.message },
    };
  }

  if (error instanceof PricingInvalidStateError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "PRICING_INVALID_STATE",
        requestId,
        message: error.message,
      },
    };
  }

  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
