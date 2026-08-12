/**
 * Real end-to-end HTTP integration tests for the customer-auth service
 * (IMP-009). Starts an actual `CustomerAuthService` process object (never
 * `main.ts`) on an OS-assigned loopback port with `trustProxyHops: 0`,
 * backed by a real, disposable Testcontainers PostgreSQL 18 database (see
 * `tests/database/global-setup.ts`, shared with `tests/database/**`).
 *
 * Every OTP in this file is sent via the local provider's own
 * `startVerification` (mirroring the real HTTP router's `handleSendOtp`)
 * and read back only through the test-only capture seam
 * (`createLocalCustomerOtpProviderForTests`) — never printed, never
 * asserted into a test name or failure message.
 */
import { describe, expect, inject, it } from "vitest";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "../../src/shared/customer-auth/contracts";
import type { E164IndianMobileNumber } from "../../src/shared/customer-auth/phone";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import {
  withCustomerAuthHttpService,
  CUSTOMER_AUTH_HTTP_TEST_ORIGIN,
  type CustomerAuthHttpTestHarness,
} from "./support/service-harness";

const PHONE_A = "+919876543210" as E164IndianMobileNumber;
const PHONE_B = "+919000000001" as E164IndianMobileNumber;
const INVALID_PHONE = "12345";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

async function withRunningService<T>(
  callback: (harness: CustomerAuthHttpTestHarness) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    return withCustomerAuthHttpService(database.connectionString, callback);
  });
}

function stateChangingHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    origin: CUSTOMER_AUTH_HTTP_TEST_ORIGIN,
    ...extra,
  };
}

function assertNoRawSecretsInResponseText(text: string, rawOtpCodes: readonly string[]) {
  expect(text).not.toMatch(/postgresql:\/\//i);
  for (const code of rawOtpCodes) {
    expect(text).not.toContain(code);
  }
}

describe("IMP-009 HTTP: health endpoints", () => {
  it("GET /health/live returns 200 without requiring an Origin header", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/live`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ok: true });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-request-id")).toBeTruthy();
    });
  });

  it("GET /health/ready returns 200 when persistence and the OTP provider are ready", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/ready`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  it("POST /health/live is 405 with an Allow header", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health/live`, { method: "POST" });
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    });
  });

  it("an unknown path is 404", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/nope`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ ok: false, code: "NOT_FOUND" });
    });
  });
});

describe("IMP-009 HTTP: origin enforcement on state-changing endpoints", () => {
  it("rejects send-otp with a missing Origin header", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: PHONE_A }),
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, code: "INVALID_REQUEST" });
    });
  });

  it("rejects send-otp with an untrusted Origin header", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders({ origin: "https://evil.example" }),
        body: JSON.stringify({ phoneNumber: PHONE_A }),
      });
      expect(response.status).toBe(403);
    });
  });

  it("rejects send-otp with a disallowed query-string field", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(
        `${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}?phoneNumber=${encodeURIComponent(PHONE_A)}`,
        {
          method: "POST",
          headers: stateChangingHeaders(),
          body: JSON.stringify({ phoneNumber: PHONE_A }),
        },
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, code: "INVALID_REQUEST" });
    });
  });

  it("does not require an Origin header for the read-only session endpoint", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.session}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ authenticated: false });
    });
  });
});

describe("IMP-009 HTTP: send-otp", () => {
  it("rejects an invalid phone number", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: INVALID_PHONE }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, code: "INVALID_PHONE_NUMBER" });
    });
  });

  it("accepts a valid phone number, never echoing the generated code back", async () => {
    await withRunningService(async ({ baseUrl, otpProvider }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A }),
      });
      expect(response.status).toBe(202);
      const bodyText = await response.text();
      const body = JSON.parse(bodyText) as { ok: boolean; code: string; retryAfterSeconds: number };
      expect(body).toEqual({ ok: true, code: "OTP_REQUEST_ACCEPTED", retryAfterSeconds: expect.any(Number) });

      const activeCode = otpProvider.__testOnly_getActiveCode(PHONE_A);
      expect(activeCode).toMatch(/^\d{6}$/);
      // The response body's only "code" field is the fixed status literal
      // above — the real six-digit OTP is never present anywhere in it.
      expect(bodyText).not.toContain(activeCode!);
    });
  });

  it("rate-limits a second send-otp for the same phone within the 60-second window", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const first = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_B }),
      });
      expect(first.status).toBe(202);

      const second = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_B }),
      });
      expect(second.status).toBe(429);
      expect(Number(second.headers.get("retry-after"))).toBeGreaterThan(0);
      const body = (await second.json()) as { ok: boolean; code: string; retryAfterSeconds: number };
      expect(body.ok).toBe(false);
      expect(body.code).toBe("OTP_RATE_LIMITED");
      expect(body.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  it("405s a GET on the send-otp path with an Allow header", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        headers: stateChangingHeaders(),
      });
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    });
  });
});

describe("IMP-009 HTTP: verify-otp, session, and sign-out", () => {
  it("rejects verification with the wrong code", async () => {
    await withRunningService(async ({ baseUrl, otpProvider }) => {
      const now = new Date();
      await otpProvider.startVerification({
        phoneNumber: PHONE_A,
        generatedCode: "123456",
        now,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
      });

      const response = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A, code: "000000" }),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ authenticated: false, code: "OTP_INVALID_OR_EXPIRED" });
    });
  });

  it("verifies the correct code, sets a session cookie, and the session/sign-out flow round-trips", async () => {
    await withRunningService(async ({ baseUrl, otpProvider }) => {
      const sendResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A }),
      });
      expect(sendResponse.status).toBe(202);
      const activeCode = otpProvider.__testOnly_getActiveCode(PHONE_A)!;

      const verifyResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A, code: activeCode }),
      });
      expect(verifyResponse.status).toBe(200);
      const verifyBodyText = await verifyResponse.text();
      expect(JSON.parse(verifyBodyText)).toEqual({ authenticated: true });
      assertNoRawSecretsInResponseText(verifyBodyText, [activeCode]);

      const setCookies = verifyResponse.headers.getSetCookie();
      expect(setCookies.length).toBeGreaterThan(0);
      const sessionCookiePair = setCookies
        .map((raw) => raw.split(";")[0]!)
        .find((pair) => pair.includes("session_token"));
      expect(sessionCookiePair).toBeTruthy();
      expect(sessionCookiePair).toMatch(/^boba-customer\.session_token=/);

      const sessionResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: sessionCookiePair! },
      });
      expect(sessionResponse.status).toBe(200);
      const sessionBody = (await sessionResponse.json()) as { authenticated: boolean; user?: { id: string } };
      expect(sessionBody.authenticated).toBe(true);
      expect(sessionBody.user?.id).toBeTruthy();

      const signOutResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.signOut}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: sessionCookiePair! }),
      });
      expect(signOutResponse.status).toBe(200);
      expect(await signOutResponse.json()).toEqual({ authenticated: false });

      const afterSignOut = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: sessionCookiePair! },
      });
      expect(await afterSignOut.json()).toEqual({ authenticated: false });
    });
  });

  it("rejects sign-out without a trusted Origin even with a valid session cookie", async () => {
    await withRunningService(async ({ baseUrl, otpProvider }) => {
      const sendResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_B }),
      });
      expect(sendResponse.status).toBe(202);
      const activeCode = otpProvider.__testOnly_getActiveCode(PHONE_B)!;
      const verifyResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_B, code: activeCode }),
      });
      const sessionCookiePair = verifyResponse.headers
        .getSetCookie()
        .map((raw) => raw.split(";")[0]!)
        .find((pair) => pair.includes("session_token"))!;

      const signOutResponse = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.signOut}`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: sessionCookiePair },
      });
      expect(signOutResponse.status).toBe(403);

      const stillAuthenticated = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: sessionCookiePair },
      });
      expect((await stillAuthenticated.json())).toEqual({
        authenticated: true,
        user: expect.objectContaining({ id: expect.any(String) }),
      });
    });
  });

  it("405s a GET on verify-otp and sign-out", async () => {
    await withRunningService(async ({ baseUrl }) => {
      const verify = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp}`, {
        headers: stateChangingHeaders(),
      });
      expect(verify.status).toBe(405);

      const signOut = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.signOut}`, {
        headers: stateChangingHeaders(),
      });
      expect(signOut.status).toBe(405);
    });
  });
});

describe("IMP-009 HTTP: no OTP/phone/secret ever appears in a response", () => {
  it("every response body across the full send/verify/session/sign-out flow is free of the raw phone number and OTP", async () => {
    await withRunningService(async ({ baseUrl, otpProvider }) => {
      const bodies: string[] = [];

      const send = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A }),
      });
      bodies.push(await send.text());
      const activeCode = otpProvider.__testOnly_getActiveCode(PHONE_A)!;

      const verify = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp}`, {
        method: "POST",
        headers: stateChangingHeaders(),
        body: JSON.stringify({ phoneNumber: PHONE_A, code: activeCode }),
      });
      const setCookies = verify.headers.getSetCookie();
      bodies.push(await verify.text());

      const sessionCookiePair = setCookies
        .map((raw) => raw.split(";")[0]!)
        .find((pair) => pair.includes("session_token"))!;
      const session = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.session}`, {
        headers: { cookie: sessionCookiePair },
      });
      bodies.push(await session.text());

      const signOut = await fetch(`${baseUrl}${CUSTOMER_AUTH_PUBLIC_PATHS.signOut}`, {
        method: "POST",
        headers: stateChangingHeaders({ cookie: sessionCookiePair }),
      });
      bodies.push(await signOut.text());

      for (const body of bodies) {
        expect(body).not.toContain(PHONE_A);
        expect(body).not.toContain(activeCode);
        expect(body).not.toMatch(/postgresql:\/\//i);
        expect(body).not.toMatch(/@phone\.invalid/);
      }
    });
  });
});
