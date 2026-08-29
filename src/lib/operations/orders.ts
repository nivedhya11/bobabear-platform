/**
 * Workforce Operations Order list/detail/mutation client (IMP-030).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";
import type {
  ListWorkforceOrdersInput,
  OperationsCancellationReasonCode,
  OperationsOrderDetail,
  OperationsOrderDestination,
  OperationsOrderLine,
  OperationsOrderMoney,
  OperationsOrderMutationResult,
  OperationsOrderSummary,
  OperationsOutletSummary,
} from "./types";

type ListEnvelope = Readonly<{
  ok: true;
  items: readonly OperationsOrderSummary[];
  nextCursor: string | null;
}>;

type DetailEnvelope = Readonly<{
  ok: true;
  order: unknown;
}>;

type MutationEnvelope = Readonly<{
  ok: true;
  order: unknown;
}>;

const SUPPORTED_QUERY_KEYS = [
  "orderNumber",
  "status",
  "createdFrom",
  "createdTo",
  "brandId",
  "outletId",
  "cursor",
  "limit",
] as const;

/** Matches accepted Order UUID resource-shape (`shared/order/canonicalize.assertOrderUuid`). */
const OPERATIONS_ORDER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOperationsOrderUuid(value: string): boolean {
  return OPERATIONS_ORDER_UUID_RE.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseMoney(value: unknown): OperationsOrderMoney | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.grandTotalMinor !== "string" || typeof value.currency !== "string") {
    return null;
  }
  return { grandTotalMinor: value.grandTotalMinor, currency: value.currency };
}

function parseOutlet(value: unknown): OperationsOutletSummary | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.outletId !== "string" ||
    typeof value.brandId !== "string" ||
    typeof value.code !== "string" ||
    typeof value.name !== "string"
  ) {
    return null;
  }
  return {
    outletId: value.outletId,
    brandId: value.brandId,
    code: value.code,
    name: value.name,
  };
}

function parseDestination(value: unknown): OperationsOrderDestination | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.recipientName !== "string" ||
    typeof value.recipientPhone !== "string" ||
    typeof value.addressLine1 !== "string" ||
    typeof value.city !== "string" ||
    typeof value.stateCode !== "string" ||
    typeof value.postalCode !== "string" ||
    !isNullableString(value.addressLine2) ||
    !isNullableString(value.landmark) ||
    !isNullableString(value.locality) ||
    !isNullableString(value.label)
  ) {
    return null;
  }
  return {
    recipientName: value.recipientName,
    recipientPhone: value.recipientPhone,
    addressLine1: value.addressLine1,
    addressLine2: value.addressLine2,
    landmark: value.landmark,
    locality: value.locality,
    city: value.city,
    stateCode: value.stateCode,
    postalCode: value.postalCode,
    label: value.label,
  };
}

function parseModifier(
  value: unknown,
): Readonly<{ groupName: string; optionName: string; quantity: number }> | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.groupName !== "string" ||
    typeof value.optionName !== "string" ||
    typeof value.quantity !== "number" ||
    !Number.isFinite(value.quantity)
  ) {
    return null;
  }
  return {
    groupName: value.groupName,
    optionName: value.optionName,
    quantity: value.quantity,
  };
}

function parseLine(value: unknown): OperationsOrderLine | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.productName !== "string" ||
    typeof value.variantName !== "string" ||
    typeof value.quantity !== "number" ||
    !Number.isFinite(value.quantity) ||
    typeof value.lineTotalMinor !== "string" ||
    !Array.isArray(value.modifiers)
  ) {
    return null;
  }
  const modifiers: Array<Readonly<{ groupName: string; optionName: string; quantity: number }>> = [];
  for (const modifier of value.modifiers) {
    const parsed = parseModifier(modifier);
    if (!parsed) return null;
    modifiers.push(parsed);
  }
  return {
    productName: value.productName,
    variantName: value.variantName,
    quantity: value.quantity,
    lineTotalMinor: value.lineTotalMinor,
    modifiers,
  };
}

/**
 * Runtime guard for the accepted Operations detail projection.
 * Does not invent defaults; returns null when the value is unsafe to render.
 */
export function parseOperationsOrderDetail(value: unknown): OperationsOrderDetail | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.orderId !== "string" ||
    typeof value.orderNumber !== "string" ||
    typeof value.status !== "string" ||
    typeof value.revision !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    typeof value.paymentProvenanceKind !== "string" ||
    !isNullableString(value.acceptedAt) ||
    !isNullableString(value.fulfilledAt) ||
    !isNullableString(value.cancelledAt) ||
    !isNullableString(value.acceptedByWorkforceUserId) ||
    !isNullableString(value.fulfilledByWorkforceUserId) ||
    !isNullableString(value.cancelledByWorkforceUserId) ||
    !isNullableString(value.cancellationReasonCode) ||
    !Array.isArray(value.lines)
  ) {
    return null;
  }

  const money = parseMoney(value.money);
  const outlet = parseOutlet(value.outlet);
  const destination = parseDestination(value.destination);
  if (!money || !outlet || !destination) return null;

  const lines: OperationsOrderLine[] = [];
  for (const line of value.lines) {
    const parsed = parseLine(line);
    if (!parsed) return null;
    lines.push(parsed);
  }

  return {
    orderId: value.orderId,
    orderNumber: value.orderNumber,
    status: value.status,
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    acceptedAt: value.acceptedAt,
    fulfilledAt: value.fulfilledAt,
    cancelledAt: value.cancelledAt,
    money,
    outlet,
    paymentProvenanceKind: value.paymentProvenanceKind,
    acceptedByWorkforceUserId: value.acceptedByWorkforceUserId,
    fulfilledByWorkforceUserId: value.fulfilledByWorkforceUserId,
    cancelledByWorkforceUserId: value.cancelledByWorkforceUserId,
    cancellationReasonCode: value.cancellationReasonCode,
    destination,
    lines,
  };
}

/**
 * Runtime guard for the accepted Operations mutation success projection.
 * Does not invent defaults; returns null when the value is unsafe to use.
 */
export function parseOperationsOrderMutationResult(
  value: unknown,
): OperationsOrderMutationResult | null {
  if (!isPlainObject(value)) return null;
  if (
    typeof value.orderId !== "string" ||
    typeof value.orderNumber !== "string" ||
    typeof value.status !== "string" ||
    typeof value.revision !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }
  if (value.revision.length === 0) return null;

  const result: {
    orderId: string;
    orderNumber: string;
    status: string;
    revision: string;
    updatedAt: string;
    acceptedAt?: string | null;
    fulfilledAt?: string | null;
    cancelledAt?: string | null;
    cancellationReasonCode?: string | null;
  } = {
    orderId: value.orderId,
    orderNumber: value.orderNumber,
    status: value.status,
    revision: value.revision,
    updatedAt: value.updatedAt,
  };

  if ("acceptedAt" in value) {
    if (!isNullableString(value.acceptedAt)) return null;
    result.acceptedAt = value.acceptedAt;
  }
  if ("fulfilledAt" in value) {
    if (!isNullableString(value.fulfilledAt)) return null;
    result.fulfilledAt = value.fulfilledAt;
  }
  if ("cancelledAt" in value) {
    if (!isNullableString(value.cancelledAt)) return null;
    result.cancelledAt = value.cancelledAt;
  }
  if ("cancellationReasonCode" in value) {
    if (!isNullableString(value.cancellationReasonCode)) return null;
    result.cancellationReasonCode = value.cancellationReasonCode;
  }

  return result;
}

function buildListQuery(input: ListWorkforceOrdersInput): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const key of SUPPORTED_QUERY_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (key === "limit") {
      query.limit = String(value);
      continue;
    }
    const stringValue = String(value).trim();
    if (stringValue.length > 0) query[key] = stringValue;
  }
  return query;
}

export async function listWorkforceOrders(
  input: ListWorkforceOrdersInput = {},
): Promise<
  OperationsHttpResult<{ items: readonly OperationsOrderSummary[]; nextCursor: string | null }>
> {
  const result = await operationsRequest<ListEnvelope>("/api/operations/v1/orders", {
    method: "GET",
    query: buildListQuery(input),
  });
  if (!result.ok) return result;
  if (!Array.isArray(result.data.items)) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return {
    ok: true,
    status: result.status,
    data: {
      items: result.data.items,
      nextCursor: result.data.nextCursor ?? null,
    },
  };
}

export async function getWorkforceOrder(
  orderId: string,
): Promise<OperationsHttpResult<{ order: OperationsOrderDetail }>> {
  const result = await operationsRequest<DetailEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );
  if (!result.ok) return result;
  const order = parseOperationsOrderDetail(result.data.order);
  if (!order) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { order } };
}

async function postLifecycleMutation(
  orderId: string,
  action: "accept" | "fulfil" | "cancel",
  body: Readonly<Record<string, string>>,
): Promise<OperationsHttpResult<{ order: OperationsOrderMutationResult }>> {
  const result = await operationsRequest<MutationEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}/${action}`,
    { method: "POST", body },
  );
  if (!result.ok) return result;
  const order = parseOperationsOrderMutationResult(result.data.order);
  if (!order) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return { ok: true, status: result.status, data: { order } };
}

export async function acceptWorkforceOrder(
  orderId: string,
  expectedOrderRevision: string,
): Promise<OperationsHttpResult<{ order: OperationsOrderMutationResult }>> {
  return postLifecycleMutation(orderId, "accept", { expectedOrderRevision });
}

export async function fulfilWorkforceOrder(
  orderId: string,
  expectedOrderRevision: string,
): Promise<OperationsHttpResult<{ order: OperationsOrderMutationResult }>> {
  return postLifecycleMutation(orderId, "fulfil", { expectedOrderRevision });
}

export async function cancelWorkforceOrder(
  orderId: string,
  expectedOrderRevision: string,
  cancellationReasonCode: OperationsCancellationReasonCode,
): Promise<OperationsHttpResult<{ order: OperationsOrderMutationResult }>> {
  return postLifecycleMutation(orderId, "cancel", {
    expectedOrderRevision,
    cancellationReasonCode,
  });
}

export { SUPPORTED_QUERY_KEYS };
