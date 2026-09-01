/**
 * Domain error → HTTP status / commerce error envelope (IMP-024 / D-360 / IMP-028).
 *
 * Never invents business codes. Never emits message/stack/retryable.
 */
import "server-only";

import { CartError } from "../../../shared/cart";
import { CustomerMenuError } from "../../../shared/customer-menu/errors";
import { CheckoutError } from "../../../shared/checkout";
import { CustomerAddressError } from "../../../shared/customer-addresses";
import { CustomerProfileError } from "../../../shared/customer-profiles";
import { ServiceabilityError } from "../../../shared/serviceability";
import { FinancialDocumentError } from "../../../shared/financial-document";
import { OrderError } from "../../../shared/order";
import { PaymentError } from "../../../shared/payment";
import { PricingResolutionError } from "../../pricing/errors";
import { LocationError } from "../location/errors";

export type CommerceErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
  resolutionOptions?: readonly string[];
}>;

export type MappedCommerceError = Readonly<{
  status: number;
  body: CommerceErrorBody;
}>;

const STATUS_401 = new Set(["CUSTOMER_AUTH_REQUIRED"]);

const STATUS_404 = new Set([
  "CART_NOT_FOUND",
  "CART_LINE_NOT_FOUND",
  "CHECKOUT_NOT_FOUND",
  "PAYMENT_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "DOCUMENT_NOT_FOUND",
  "CUSTOMER_ADDRESS_NOT_FOUND",
  "CUSTOMER_PROFILE_ACCESS_DENIED",
  "CUSTOMER_PROFILE_NOT_FOUND",
  "CART_COUPON_UNKNOWN",
  "MENU_UNAVAILABLE",
  "OUTLET_NOT_FOUND",
]);

const STATUS_410 = new Set(["CART_EXPIRED", "CHECKOUT_EXPIRED", "PAYMENT_EXPIRED"]);

const STATUS_409 = new Set([
  "CART_CONFLICT",
  "CART_RECONCILIATION_CONFLICT",
  "CHECKOUT_CONFLICT",
  "CHECKOUT_STATE_CONFLICT",
  "CHECKOUT_CART_CHANGED",
  "CHECKOUT_REPRICED",
  "CHECKOUT_DESTINATION_REQUIRED",
  "CHECKOUT_EMPTY_CART",
  "PAYMENT_CONFLICT",
  "PAYMENT_STATE_CONFLICT",
  "PAYMENT_ALREADY_PROCESSING",
  "PAYMENT_TERMINAL",
  "PAYMENT_UNRESOLVED_ATTEMPT",
  "PAYMENT_IDEMPOTENCY_CONFLICT",
  "PAYMENT_CHECKOUT_NOT_READY",
  "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
  "PAYMENT_ZERO_PAYABLE_INVALID",
  "PAYMENT_NEGATIVE_PAYABLE",
  "CUSTOMER_PROFILE_ALREADY_EXISTS",
]);

const STATUS_422 = new Set(["CART_ITEM_NOT_ORDERABLE", "PRICE_MISSING"]);

const STATUS_503 = new Set([
  "CART_DEPENDENCY_UNAVAILABLE",
  "CHECKOUT_DEPENDENCY_INDETERMINATE",
  "LOCATION_PROVIDER_UNAVAILABLE",
]);

const STATUS_500 = new Set([
  "CART_POLICY_INVALID",
  "PAYMENT_POLICY_INVALID",
  "INTERNAL_ERROR",
  "AUTHORITY_INCONSISTENT",
  "ARTIFACT_GENERATION_FAILED",
  "RENDERING_FAILED",
  "RENDERING_AUTHORITY_GAP",
]);

function statusForCode(code: string): number {
  if (STATUS_401.has(code)) return 401;
  if (STATUS_404.has(code) || code === "LOCATION_NO_RESULTS") return 404;
  if (STATUS_410.has(code)) return 410;
  if (STATUS_409.has(code)) return 409;
  if (STATUS_422.has(code)) return 422;
  if (code === "LOCATION_RATE_LIMITED") return 429;
  if (STATUS_503.has(code)) return 503;
  if (STATUS_500.has(code)) return 500;
  // Default remaining accepted invalid-input / validation codes to 400.
  return 400;
}

function extractDomainError(error: unknown): {
  code: string;
  field?: string;
  resolutionOptions?: readonly string[];
} | null {
  if (error instanceof CartError) {
    return {
      code: error.code,
      field: error.field,
      resolutionOptions: error.resolutionOptions,
    };
  }
  if (error instanceof CheckoutError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof PaymentError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof OrderError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof CustomerProfileError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof CustomerAddressError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof ServiceabilityError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof FinancialDocumentError) {
    // Envelope carries code only — never message / prior ids / sealed PII.
    return { code: error.code };
  }
  if (error instanceof CustomerMenuError) {
    return { code: error.code, field: error.field };
  }
  if (error instanceof PricingResolutionError) {
    return { code: error.pricingErrorCode };
  }
  if (error instanceof LocationError) {
    return { code: error.code, field: error.field };
  }
  return null;
}

export function mapCommerceError(error: unknown, requestId: string): MappedCommerceError {
  const domain = extractDomainError(error);
  if (!domain) {
    return {
      status: 500,
      body: { ok: false, code: "INTERNAL_ERROR", requestId },
    };
  }

  const body: {
    ok: false;
    code: string;
    requestId: string;
    field?: string;
    resolutionOptions?: readonly string[];
  } = {
    ok: false,
    code: domain.code,
    requestId,
  };
  if (domain.field !== undefined) body.field = domain.field;
  if (domain.resolutionOptions !== undefined) {
    body.resolutionOptions = domain.resolutionOptions;
  }

  return {
    status: statusForCode(domain.code),
    body,
  };
}

export function mapInvalidRequest(requestId: string, code = "INVALID_REQUEST"): MappedCommerceError {
  return {
    status: 400,
    body: { ok: false, code, requestId },
  };
}
