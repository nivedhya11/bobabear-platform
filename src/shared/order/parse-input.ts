/**
 * Order input parsing (IMP-023).
 *
 * Transport schemas reject unknown fields. Revision transport is string-only
 * `/^[1-9][0-9]*$/` — never Number coercion.
 */

import {
  DEFAULT_ORDER_LIST_LIMIT,
  MAX_ORDER_LIST_LIMIT,
} from "./constants";
import {
  assertCanonicalOrderNumber,
  assertOrderUuid,
  parseOrderRevisionTransport,
  requireCancellationReasonCode,
  requireOrderStatus,
  requirePositiveOrderRevision,
} from "./canonicalize";
import { OrderError } from "./errors";
import type {
  AcceptOrderInput,
  CancelOrderInput,
  FulfilOrderInput,
  GetCustomerOrderInput,
  GetWorkforceOrderInput,
  ListCustomerOrdersInput,
  OrderRecoveryCursor,
  RecoverMissingOrdersBatchInput,
  SearchWorkforceOrdersInput,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        `Unknown field '${key}' is not permitted on ${context}.`,
        { field: key },
      );
    }
  }
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    if (value > MAX_ORDER_LIST_LIMIT) {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        `limit must be between 1 and ${MAX_ORDER_LIST_LIMIT}.`,
        { field: "limit" },
      );
    }
    return value;
  }
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) {
    const n = Number(value);
    if (n > MAX_ORDER_LIST_LIMIT) {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        `limit must be between 1 and ${MAX_ORDER_LIST_LIMIT}.`,
        { field: "limit" },
      );
    }
    return n;
  }
  throw new OrderError(
    "ORDER_REQUEST_INVALID",
    "limit must be a positive integer.",
    { field: "limit" },
  );
}

function optionalCursorString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrderError(
      "ORDER_CURSOR_INVALID",
      "cursor must be a non-empty string.",
      { field: "cursor" },
    );
  }
  return value;
}

function optionalIsoDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must be an ISO-8601 timestamp string.`,
      { field },
    );
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      `${field} must be a valid timestamp.`,
      { field },
    );
  }
  return d;
}

/**
 * Transport accept body: `{ "expectedOrderRevision": "1" }` plus orderId
 * supplied by the application caller (path / domain arg).
 */
export function parseAcceptOrderInput(
  orderId: unknown,
  body: unknown,
): AcceptOrderInput {
  const id = assertOrderUuid(orderId, "orderId");
  if (!isPlainObject(body)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "acceptOrder body must be an object.",
    );
  }
  rejectUnknownKeys(body, ["expectedOrderRevision"], "acceptOrder");
  return Object.freeze({
    orderId: id,
    expectedOrderRevision: parseOrderRevisionTransport(
      body.expectedOrderRevision,
    ),
  });
}

export function parseFulfilOrderInput(
  orderId: unknown,
  body: unknown,
): FulfilOrderInput {
  const id = assertOrderUuid(orderId, "orderId");
  if (!isPlainObject(body)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "fulfilOrder body must be an object.",
    );
  }
  rejectUnknownKeys(body, ["expectedOrderRevision"], "fulfilOrder");
  return Object.freeze({
    orderId: id,
    expectedOrderRevision: parseOrderRevisionTransport(
      body.expectedOrderRevision,
    ),
  });
}

export function parseCancelOrderInput(
  orderId: unknown,
  body: unknown,
): CancelOrderInput {
  const id = assertOrderUuid(orderId, "orderId");
  if (!isPlainObject(body)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "cancelOrder body must be an object.",
    );
  }
  rejectUnknownKeys(
    body,
    ["expectedOrderRevision", "cancellationReasonCode"],
    "cancelOrder",
  );
  return Object.freeze({
    orderId: id,
    expectedOrderRevision: parseOrderRevisionTransport(
      body.expectedOrderRevision,
    ),
    cancellationReasonCode: requireCancellationReasonCode(
      body.cancellationReasonCode,
    ),
  });
}

/** Domain-form accept (orderId + revision already structured). */
export function parseAcceptOrderDomainInput(input: unknown): AcceptOrderInput {
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "acceptOrder input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["orderId", "expectedOrderRevision"],
    "acceptOrder",
  );
  return Object.freeze({
    orderId: assertOrderUuid(input.orderId, "orderId"),
    expectedOrderRevision: requirePositiveOrderRevision(
      input.expectedOrderRevision,
    ),
  });
}

export function parseFulfilOrderDomainInput(input: unknown): FulfilOrderInput {
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "fulfilOrder input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["orderId", "expectedOrderRevision"],
    "fulfilOrder",
  );
  return Object.freeze({
    orderId: assertOrderUuid(input.orderId, "orderId"),
    expectedOrderRevision: requirePositiveOrderRevision(
      input.expectedOrderRevision,
    ),
  });
}

export function parseCancelOrderDomainInput(input: unknown): CancelOrderInput {
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "cancelOrder input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    ["orderId", "expectedOrderRevision", "cancellationReasonCode"],
    "cancelOrder",
  );
  return Object.freeze({
    orderId: assertOrderUuid(input.orderId, "orderId"),
    expectedOrderRevision: requirePositiveOrderRevision(
      input.expectedOrderRevision,
    ),
    cancellationReasonCode: requireCancellationReasonCode(
      input.cancellationReasonCode,
    ),
  });
}

export function parseGetCustomerOrderInput(
  input: unknown,
): GetCustomerOrderInput {
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "getCustomerOrder input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["orderId"], "getCustomerOrder");
  return Object.freeze({
    orderId: assertOrderUuid(input.orderId, "orderId"),
  });
}

export function parseListCustomerOrdersInput(
  input: unknown,
): ListCustomerOrdersInput {
  if (input === undefined || input === null) {
    return Object.freeze({ limit: DEFAULT_ORDER_LIST_LIMIT });
  }
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "listCustomerOrders input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["cursor", "limit"], "listCustomerOrders");
  return Object.freeze({
    ...(optionalCursorString(input.cursor) !== undefined
      ? { cursor: optionalCursorString(input.cursor) }
      : {}),
    limit: optionalLimit(input.limit) ?? DEFAULT_ORDER_LIST_LIMIT,
  });
}

export function parseGetWorkforceOrderInput(
  input: unknown,
): GetWorkforceOrderInput {
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "getWorkforceOrder input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["orderId"], "getWorkforceOrder");
  return Object.freeze({
    orderId: assertOrderUuid(input.orderId, "orderId"),
  });
}

export function parseSearchWorkforceOrdersInput(
  input: unknown,
): SearchWorkforceOrdersInput {
  if (input === undefined || input === null) {
    return Object.freeze({ limit: DEFAULT_ORDER_LIST_LIMIT });
  }
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "searchWorkforceOrders input must be an object.",
    );
  }
  rejectUnknownKeys(
    input,
    [
      "orderNumber",
      "status",
      "createdFrom",
      "createdTo",
      "brandId",
      "outletId",
      "cursor",
      "limit",
    ],
    "searchWorkforceOrders",
  );

  const result: {
    orderNumber?: string;
    status?: ReturnType<typeof requireOrderStatus>;
    createdFrom?: Date;
    createdTo?: Date;
    brandId?: string;
    outletId?: string;
    cursor?: string;
    limit: number;
  } = {
    limit: optionalLimit(input.limit) ?? DEFAULT_ORDER_LIST_LIMIT,
  };

  if (input.orderNumber !== undefined) {
    if (typeof input.orderNumber !== "string") {
      throw new OrderError(
        "ORDER_REQUEST_INVALID",
        "orderNumber must be a string.",
        { field: "orderNumber" },
      );
    }
    result.orderNumber = assertCanonicalOrderNumber(input.orderNumber);
  }
  if (input.status !== undefined) {
    result.status = requireOrderStatus(input.status);
  }
  const createdFrom = optionalIsoDate(input.createdFrom, "createdFrom");
  if (createdFrom) result.createdFrom = createdFrom;
  const createdTo = optionalIsoDate(input.createdTo, "createdTo");
  if (createdTo) result.createdTo = createdTo;
  if (input.brandId !== undefined) {
    result.brandId = assertOrderUuid(input.brandId, "brandId");
  }
  if (input.outletId !== undefined) {
    result.outletId = assertOrderUuid(input.outletId, "outletId");
  }
  const cursor = optionalCursorString(input.cursor);
  if (cursor) result.cursor = cursor;

  return Object.freeze(result);
}

export function parseRecoverMissingOrdersBatchInput(
  input: unknown,
): RecoverMissingOrdersBatchInput {
  if (input === undefined || input === null) {
    return Object.freeze({});
  }
  if (!isPlainObject(input)) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "recoverMissingOrdersBatch input must be an object.",
    );
  }
  rejectUnknownKeys(input, ["cursor"], "recoverMissingOrdersBatch");
  if (input.cursor === undefined) {
    return Object.freeze({});
  }
  if (!isPlainObject(input.cursor)) {
    throw new OrderError(
      "ORDER_CURSOR_INVALID",
      "recovery cursor must be an object.",
      { field: "cursor" },
    );
  }
  rejectUnknownKeys(
    input.cursor,
    ["lastCheckoutUpdatedAt", "lastCheckoutId"],
    "recoveryCursor",
  );
  const updatedAt = input.cursor.lastCheckoutUpdatedAt;
  const checkoutId = input.cursor.lastCheckoutId;
  let lastCheckoutUpdatedAt: Date;
  if (updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime())) {
    lastCheckoutUpdatedAt = updatedAt;
  } else if (typeof updatedAt === "string") {
    lastCheckoutUpdatedAt = optionalIsoDate(updatedAt, "lastCheckoutUpdatedAt")!;
  } else {
    throw new OrderError(
      "ORDER_CURSOR_INVALID",
      "lastCheckoutUpdatedAt must be a Date or ISO string.",
      { field: "lastCheckoutUpdatedAt" },
    );
  }
  const cursor: OrderRecoveryCursor = Object.freeze({
    lastCheckoutUpdatedAt,
    lastCheckoutId: assertOrderUuid(checkoutId, "lastCheckoutId"),
  });
  return Object.freeze({ cursor });
}

/** Encode customer/workforce list cursor (createdAt + id). */
export function encodeOrderListCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    "utf8",
  ).toString("base64url");
}

export function decodeOrderListCursor(
  cursor: string,
): Readonly<{ createdAt: Date; id: string }> {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { createdAt?: unknown; id?: unknown };
    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      throw new Error("shape");
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error("date");
    return Object.freeze({
      createdAt,
      id: assertOrderUuid(parsed.id, "cursor.id"),
    });
  } catch {
    throw new OrderError(
      "ORDER_CURSOR_INVALID",
      "Order list cursor is malformed.",
      { field: "cursor" },
    );
  }
}
