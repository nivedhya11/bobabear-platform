/**
 * Operations Notification support client (IMP-036D).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";

export type OperationsNotificationItem = Readonly<{
  notificationRequestId: string;
  semanticType: string;
  channel: string;
  status: string;
  attemptCount: string;
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
  suppressionReason: string | null;
  reviewReason: string | null;
  resendPermitted: boolean;
}>;

type ListEnvelope = Readonly<{
  ok: true;
  items: readonly OperationsNotificationItem[];
}>;

type ResendEnvelope = Readonly<{
  ok: true;
  notification: OperationsNotificationItem;
}>;

export function notificationStatusLabel(status: string): string {
  if (status === "PENDING") return "Queued";
  if (status === "SENDING") return "Sending";
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Failed";
  if (status === "REVIEW_REQUIRED") return "Needs review";
  if (status === "SUPPRESSED") return "Suppressed";
  return status;
}

export async function getOrderNotifications(
  orderId: string,
): Promise<OperationsHttpResult<{ items: readonly OperationsNotificationItem[] }>> {
  const result = await operationsRequest<ListEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}/notifications`,
  );
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { items: result.data.items } };
}

export async function resendOrderNotification(
  orderId: string,
  notificationRequestId: string,
  reason: string,
): Promise<OperationsHttpResult<{ notification: OperationsNotificationItem }>> {
  const result = await operationsRequest<ResendEnvelope>(
    `/api/operations/v1/orders/${encodeURIComponent(orderId)}/notifications/${encodeURIComponent(notificationRequestId)}/resend`,
    { method: "POST", body: { reason } },
  );
  if (!result.ok) return result;
  return {
    ok: true,
    status: result.status,
    data: { notification: result.data.notification },
  };
}
