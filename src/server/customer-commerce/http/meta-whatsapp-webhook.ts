/**
 * Meta WhatsApp Cloud API webhook ingress (IMP-034).
 *
 * GET: hub challenge verification.
 * POST: signature verify → durable provider-event accept → process → 200.
 * Unauthentic requests have no durable business effect.
 */
import "server-only";

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import type { AppEnvironment } from "../../../platform/config";
import type { Persistence } from "../../persistence";
import {
  processMetaWhatsAppWebhook,
  verifyMetaWhatsAppWebhookGet,
  verifyMetaWhatsAppWebhookSignature,
  type MetaWhatsAppRuntimeSecrets,
} from "../../notifications/provider/meta-whatsapp";
import { readRawBody } from "./request";
import { sendJson } from "./response";

export const META_WHATSAPP_WEBHOOK_PATH =
  "/api/integrations/notifications/whatsapp/meta/webhook" as const;

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

function readQueryParam(url: URL, name: string): string | null {
  return url.searchParams.get(name);
}

export async function handleMetaWhatsAppWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  deps: {
    persistence: Persistence;
    environment: AppEnvironment;
    metaWhatsApp?: MetaWhatsAppRuntimeSecrets | null;
  },
  requestId: string,
): Promise<{ operation: string; safeOutcomeCode: string; httpStatus: number }> {
  const meta = deps.metaWhatsApp;
  if (!meta) {
    sendJson(res, { ok: false, code: "NOT_FOUND", requestId }, { status: 404, requestId });
    return { operation: "meta_whatsapp_webhook", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
  }

  const host = typeof req.headers.host === "string" ? req.headers.host : "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);

  if (req.method === "GET") {
    const verification = verifyMetaWhatsAppWebhookGet({
      mode: readQueryParam(url, "hub.mode"),
      verifyToken: readQueryParam(url, "hub.verify_token"),
      challenge: readQueryParam(url, "hub.challenge"),
      expectedVerifyToken: meta.webhookVerifyToken,
    });
    if (!verification.ok) {
      res.statusCode = 403;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Forbidden");
      return {
        operation: "meta_whatsapp_webhook",
        safeOutcomeCode: "WEBHOOK_VERIFICATION_FAILED",
        httpStatus: 403,
      };
    }
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(verification.challenge);
    return { operation: "meta_whatsapp_webhook", safeOutcomeCode: "OK", httpStatus: 200 };
  }

  if (req.method !== "POST") {
    sendJson(res, { ok: false, code: "METHOD_NOT_ALLOWED", requestId }, { status: 405, requestId });
    return {
      operation: "meta_whatsapp_webhook",
      safeOutcomeCode: "METHOD_NOT_ALLOWED",
      httpStatus: 405,
    };
  }

  const raw = await readRawBody(req);
  if (!raw.ok) {
    const code = raw.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST";
    const status = raw.reason === "too_large" ? 413 : 400;
    sendJson(res, { ok: false, code, requestId }, { status, requestId });
    return { operation: "meta_whatsapp_webhook", safeOutcomeCode: code, httpStatus: status };
  }

  const headers = flattenHeaders(req.headers);
  const authentic = verifyMetaWhatsAppWebhookSignature({
    appSecret: meta.appSecret,
    rawBody: raw.value,
    signatureHeader: headers["x-hub-signature-256"],
  });
  if (!authentic) {
    sendJson(
      res,
      { ok: false, code: "WEBHOOK_SIGNATURE_INVALID", requestId },
      { status: 403, requestId },
    );
    return {
      operation: "meta_whatsapp_webhook",
      safeOutcomeCode: "WEBHOOK_SIGNATURE_INVALID",
      httpStatus: 403,
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(raw.value).toString("utf8")) as unknown;
  } catch {
    sendJson(res, { ok: false, code: "INVALID_REQUEST", requestId }, { status: 400, requestId });
    return {
      operation: "meta_whatsapp_webhook",
      safeOutcomeCode: "INVALID_REQUEST",
      httpStatus: 400,
    };
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    sendJson(res, { ok: false, code: "INVALID_REQUEST", requestId }, { status: 400, requestId });
    return {
      operation: "meta_whatsapp_webhook",
      safeOutcomeCode: "INVALID_REQUEST",
      httpStatus: 400,
    };
  }

  try {
    await deps.persistence.transaction((tx) =>
      processMetaWhatsAppWebhook(tx, {
        environment: deps.environment,
        configuredWabaId: meta.wabaId,
        rawPayload: payload as Record<string, unknown>,
        receivedAt: new Date(),
      }),
    );
  } catch {
    sendJson(res, { ok: false, code: "INTERNAL_ERROR", requestId }, { status: 500, requestId });
    return {
      operation: "meta_whatsapp_webhook",
      safeOutcomeCode: "INTERNAL_ERROR",
      httpStatus: 500,
    };
  }

  sendJson(res, { ok: true }, { status: 200, requestId });
  return { operation: "meta_whatsapp_webhook", safeOutcomeCode: "OK", httpStatus: 200 };
}
