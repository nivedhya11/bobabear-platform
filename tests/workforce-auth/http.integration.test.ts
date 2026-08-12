/**
 * Real end-to-end HTTP integration tests for the workforce-auth service
 * (IMP-010). Starts an actual `WorkforceAuthService` process object (never
 * `main.ts`) on an OS-assigned loopback port with `trustProxyHops: 0`,
 * backed by a real, disposable Testcontainers PostgreSQL 18 database.
 *
 * Mirrors `tests/customer-auth/http.integration.test.ts` (in-process
 * service harness — the established repo pattern despite the prompt's
 * "compiled service" wording).
 */
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { createWorkforceOperatorAuthRuntime, createWorkforceOperatorUser, setWorkforceOperatorLifecycleState } from "../../src/server/auth/workforce/operator";
import { validateWorkforceAuthConfig } from "../../src/server/auth/shared/config";
import {
  WORKFORCE_TOTP_DIGITS,
  WORKFORCE_TOTP_PERIOD_SECONDS,
} from "../../src/server/auth/shared/workforce-session-policy";
import { WORKFORCE_AUTH_PUBLIC_PATHS } from "../../src/shared/workforce-auth/contracts";
import { MAX_JSON_BODY_BYTES } from "../../src/server/workforce-auth/http/request";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import {
  withWorkforceAuthHttpService,
  WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
  WORKFORCE_AUTH_HTTP_TEST_SECRET,
  type WorkforceAuthHttpTestHarness,
} from "./support/service-harness";

const TEMP_PASSWORD = "temporary-password-15+";
const PERMANENT_PASSWORD = "permanent-password-15x";
const EMAIL_FLOW = "http-flow@example.test";
const EMAIL_UNKNOWN = "nobody@example.test";
const EMAIL_DISABLED = "disabled@example.test";
const EMAIL_RATE = "rate-limit@example.test";

const openRuntimes: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openRuntimes.splice(0).map((h) => h.close()));
});

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

async function withRunningService<T>(
  callback: (harness: WorkforceAuthHttpTestHarness & { databaseUrl: string }) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    return withWorkforceAuthHttpService(database.connectionString, (harness) =>
      callback({ ...harness, databaseUrl: database.connectionString }),
    );
  });
}

async function provisionViaRuntime(
  databaseUrl: string,
  options: {
    email: string;
    password: string;
    passwordChangeRequired?: boolean;
    twoFactorEnabled?: boolean;
    disabledAt?: Date | null;
    name?: string;
  },
): Promise<{ id: string }> {
  const authResult = validateWorkforceAuthConfig(
    {
      WORKFORCE_AUTH_SECRET: WORKFORCE_AUTH_HTTP_TEST_SECRET,
      WORKFORCE_AUTH_BASE_URL: WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
    },
    "test",
  );
  if (!authResult.ok) throw new Error("invalid auth config");

  const runtime = createWorkforceOperatorAuthRuntime({
    auth: authResult.config,
    persistence: applicationConfig(databaseUrl),
  });
  openRuntimes.push(runtime);

  const created = await createWorkforceOperatorUser(runtime, {
    email: options.email,
    name: options.name ?? "HTTP Test User",
    temporaryPassword: options.password,
  });
  await runtime.withContext((ctx) =>
    setWorkforceOperatorLifecycleState(ctx, created.userId, {
      passwordChangeRequired: options.passwordChangeRequired ?? true,
      twoFactorEnabled: options.twoFactorEnabled ?? false,
      disabledAt: options.disabledAt ?? null,
    }),
  );
  return { id: created.userId };
}

function stateChangingHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    origin: WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
    ...extra,
  };
}

function cookieFromResponse(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((raw) => raw.split(";", 1)[0]!)
    .join("; ");
}

function secretFromTotpUri(totpUri: string): string {
  const encoded = new URL(totpUri).searchParams.get("secret");
  if (!encoded) throw new Error("missing totp secret");
  return new TextDecoder().decode(base32.decode(encoded));
}

async function totpNow(secret: string): Promise<string> {
  return createOTP(secret, {
    digits: WORKFORCE_TOTP_DIGITS,
    period: WORKFORCE_TOTP_PERIOD_SECONDS,
  }).totp();
}

describe("IMP-010 HTTP: health endpoints", () => {
  it("GET /health/live returns 200 without Origin", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/live`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-request-id")).toBeTruthy();
    });
  });

  it("GET /health/ready returns 200 when persistence is ready", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/ready`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  it("POST /health/live is 405 with Allow", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/live`, { method: "POST" });
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    });
  });

  it("unknown path is 404", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/nope`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ ok: false, code: "NOT_FOUND" });
    });
  });
});

describe("IMP-010 HTTP: request validation", () => {
  it("rejects missing Origin, untrusted Origin, and Sec-Fetch-Site: cross-site", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const missing = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: EMAIL_FLOW, password: TEMP_PASSWORD }),
      });
      expect(missing.status).toBe(403);

      const untrusted = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders({ origin: "https://evil.example" }),
        body: JSON.stringify({ email: EMAIL_FLOW, password: TEMP_PASSWORD }),
      });
      expect(untrusted.status).toBe(403);

      const crossSite = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders({ "sec-fetch-site": "cross-site" }),
        body: JSON.stringify({ email: EMAIL_FLOW, password: TEMP_PASSWORD }),
      });
      expect(crossSite.status).toBe(403);
    });
  });

  it("rejects wrong content-type, malformed JSON, oversized body, and query-string credentials", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const wrongType = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: { origin: WORKFORCE_AUTH_HTTP_TEST_ORIGIN, "content-type": "text/plain" },
        body: "email=x",
      });
      expect(wrongType.status).toBe(400);

      const malformed = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: "{not-json",
      });
      expect(malformed.status).toBe(400);

      const oversized = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_FLOW, password: "x".repeat(MAX_JSON_BODY_BYTES) }),
      });
      expect(oversized.status).toBe(400);

      const query = await fetch(
        `${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}?email=${encodeURIComponent(EMAIL_FLOW)}`,
        {
          method: "POST",
          headers: stateChangingHeaders(),
          body: JSON.stringify({ email: EMAIL_FLOW, password: TEMP_PASSWORD }),
        },
      );
      expect(query.status).toBe(400);
    });
  });

  it("405s GET on every state-changing public path", async () => {
    await withRunningService(async ({ baseUrl }) => {
      for (const path of [
        WORKFORCE_AUTH_PUBLIC_PATHS.signIn,
        WORKFORCE_AUTH_PUBLIC_PATHS.changePassword,
        WORKFORCE_AUTH_PUBLIC_PATHS.mfaEnroll,
        WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyEnrollment,
        WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify,
        WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyBackupCode,
        WORKFORCE_AUTH_PUBLIC_PATHS.signOut,
      ]) {
        const response = await fetch(`${baseUrl}${path}`, { headers: stateChangingHeaders() });
        expect(response.status).toBe(405);
        expect(response.headers.get("allow")).toBe("POST");
      }
    });
  });
});

describe("IMP-010 HTTP: generic authentication failures", () => {
  it("returns the same AUTHENTICATION_FAILED for unknown email, wrong password, and disabled user", async () => {
    await withRunningService(async ({ baseUrl, databaseUrl }) => {
      await provisionViaRuntime(databaseUrl, {
        email: EMAIL_DISABLED,
        password: TEMP_PASSWORD,
        disabledAt: new Date(),
      });
      await provisionViaRuntime(databaseUrl, {
        email: "known@example.test",
        password: TEMP_PASSWORD,
      });

      const unknown = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_UNKNOWN, password: TEMP_PASSWORD }),
      });
      expect(unknown.status).toBe(401);
      expect(await unknown.json()).toEqual({ authenticated: false, code: "AUTHENTICATION_FAILED" });

      const wrong = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: "known@example.test", password: "wrong-password-15xx" }),
      });
      expect(wrong.status).toBe(401);
      expect(await wrong.json()).toEqual({ authenticated: false, code: "AUTHENTICATION_FAILED" });

      const disabled = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_DISABLED, password: TEMP_PASSWORD }),
      });
      expect(disabled.status).toBe(401);
      expect(await disabled.json()).toEqual({ authenticated: false, code: "AUTHENTICATION_FAILED" });
    });
  });
});

describe("IMP-010 HTTP: full password → MFA enroll → reauth → TOTP lifecycle", () => {
  it("walks change-password, enroll, revoke-after-verify, sign-in+TOTP, session, backup replay, and sign-out", async () => {
    await withRunningService(async ({ baseUrl, databaseUrl }) => {
      await provisionViaRuntime(databaseUrl, {
        email: EMAIL_FLOW,
        password: TEMP_PASSWORD,
        passwordChangeRequired: true,
      });

      const signInTemp = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_FLOW, password: TEMP_PASSWORD }),
      });
      expect(signInTemp.status).toBe(200);
      expect(await signInTemp.json()).toEqual({ authenticated: false, next: "change_password" });
      const cookieAfterTemp = cookieFromResponse(signInTemp);
      expect(cookieAfterTemp).toMatch(/boba-workforce\.session_token=/);

      const sessionTemp = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: cookieAfterTemp },
      });
      expect(await sessionTemp.json()).toEqual({ authenticated: false, next: "change_password" });

      const change = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.changePassword}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: cookieAfterTemp }),
        body: JSON.stringify({
          currentPassword: TEMP_PASSWORD,
          newPassword: PERMANENT_PASSWORD,
        }),
      });
      expect(change.status).toBe(200);
      expect(await change.json()).toEqual({ authenticated: false, next: "mfa_enrollment" });
      const cookieAfterChange = cookieFromResponse(change) || cookieAfterTemp;

      const enroll = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaEnroll}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: cookieAfterChange }),
        body: JSON.stringify({ password: PERMANENT_PASSWORD }),
      });
      expect(enroll.status).toBe(200);
      expect(enroll.headers.get("cache-control")).toBe("no-store");
      const enrollBody = (await enroll.json()) as {
        totpUri: string;
        backupCodes: string[];
      };
      expect(enrollBody.totpUri).toMatch(/^otpauth:\/\//);
      expect(enrollBody.backupCodes.length).toBeGreaterThan(0);
      const backupCode = enrollBody.backupCodes[0]!;
      const secret = secretFromTotpUri(enrollBody.totpUri);

      const verifyEnroll = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyEnrollment}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: cookieAfterChange }),
        body: JSON.stringify({ code: await totpNow(secret) }),
      });
      expect(verifyEnroll.status).toBe(200);
      expect(await verifyEnroll.json()).toEqual({ authenticated: false, next: "sign_in" });
      // Enrollment must clear session cookies (Max-Age=0).
      const cleared = verifyEnroll.headers.getSetCookie().join("\n");
      expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);

      const sessionAfterEnroll = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: cookieAfterChange },
      });
      expect(await sessionAfterEnroll.json()).toEqual({ authenticated: false });

      const signInMfa = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_FLOW, password: PERMANENT_PASSWORD }),
      });
      expect(signInMfa.status).toBe(200);
      expect(await signInMfa.json()).toEqual({ authenticated: false, next: "mfa" });
      const mfaCookie = cookieFromResponse(signInMfa);

      const invalidTotp = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: mfaCookie }),
        body: JSON.stringify({ code: "000000" }),
      });
      expect(invalidTotp.status).toBe(401);
      expect(await invalidTotp.json()).toMatchObject({
        authenticated: false,
        code: "MFA_INVALID_CODE",
      });

      const verifyTotp = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: mfaCookie }),
        body: JSON.stringify({ code: await totpNow(secret) }),
      });
      expect(verifyTotp.status).toBe(200);
      const verifyText = await verifyTotp.text();
      expect(JSON.parse(verifyText)).toEqual({ authenticated: true });
      expect(verifyText).not.toMatch(/session_token|postgresql:\/\//i);
      expect(verifyText).not.toContain(EMAIL_FLOW);
      expect(verifyText).not.toContain(secret);
      const authCookie = cookieFromResponse(verifyTotp);
      expect(authCookie).toMatch(/boba-workforce\.session_token=/);

      const sessionOk = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: authCookie },
      });
      expect(await sessionOk.json()).toEqual({
        authenticated: true,
        user: { id: expect.any(String) },
      });

      // Fresh MFA challenge for backup code.
      const signInBackup = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_FLOW, password: PERMANENT_PASSWORD }),
      });
      const backupCookie = cookieFromResponse(signInBackup);
      const backupOk = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyBackupCode}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: backupCookie }),
        body: JSON.stringify({ code: backupCode }),
      });
      expect(backupOk.status).toBe(200);
      expect(await backupOk.json()).toEqual({ authenticated: true });

      const backupReplay = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyBackupCode}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: backupCookie }),
        body: JSON.stringify({ code: backupCode }),
      });
      expect(backupReplay.status).toBe(401);

      const signOut = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signOut}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: authCookie }),
      });
      expect(signOut.status).toBe(200);
      expect(await signOut.json()).toEqual({ authenticated: false });

      const afterSignOut = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: authCookie },
      });
      expect(await afterSignOut.json()).toEqual({ authenticated: false });

      const signOutAgain = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signOut}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: authCookie }),
      });
      expect(signOutAgain.status).toBe(200);
      expect(await signOutAgain.json()).toEqual({ authenticated: false });
    });
  });
});

describe("IMP-010 HTTP: MFA lockout and rate limits", () => {
  it("locks MFA after consecutive failures and rate-limits email sign-in", async () => {
    await withRunningService(async ({ baseUrl, databaseUrl }) => {
      await provisionViaRuntime(databaseUrl, {
        email: EMAIL_RATE,
        password: PERMANENT_PASSWORD,
        passwordChangeRequired: false,
        twoFactorEnabled: false,
      });

      // Enroll + verify so MFA challenge is required.
      const signIn = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_RATE, password: PERMANENT_PASSWORD }),
      });
      const cookie = cookieFromResponse(signIn);
      const enroll = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaEnroll}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie }),
        body: JSON.stringify({ password: PERMANENT_PASSWORD }),
      });
      const { totpUri } = (await enroll.json()) as { totpUri: string };
      await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyEnrollment}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie }),
        body: JSON.stringify({ code: await totpNow(secretFromTotpUri(totpUri)) }),
      });

      const challenge = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ email: EMAIL_RATE, password: PERMANENT_PASSWORD }),
      });
      const mfaCookie = cookieFromResponse(challenge);

      let locked = false;
      for (let i = 0; i < 6; i += 1) {
        const response = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify}`, {
          method: "POST",
          headers: stateChangingHeaders({ cookie: mfaCookie }),
          body: JSON.stringify({ code: "000000" }),
        });
        const body = (await response.json()) as { code?: string };
        if (body.code === "MFA_LOCKED") {
          locked = true;
          expect(response.status).toBe(403);
          break;
        }
      }
      expect(locked).toBe(true);

      // Exhaust email sign-in rate limit (5 / 15m) with wrong password on a fresh email.
      const emailLimited = "limited-email@example.test";
      await provisionViaRuntime(databaseUrl, {
        email: emailLimited,
        password: TEMP_PASSWORD,
      });
      let sawRateLimit = false;
      for (let i = 0; i < 6; i += 1) {
        const response = await fetch(`${baseUrl}${WORKFORCE_AUTH_PUBLIC_PATHS.signIn}`, {
          method: "POST",
          headers: stateChangingHeaders(),
          body: JSON.stringify({ email: emailLimited, password: "wrong-password-15xx" }),
        });
        if (response.status === 429) {
          sawRateLimit = true;
          expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
          expect(await response.json()).toMatchObject({
            authenticated: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: expect.any(Number),
          });
          break;
        }
      }
      expect(sawRateLimit).toBe(true);
    });
  });
});

describe("IMP-010 HTTP: graceful shutdown", () => {
  it("close() is idempotent and stops accepting requests", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withWorkforceAuthHttpService(database.connectionString, async ({ baseUrl, service }) => {
        const live = await fetch(`${baseUrl}/health/live`);
        expect(live.status).toBe(200);
        await service.close();
        await service.close();
        await expect(fetch(`${baseUrl}/health/live`)).rejects.toThrow();
      });
    });
  });
});
