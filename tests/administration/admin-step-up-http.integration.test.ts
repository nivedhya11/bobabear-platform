/**
 * Admin HTTP step-up negatives (IMP-038 Tranche C).
 *
 * Complements DB-level grant/consume proofs with real Admin route enforcement:
 * missing, expired, replayed, and class-mismatch proofs fail closed.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, inject, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  grantStepUpProof,
  hashStepUpSessionToken,
  extractWorkforceSessionTokenFromCookieHeader,
} from "../../src/server/security/step-up";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import {
  mintStepUpProofId,
  withStepUpProofHeader,
  WORKFORCE_STEP_UP_PROOF_HEADER,
} from "../support/workforce-step-up";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

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
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

function workforceAuthConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "admin-stepup-customer-auth-secret-32chars",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "admin-stepup-workforce-auth-secret-32ch",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
}

async function signedCookie(token: string): Promise<string> {
  const cookie = await serializeSignedCookie(
    WORKFORCE_AUTH_SESSION_COOKIE_NAME,
    token,
    workforceAuthConfig().workforce.secret,
  );
  return cookie.split(";", 1)[0]!;
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-038 Admin HTTP step-up negatives", () => {
  it("rejects missing, expired, replayed, and class-mismatch proofs on membership create", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx));
      const admin = await createEligibleWorkforceUser(persistence);
      const subject = await createEligibleWorkforceUser(persistence);
      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: admin.id,
          scope: { scopeType: "platform" },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "platform_super_admin" });
      });

      const secret = workforceAuthConfig().workforce.secret;
      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);
      const auth = await runtime.getAuth();
      const adapter = (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
      const server = createServer((req, res) => {
        void routeOperationsRequest(
          req,
          res,
          {
            runtime,
            persistence,
            trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
            stepUpSessionHashSecret: secret,
          },
          "admin-stepup-negatives",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const request = (path: string, init?: RequestInit) => fetch(`${base}${path}`, init);

      try {
        const session = await adapter.createSession(admin.id);
        const headers: Record<string, string> = {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
        };
        const createBody = {
          workforceUserId: subject.id,
          scopeType: "outlet",
          brandId: tree.brand.id,
          organizationId: tree.orgA.id,
          territoryId: tree.terrA.id,
          outletId: tree.outletA.id,
          status: "invited",
        };

        const missing = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers,
          body: JSON.stringify(createBody),
        });
        expect([missing.status, (await missing.json()).code]).toEqual([401, "STEP_UP_REQUIRED"]);

        const sessionToken = extractWorkforceSessionTokenFromCookieHeader(headers.cookie);
        if (!sessionToken) throw new Error("expected session cookie");
        const sessionTokenHash = hashStepUpSessionToken(secret, sessionToken);
        const expiredNow = new Date("2020-01-01T00:00:00.000Z");
        const expired = await persistence.transaction((tx) =>
          grantStepUpProof(tx, {
            sessionTokenHash,
            workforceUserId: admin.id,
            actionClass: "CLASS_ACCESS_MUTATION",
            grantMethod: "totp",
            now: expiredNow,
            ttlSeconds: 300,
          }),
        );
        const expiredResponse = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: withStepUpProofHeader(headers, expired.proofId),
          body: JSON.stringify(createBody),
        });
        expect([expiredResponse.status, (await expiredResponse.json()).code]).toEqual([
          403,
          "STEP_UP_EXPIRED",
        ]);

        const mismatchProof = await mintStepUpProofId({
          persistence,
          sessionHashSecret: secret,
          workforceUserId: admin.id,
          cookieHeader: headers.cookie,
          actionClass: "CLASS_FINANCIAL_REVERSAL",
        });
        const mismatch = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: withStepUpProofHeader(headers, mismatchProof),
          body: JSON.stringify(createBody),
        });
        expect([mismatch.status, (await mismatch.json()).code]).toEqual([
          403,
          "STEP_UP_CLASS_MISMATCH",
        ]);

        const replayProof = await mintStepUpProofId({
          persistence,
          sessionHashSecret: secret,
          workforceUserId: admin.id,
          cookieHeader: headers.cookie,
          actionClass: "CLASS_ACCESS_MUTATION",
        });
        const first = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: withStepUpProofHeader(headers, replayProof),
          body: JSON.stringify(createBody),
        });
        expect(first.status).toBe(200);

        const subject2 = await createEligibleWorkforceUser(persistence);
        const replay = await request("/api/admin/v1/memberships", {
          method: "POST",
          headers: {
            ...headers,
            [WORKFORCE_STEP_UP_PROOF_HEADER]: replayProof,
          },
          body: JSON.stringify({ ...createBody, workforceUserId: subject2.id }),
        });
        expect([replay.status, (await replay.json()).code]).toEqual([403, "STEP_UP_REPLAY"]);

        expect(randomUUID().length).toBeGreaterThan(0);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });
  }, 120_000);
});
