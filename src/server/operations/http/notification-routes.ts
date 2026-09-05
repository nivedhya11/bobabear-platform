/**
 * Operations Notification support HTTP routes (IMP-036D).
 *
 * Resource-specific Outlet authorization precedes existing manual resend.
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import type { WorkforceAuthRuntime } from "../../auth/workforce";
import {
  authorizeNotificationOutletAccess,
  findNotificationRequestById,
  listNotificationRequestsForOrder,
  manualResendNotification,
  requireNotificationCapability,
  requireNotificationWorkforceActor,
  type NotificationChannelRegistry,
  type NotificationOperationOptions,
} from "../../notifications";
import { findOrderById } from "../../order/repository";
import { loadSnapshotRowForOrder } from "../../order/adapters/checkout";
import type { Persistence } from "../../persistence";
import { NotificationError } from "../../../shared/notifications";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapNotificationOperationsError } from "./notification-error-map";

export type NotificationRoute =
  | Readonly<{ kind: "list_notifications"; orderId: string }>
  | Readonly<{
      kind: "resend_notification";
      orderId: string;
      notificationRequestId: string;
    }>;

const RESENDABLE_STATUSES = new Set(["FAILED", "REVIEW_REQUIRED"]);

const RESEND_ALLOWED_KEYS = ["reason"] as const;

function toSafeNotificationProjection(request: {
  id: string;
  semanticType: string;
  channel: string;
  status: string;
  attemptCount: bigint;
  maxAttempts: bigint;
  createdAt: Date;
  updatedAt: Date;
  terminalAt: Date | null;
  suppressionReason: string | null;
  reviewReason: string | null;
}): Record<string, unknown> {
  const resendPermitted = RESENDABLE_STATUSES.has(request.status);
  return {
    notificationRequestId: request.id,
    semanticType: request.semanticType,
    channel: request.channel,
    status: request.status,
    attemptCount: request.attemptCount.toString(10),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    terminalAt: request.terminalAt?.toISOString() ?? null,
    suppressionReason: request.suppressionReason,
    reviewReason: request.reviewReason,
    resendPermitted,
  };
}

export function classifyNotificationRoute(pathname: string): NotificationRoute | null {
  const segments = pathname.split("/");
  if (segments.slice(1, 5).join("/") !== "api/operations/v1/orders" || !segments[5]) {
    return null;
  }
  if (segments.length === 7 && segments[6] === "notifications") {
    return { kind: "list_notifications", orderId: segments[5] };
  }
  if (
    segments.length === 9 &&
    segments[6] === "notifications" &&
    segments[8] === "resend" &&
    segments[7]
  ) {
    return {
      kind: "resend_notification",
      orderId: segments[5],
      notificationRequestId: segments[7],
    };
  }
  return null;
}

async function resolveOrderOutletId(
  persistence: Persistence,
  orderId: string,
): Promise<string | null> {
  return persistence.withContext(async (ctx) => {
    const order = await findOrderById(ctx, orderId);
    if (!order) return null;
    const snapshot = await loadSnapshotRowForOrder(ctx, order.checkoutSnapshotId);
    return snapshot?.selectedOutletId ?? null;
  });
}

export async function handleNotificationRoute(
  req: IncomingMessage,
  route: NotificationRoute,
  deps: Readonly<{
    runtime: WorkforceAuthRuntime;
    persistence: Persistence;
    notificationChannels?: NotificationChannelRegistry;
  }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const operation = route.kind;
  const allowedMethod = route.kind === "list_notifications" ? "GET" : "POST";
  if (method !== allowedMethod) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "NOTIFICATION_INVALID_INPUT", requestId },
    };
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    const workforce = requireNotificationWorkforceActor(principal);
    const outletId = await resolveOrderOutletId(deps.persistence, route.orderId);
    if (!outletId) {
      await deps.persistence.withContext((ctx) =>
        requireNotificationCapability(ctx, workforce, "notification.resend"),
      );
      throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }

    await deps.persistence.withContext((ctx) =>
      authorizeNotificationOutletAccess(ctx, workforce, outletId, "notification.resend"),
    );

    if (route.kind === "list_notifications") {
      const items = await deps.persistence.withContext((ctx) =>
        listNotificationRequestsForOrder(ctx, route.orderId),
      );
      return {
        status: 200,
        operation,
        code: "OK",
        body: {
          ok: true,
          items: items.map(toSafeNotificationProjection),
        },
      };
    }

    const body = await readOperationsJsonObjectBody(req);
    if (!body.ok) {
      return {
        status: 400,
        operation,
        code: "NOTIFICATION_INVALID_INPUT",
        body: { ok: false, code: "NOTIFICATION_INVALID_INPUT", requestId },
      };
    }
    for (const key of Object.keys(body.value)) {
      if (!(RESEND_ALLOWED_KEYS as readonly string[]).includes(key)) {
        throw new NotificationError(
          "NOTIFICATION_INVALID_INPUT",
          `Unknown field '${key}' is not permitted on notification resend.`,
          { field: key },
        );
      }
    }
    const reason = body.value.reason;
    if (typeof reason !== "string") {
      throw new NotificationError("NOTIFICATION_INVALID_INPUT", "A resend reason is required.", {
        field: "reason",
      });
    }

    const existing = await deps.persistence.withContext((ctx) =>
      findNotificationRequestById(ctx, route.notificationRequestId),
    );
    if (!existing || existing.orderId !== route.orderId) {
      throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }

    const operationOptions: NotificationOperationOptions = {
      ...(deps.notificationChannels ? { channels: deps.notificationChannels } : {}),
    };
    const updated = await manualResendNotification(
      deps.persistence,
      workforce,
      { notificationRequestId: route.notificationRequestId, reason },
      operationOptions,
    );
    return {
      status: 200,
      operation,
      code: "OK",
      body: {
        ok: true,
        notification: toSafeNotificationProjection(updated),
      },
    };
  } catch (error) {
    const mapped = mapNotificationOperationsError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body,
    };
  }
}
