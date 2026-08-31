/**
 * Operations Delivery HTTP client (IMP-032).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";

export type OperationsDeliveryDetail = Readonly<{
  delivery: Readonly<{
    id: string;
    orderId: string;
    status: string;
    revision: string;
    bookingCorrelationId: string | null;
    provider: string | null;
    externalBookingReference: string | null;
    updatedAt: string;
  }>;
  activeAssignment: Readonly<{
    assignmentKey: string;
    courierReference: string | null;
  }> | null;
  trackingUrl: string | null;
  providerCosts: readonly Readonly<{
    kind: string;
    amountPaise: string;
  }>[];
  activeReturn: unknown | null;
  permittedCommands: readonly string[];
}>;

type DeliveryEnvelope = Readonly<{
  ok: true;
  delivery: OperationsDeliveryDetail | null;
}>;

type CommandEnvelope = Readonly<{
  ok: true;
  result: unknown;
}>;

export async function getWorkforceDelivery(
  orderId: string,
): Promise<OperationsHttpResult<{ delivery: OperationsDeliveryDetail | null }>> {
  const result = await operationsRequest<DeliveryEnvelope>(
    `/api/operations/v1/orders/${orderId}/delivery`,
  );
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { delivery: result.data.delivery ?? null } };
}

function stringifyBody(payload: Record<string, unknown>): Record<string, string> {
  const body: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    body[key] = typeof value === "string" ? value : String(value);
  }
  return body;
}

export async function postDeliveryCommand(
  orderId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<OperationsHttpResult<{ result: unknown }>> {
  const result = await operationsRequest<CommandEnvelope>(
    `/api/operations/v1/orders/${orderId}/delivery/${action}`,
    { method: "POST", body: stringifyBody(payload) },
  );
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { result: result.data.result } };
}
