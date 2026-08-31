/**
 * Operations Delivery HTTP routes (IMP-032).
 */
import "server-only";

import type { IncomingMessage } from "node:http";

import { DeliveryError } from "../../../shared/delivery";
import {
  arrangeDelivery,
  getWorkforceDeliveryForOrder,
  toWorkforceDeliveryTransport,
  workforceAdvanceReturn,
  workforceBeginManualBooking,
  workforceBeginReturn,
  workforceCancelDelivery,
  workforceConfirmDelivery,
  workforceConfirmManualBooking,
  workforceConfirmPickup,
  workforceRecordAssignment,
  workforceRecordProviderCost,
  workforceReportDeliveryFailure,
  workforceResolveManualBookingCancellation,
  workforceResolveManualBookingFailure,
  workforceUpdateTrackingReference,
} from "../../delivery";
import type { Persistence } from "../../persistence";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { readOperationsJsonObjectBody } from "./body";
import { mapDeliveryOperationsError } from "./delivery-error-map";

export type DeliveryRouteKind =
  | "get_delivery"
  | "arrange"
  | "begin_manual_booking"
  | "confirm_manual_booking"
  | "resolve_failure"
  | "resolve_cancellation"
  | "update_tracking"
  | "record_assignment"
  | "confirm_pickup"
  | "confirm_delivery"
  | "report_failure"
  | "cancel"
  | "begin_return"
  | "advance_return"
  | "record_cost";

export type DeliveryRoute = Readonly<{
  kind: DeliveryRouteKind;
  orderId: string;
}>;

const DELIVERY_ACTIONS: Readonly<Record<string, DeliveryRouteKind>> = {
  arrange: "arrange",
  "begin-manual-booking": "begin_manual_booking",
  "confirm-manual-booking": "confirm_manual_booking",
  "resolve-manual-booking-failure": "resolve_failure",
  "resolve-manual-booking-cancellation": "resolve_cancellation",
  "update-tracking": "update_tracking",
  "record-assignment": "record_assignment",
  "confirm-pickup": "confirm_pickup",
  "confirm-delivery": "confirm_delivery",
  "report-failure": "report_failure",
  cancel: "cancel",
  "begin-return": "begin_return",
  "advance-return": "advance_return",
  "record-cost": "record_cost",
};

export function classifyDeliveryRoute(pathname: string): DeliveryRoute | null {
  const segments = pathname.split("/");
  if (segments.slice(1, 5).join("/") !== "api/operations/v1/orders" || !segments[5]) {
    return null;
  }
  if (segments.length === 7 && segments[6] === "delivery") {
    return { kind: "get_delivery", orderId: segments[5] };
  }
  if (segments.length === 8 && segments[6] === "delivery") {
    const action = DELIVERY_ACTIONS[segments[7] ?? ""];
    if (!action) return null;
    return { kind: action, orderId: segments[5] };
  }
  return null;
}

export async function handleDeliveryRoute(
  req: IncomingMessage,
  route: DeliveryRoute,
  deps: Readonly<{ runtime: WorkforceAuthRuntime; persistence: Persistence }>,
  requestId: string,
): Promise<{ status: number; body: Record<string, unknown>; operation: string; code: string }> {
  const method = (req.method ?? "GET").toUpperCase();
  const operation = route.kind === "get_delivery" ? "get_delivery" : route.kind;
  const allowedMethod = route.kind === "get_delivery" ? "GET" : "POST";
  if (method !== allowedMethod) {
    return {
      status: 405,
      operation,
      code: "METHOD_NOT_ALLOWED",
      body: { ok: false, code: "DELIVERY_REQUEST_INVALID", requestId },
    };
  }

  try {
    const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
    if (route.kind === "get_delivery") {
      const detail = await getWorkforceDeliveryForOrder(
        deps.persistence,
        principal,
        route.orderId,
      );
      return {
        status: 200,
        operation,
        code: "OK",
        body: {
          ok: true,
          delivery: detail ? toWorkforceDeliveryTransport(detail) : null,
        },
      };
    }

    const body = await readOperationsJsonObjectBody(req);
    if (!body.ok) {
      return {
        status: 400,
        operation,
        code: "DELIVERY_REQUEST_INVALID",
        body: { ok: false, code: "DELIVERY_REQUEST_INVALID", requestId },
      };
    }

    const payload = body.value;
    let result: unknown;
    switch (route.kind) {
      case "arrange":
        result = await arrangeDelivery(deps.persistence, principal, {
          ...payload,
          orderId: route.orderId,
        });
        break;
      case "begin_manual_booking":
        result = await workforceBeginManualBooking(deps.persistence, principal, payload);
        break;
      case "confirm_manual_booking":
        result = await workforceConfirmManualBooking(deps.persistence, principal, payload);
        break;
      case "resolve_failure":
        result = await workforceResolveManualBookingFailure(deps.persistence, principal, payload);
        break;
      case "resolve_cancellation":
        result = await workforceResolveManualBookingCancellation(deps.persistence, principal, payload);
        break;
      case "update_tracking":
        result = await workforceUpdateTrackingReference(deps.persistence, principal, payload);
        break;
      case "record_assignment":
        result = await workforceRecordAssignment(deps.persistence, principal, payload);
        break;
      case "confirm_pickup":
        result = await workforceConfirmPickup(deps.persistence, principal, payload);
        break;
      case "confirm_delivery":
        result = await workforceConfirmDelivery(deps.persistence, principal, payload);
        break;
      case "report_failure":
        result = await workforceReportDeliveryFailure(deps.persistence, principal, payload);
        break;
      case "cancel":
        result = await workforceCancelDelivery(deps.persistence, principal, payload);
        break;
      case "begin_return":
        result = await workforceBeginReturn(deps.persistence, principal, payload);
        break;
      case "advance_return":
        result = await workforceAdvanceReturn(deps.persistence, principal, payload);
        break;
      case "record_cost":
        result = await workforceRecordProviderCost(deps.persistence, principal, payload);
        break;
      default:
        throw new DeliveryError("DELIVERY_INVALID_INPUT", "Unsupported delivery route.");
    }

    return {
      status: 200,
      operation,
      code: "OK",
      body: { ok: true, result: JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? v.toString() : v)) },
    };
  } catch (error) {
    const mapped = mapDeliveryOperationsError(error, requestId);
    return {
      status: mapped.status,
      operation,
      code: mapped.body.code,
      body: mapped.body as Record<string, unknown>,
    };
  }
}
