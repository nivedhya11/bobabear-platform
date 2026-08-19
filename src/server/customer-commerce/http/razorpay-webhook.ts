/**
 * Razorpay webhook ingress (IMP-026A / D-363).
 *
 * Verify → durable inbox insert → 2xx. No Payment transition in this request.
 */
import "server-only";

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import { PaymentError } from "../../../shared/payment";
import { enqueueVerifiedProviderEvent } from "../../payment/inbox";
import type { PaymentProvider } from "../../payment/provider";
import type { Persistence } from "../../persistence";
import { readRawBody } from "./request";
import { sendJson } from "./response";

export const RAZORPAY_WEBHOOK_PATH = "/api/integrations/payments/razorpay/webhook";

function flattenHeaders(headers: IncomingHttpHeaders): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === "string") {
      out[key] = value[0];
    }
  }
  return Object.freeze(out);
}

export async function handleRazorpayWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  deps: {
    persistence: Persistence;
    paymentProvider?: PaymentProvider;
  },
  requestId: string,
): Promise<{ operation: string; safeOutcomeCode: string; httpStatus: number }> {
  const provider = deps.paymentProvider;
  if (!provider || provider.name !== "razorpay") {
    sendJson(res, { ok: false, code: "NOT_FOUND", requestId }, { status: 404, requestId });
    return { operation: "razorpay_webhook", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
  }

  const raw = await readRawBody(req);
  if (!raw.ok) {
    const code = raw.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST";
    const status = raw.reason === "too_large" ? 413 : 400;
    sendJson(res, { ok: false, code, requestId }, { status, requestId });
    return { operation: "razorpay_webhook", safeOutcomeCode: code, httpStatus: status };
  }

  let evidence;
  try {
    evidence = await provider.verifyWebhook({
      rawBody: raw.value,
      headers: flattenHeaders(req.headers),
    });
  } catch (error) {
    if (error instanceof PaymentError && error.code === "PAYMENT_PROVIDER_EVIDENCE_INVALID") {
      sendJson(
        res,
        { ok: false, code: "PAYMENT_PROVIDER_EVIDENCE_INVALID", requestId },
        { status: 400, requestId },
      );
      return {
        operation: "razorpay_webhook",
        safeOutcomeCode: "PAYMENT_PROVIDER_EVIDENCE_INVALID",
        httpStatus: 400,
      };
    }
    sendJson(res, { ok: false, code: "INTERNAL_ERROR", requestId }, { status: 500, requestId });
    return { operation: "razorpay_webhook", safeOutcomeCode: "INTERNAL_ERROR", httpStatus: 500 };
  }

  const providerEventId = evidence.providerEventId;
  if (!providerEventId) {
    sendJson(
      res,
      { ok: false, code: "PAYMENT_PROVIDER_EVIDENCE_INVALID", requestId },
      { status: 400, requestId },
    );
    return {
      operation: "razorpay_webhook",
      safeOutcomeCode: "PAYMENT_PROVIDER_EVIDENCE_INVALID",
      httpStatus: 400,
    };
  }

  try {
    await deps.persistence.transaction((tx) =>
      enqueueVerifiedProviderEvent(tx, {
        provider: provider.name,
        providerEventId,
        evidence,
        now: new Date(),
      }),
    );
  } catch {
    sendJson(res, { ok: false, code: "INTERNAL_ERROR", requestId }, { status: 500, requestId });
    return { operation: "razorpay_webhook", safeOutcomeCode: "INTERNAL_ERROR", httpStatus: 500 };
  }

  sendJson(res, { ok: true }, { status: 200, requestId });
  return { operation: "razorpay_webhook", safeOutcomeCode: "OK", httpStatus: 200 };
}
