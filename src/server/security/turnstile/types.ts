/**
 * Cloudflare Turnstile siteverify contracts (IMP-038).
 *
 * Outcomes and errors are secret-safe: never include tokens, secrets, raw
 * IPs, or provider response bodies.
 */
export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify" as const;

/** Cloudflare documented token TTL (seconds). */
export const TURNSTILE_TOKEN_TTL_SECONDS = 300;

/** Cloudflare always-passes test keys (non-production harness only). */
export const TURNSTILE_TEST_SITE_KEY =
  "1x0000000000000000000000000000000AA" as const;
export const TURNSTILE_TEST_SECRET_KEY =
  "1x0000000000000000000000000000000AA" as const;

export type TurnstileVerifyFailureReason =
  | "missing_token"
  | "invalid_token"
  | "token_replay"
  | "provider_rejected"
  | "provider_unavailable"
  | "configuration_missing"
  | "timeout";

export type TurnstileVerifyOutcome =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason: TurnstileVerifyFailureReason;
    }>;

export type TurnstileVerifyInput = Readonly<{
  token: string;
  remoteIp?: string;
  idempotencyKey?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}>;

/**
 * Injectable verifier for automated tests — avoids network to Cloudflare.
 */
export type TurnstileVerifier = Readonly<{
  verify(input: TurnstileVerifyInput): Promise<TurnstileVerifyOutcome>;
}>;

export class TurnstileServiceError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(details: {
    readonly message: string;
    readonly code: string;
    readonly httpStatus: number;
  }) {
    super(details.message);
    this.name = "TurnstileServiceError";
    this.code = details.code;
    this.httpStatus = details.httpStatus;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, TurnstileServiceError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: string;
    httpStatus: number;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
    };
  }
}
