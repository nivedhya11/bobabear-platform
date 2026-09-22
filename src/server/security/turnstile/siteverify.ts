/**
 * Cloudflare Turnstile server-side Siteverify (IMP-038).
 *
 * Fail-closed when a challenge is required. Secret never leaves the server.
 * Tokens are single-use via Cloudflare + local redemption ledger.
 */
import "server-only";

import type { PersistenceTransactionContext } from "../../persistence/types";
import type { TurnstileConfig } from "./config";
import {
  claimTurnstileTokenRedemption,
  markTurnstileTokenRedemptionOutcome,
} from "./redemption-store";
import {
  TURNSTILE_SITEVERIFY_URL,
  TurnstileServiceError,
  type TurnstileVerifier,
  type TurnstileVerifyInput,
  type TurnstileVerifyOutcome,
} from "./types";

const SITEVERIFY_TIMEOUT_MS = 5_000;

type SiteverifyResponse = Readonly<{
  success?: unknown;
  "error-codes"?: unknown;
}>;

export type VerifyTurnstileTokenDeps = Readonly<{
  config: TurnstileConfig;
  /**
   * Optional redemption ledger. When omitted, only Cloudflare single-use
   * semantics apply (unit tests without a database).
   */
  redemptionTransaction?: PersistenceTransactionContext;
}>;

async function callSiteverify(input: Readonly<{
  secretKey: string;
  token: string;
  remoteIp?: string;
  idempotencyKey?: string;
  fetchImpl: typeof fetch;
}>): Promise<TurnstileVerifyOutcome> {
  const body: Record<string, string> = {
    secret: input.secretKey,
    response: input.token,
  };
  if (typeof input.remoteIp === "string" && input.remoteIp.length > 0) {
    body.remoteip = input.remoteIp;
  }
  if (typeof input.idempotencyKey === "string" && input.idempotencyKey.length > 0) {
    body.idempotency_key = input.idempotencyKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await input.fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name: string }).name === "AbortError");
    return {
      ok: false,
      reason: aborted ? "timeout" : "provider_unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return { ok: false, reason: "provider_unavailable" };
  }

  let payload: SiteverifyResponse;
  try {
    payload = (await response.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: "provider_unavailable" };
  }

  if (payload.success === true) {
    return { ok: true };
  }

  const errorCodes = Array.isArray(payload["error-codes"])
    ? payload["error-codes"].map(String)
    : [];
  if (
    errorCodes.includes("timeout-or-duplicate") ||
    errorCodes.includes("timeout_or_duplicate")
  ) {
    return { ok: false, reason: "token_replay" };
  }

  return { ok: false, reason: "provider_rejected" };
}

/**
 * Verify a Turnstile token against Cloudflare Siteverify (fail-closed).
 */
export async function verifyTurnstileToken(
  deps: VerifyTurnstileTokenDeps,
  input: TurnstileVerifyInput,
): Promise<TurnstileVerifyOutcome> {
  if (!deps.config.configured || deps.config.secretKey.length === 0) {
    return { ok: false, reason: "configuration_missing" };
  }

  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (token.length === 0) {
    return { ok: false, reason: "missing_token" };
  }

  const now = input.now ?? new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TurnstileServiceError({
      message: "Turnstile verification now timestamp is invalid.",
      code: "TURNSTILE_TIME_INVALID",
      httpStatus: 500,
    });
  }

  let claimedHash: string | null = null;
  if (deps.redemptionTransaction) {
    const claim = await claimTurnstileTokenRedemption(deps.redemptionTransaction, {
      token,
      now,
    });
    if (!claim.claimed) {
      return { ok: false, reason: claim.reason };
    }
    claimedHash = claim.tokenHash;
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const outcome = await callSiteverify({
    secretKey: deps.config.secretKey,
    token,
    remoteIp: input.remoteIp,
    idempotencyKey: input.idempotencyKey,
    fetchImpl,
  });

  if (deps.redemptionTransaction && claimedHash) {
    await markTurnstileTokenRedemptionOutcome(deps.redemptionTransaction, {
      tokenHash: claimedHash,
      outcome: outcome.ok ? "success" : "failure",
      now,
    });
  }

  if (!outcome.ok && outcome.reason === "provider_rejected") {
    // Distinguish empty/malformed client tokens from provider soft rejects.
    if (token.length < 20) {
      return { ok: false, reason: "invalid_token" };
    }
  }

  return outcome;
}

/** Build an injectable {@link TurnstileVerifier} bound to config (+ optional ledger). */
export function createTurnstileVerifier(
  deps: VerifyTurnstileTokenDeps,
): TurnstileVerifier {
  return Object.freeze({
    verify(input: TurnstileVerifyInput): Promise<TurnstileVerifyOutcome> {
      return verifyTurnstileToken(deps, input);
    },
  });
}
