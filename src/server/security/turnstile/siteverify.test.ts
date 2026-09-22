/**
 * Unit tests for Cloudflare Turnstile siteverify (IMP-038).
 * Deterministic — mocked fetch; no network.
 */
import { describe, expect, it, vi } from "vitest";

import { loadTurnstileConfig } from "./config";
import { createTurnstileVerifier, verifyTurnstileToken } from "./siteverify";
import {
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
} from "./types";

function testConfig() {
  return loadTurnstileConfig({}, "test");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("loadTurnstileConfig", () => {
  it("defaults to Cloudflare test keys in local/test/ci", () => {
    const config = loadTurnstileConfig({}, "test");
    expect(config.configured).toBe(true);
    expect(config.usingTestKeys).toBe(true);
    expect(config.siteKey).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(config.secretKey).toBe(TURNSTILE_TEST_SECRET_KEY);
  });

  it("marks staging unconfigured when keys are missing (fail closed later)", () => {
    const config = loadTurnstileConfig({}, "staging");
    expect(config.configured).toBe(false);
    expect(config.usingTestKeys).toBe(false);
  });

  it("rejects Cloudflare test keys in production", () => {
    expect(() =>
      loadTurnstileConfig(
        {
          TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
          TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
        },
        "production",
      ),
    ).toThrow(/test keys are forbidden/i);
  });
});

describe("verifyTurnstileToken", () => {
  it("succeeds when Cloudflare reports success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const outcome = await verifyTurnstileToken(
      { config: testConfig() },
      { token: "valid-turnstile-token-aaaaaaaa", fetchImpl },
    );
    expect(outcome).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      TURNSTILE_SITEVERIFY_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.secret).toBe(TURNSTILE_TEST_SECRET_KEY);
    expect(body.response).toBe("valid-turnstile-token-aaaaaaaa");
  });

  it("fails closed on missing token without calling the provider", async () => {
    const fetchImpl = vi.fn();
    const outcome = await verifyTurnstileToken(
      { config: testConfig() },
      { token: "   ", fetchImpl },
    );
    expect(outcome).toEqual({ ok: false, reason: "missing_token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed on timeout-or-duplicate / replay", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      );
    const outcome = await verifyTurnstileToken(
      { config: testConfig() },
      { token: "replayed-turnstile-token-bbbbbbbb", fetchImpl },
    );
    expect(outcome).toEqual({ ok: false, reason: "token_replay" });
  });

  it("fails closed on provider HTTP failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }, 503));
    const outcome = await verifyTurnstileToken(
      { config: testConfig() },
      { token: "valid-turnstile-token-cccccccc", fetchImpl },
    );
    expect(outcome).toEqual({ ok: false, reason: "provider_unavailable" });
  });

  it("fails closed on fetch abort/timeout", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const error = new Error("aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });
    const outcome = await verifyTurnstileToken(
      { config: testConfig() },
      { token: "valid-turnstile-token-dddddddd", fetchImpl },
    );
    expect(outcome).toEqual({ ok: false, reason: "timeout" });
  });

  it("fails closed when staging/production config is missing", async () => {
    const config = loadTurnstileConfig({}, "production");
    const fetchImpl = vi.fn();
    const outcome = await verifyTurnstileToken(
      { config },
      { token: "valid-turnstile-token-eeeeeeee", fetchImpl },
    );
    expect(outcome).toEqual({ ok: false, reason: "configuration_missing" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("supports injectable TurnstileVerifier without network", async () => {
    const verifier = createTurnstileVerifier({ config: testConfig() });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    await expect(
      verifier.verify({ token: "valid-turnstile-token-ffffffff", fetchImpl }),
    ).resolves.toEqual({ ok: true });
  });

  it("uses test-key mode config for automated harnesses", async () => {
    const config = loadTurnstileConfig({}, "ci");
    expect(config.usingTestKeys).toBe(true);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    await expect(
      verifyTurnstileToken(
        { config },
        { token: "valid-turnstile-token-gggggggg", fetchImpl },
      ),
    ).resolves.toEqual({ ok: true });
  });
});
