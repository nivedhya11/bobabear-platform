/**
 * Workforce Operations Order list client (IMP-030).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";
import type { ListWorkforceOrdersInput, OperationsOrderSummary } from "./types";

type ListEnvelope = Readonly<{
  ok: true;
  items: readonly OperationsOrderSummary[];
  nextCursor: string | null;
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

export { SUPPORTED_QUERY_KEYS };
