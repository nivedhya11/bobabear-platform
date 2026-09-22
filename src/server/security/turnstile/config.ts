/**
 * Cloudflare Turnstile configuration loader (IMP-038).
 *
 * Reads from an explicit env source — never `process.env` directly.
 * Secret key must never be exposed to the client.
 */
import "server-only";

import type { AppEnvironment } from "../../../platform/config";
import {
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  TurnstileServiceError,
} from "./types";

export type TurnstileEnvSource = Readonly<Record<string, string | undefined>>;

export type TurnstileConfig = Readonly<{
  siteKey: string;
  secretKey: string;
  /** True when keys were defaulted to Cloudflare test keys. */
  usingTestKeys: boolean;
  /**
   * False when staging/production keys are absent — verification must
   * fail closed without calling the provider.
   */
  configured: boolean;
  environmentType: AppEnvironment;
}>;

const NON_PRODUCTION: ReadonlySet<AppEnvironment> = new Set([
  "local",
  "test",
  "ci",
]);

function trimOrEmpty(raw: string | undefined): string {
  if (raw === undefined) return "";
  return raw.trim();
}

/**
 * Load Turnstile keys for the given environment.
 *
 * - `local` / `test` / `ci`: Cloudflare always-passes test keys when unset,
 *   or explicit keys when provided.
 * - `staging` / `production`: real keys required; `configured=false` when
 *   missing so callers fail closed at verification time.
 */
export function loadTurnstileConfig(
  source: TurnstileEnvSource,
  environmentType: AppEnvironment,
): TurnstileConfig {
  const siteKeyRaw = trimOrEmpty(source.TURNSTILE_SITE_KEY);
  const secretKeyRaw = trimOrEmpty(source.TURNSTILE_SECRET_KEY);
  const allowTestDefaults = NON_PRODUCTION.has(environmentType);

  if (siteKeyRaw.length === 0 && secretKeyRaw.length === 0) {
    if (allowTestDefaults) {
      return Object.freeze({
        siteKey: TURNSTILE_TEST_SITE_KEY,
        secretKey: TURNSTILE_TEST_SECRET_KEY,
        usingTestKeys: true,
        configured: true,
        environmentType,
      });
    }
    return Object.freeze({
      siteKey: "",
      secretKey: "",
      usingTestKeys: false,
      configured: false,
      environmentType,
    });
  }

  if (siteKeyRaw.length === 0 || secretKeyRaw.length === 0) {
    if (allowTestDefaults) {
      throw new TurnstileServiceError({
        message:
          "Turnstile keys must both be set, or both omitted to use Cloudflare test keys.",
        code: "TURNSTILE_CONFIGURATION_INVALID",
        httpStatus: 500,
      });
    }
    return Object.freeze({
      siteKey: siteKeyRaw,
      secretKey: secretKeyRaw,
      usingTestKeys: false,
      configured: false,
      environmentType,
    });
  }

  if (
    !allowTestDefaults &&
    (siteKeyRaw === TURNSTILE_TEST_SITE_KEY ||
      secretKeyRaw === TURNSTILE_TEST_SECRET_KEY)
  ) {
    throw new TurnstileServiceError({
      message: "Cloudflare Turnstile test keys are forbidden in staging/production.",
      code: "TURNSTILE_TEST_KEYS_FORBIDDEN",
      httpStatus: 500,
    });
  }

  const usingTestKeys =
    siteKeyRaw === TURNSTILE_TEST_SITE_KEY &&
    secretKeyRaw === TURNSTILE_TEST_SECRET_KEY;

  return Object.freeze({
    siteKey: siteKeyRaw,
    secretKey: secretKeyRaw,
    usingTestKeys,
    configured: true,
    environmentType,
  });
}
