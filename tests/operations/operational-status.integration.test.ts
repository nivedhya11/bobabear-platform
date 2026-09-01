/** Operations operational status API integration (IMP-036). */
import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { OperationsService } from "../../src/server/operations/service";
import { applicationConfig } from "../database/support/cart-fixtures";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import { closeTrackedPersistenceHandles, withPaymentReadyHarness } from "../database/support/payment-fixtures";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function authConfig() {
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "ops-status-customer-auth-secret-32chars!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "ops-status-workforce-auth-secret-32chars",
    WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
  }, "test").workforce;
}

async function signedCookie(token: string): Promise<string> {
  const setCookie = await serializeSignedCookie(
    WORKFORCE_AUTH_SESSION_COOKIE_NAME,
    token,
    authConfig().secret,
  );
  return setCookie.split(";", 1)[0]!;
}

async function adapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  return (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
}

afterEach(async () => { await closeTrackedPersistenceHandles(); });

describe("IMP-036 operational status API", () => {
  it("denies unauthenticated and unauthorized callers and redacts secrets for authorized reads", async () => {
    await withPaymentReadyHarness(async (h) => {
      const service = new OperationsService({
        auth: authConfig(),
        persistenceConfig: applicationConfig(h.connectionString),
        trustedOrigin: authConfig().baseURL.origin,
        host: "127.0.0.1",
        port: 0,
        enableNotificationOutboxProcessor: false,
      });

      try {
        await service.start();
        const port = service.boundPort;
        expect(port).not.toBeNull();
        const baseUrl = `http://127.0.0.1:${port}`;

        const unauthenticated = await fetch(`${baseUrl}/api/operations/v1/operational-status`);
        expect(unauthenticated.status).toBe(401);
        expect((await unauthenticated.json()).code).toBe("WORKFORCE_AUTH_REQUIRED");

        const runtime = getWorkforceAuthRuntime({
          auth: authConfig(),
          persistence: applicationConfig(h.connectionString),
        });
        try {
          const user = await createEligibleWorkforceUser(h.persistence);
          const adapter = await adapterFor(runtime);
          const session = await adapter.createSession(user.id);
          const unauthorized = await fetch(`${baseUrl}/api/operations/v1/operational-status`, {
            headers: { cookie: await signedCookie(session.token) },
          });
          expect(unauthorized.status).toBe(403);
          expect((await unauthorized.json()).code).toBe("ORDER_UNAUTHORIZED");

          await h.persistence.transaction(async (tx) => {
            const membership = await createMembership(tx, {
              workforceUserId: user.id,
              scope: {
                scopeType: "outlet",
                brandId: h.actors.tree.brand.id,
                organizationId: h.actors.tree.orgA.id,
                territoryId: h.actors.tree.terrA.id,
                outletId: h.actors.tree.outletA.id,
              },
              status: "active",
            });
            await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
          });

          const authorized = await fetch(`${baseUrl}/api/operations/v1/operational-status`, {
            headers: { cookie: await signedCookie(session.token) },
          });
          expect(authorized.status).toBe(200);
          const body = await authorized.json() as Record<string, unknown>;
          expect(body.ok).toBe(true);
          expect(body.service).toBe("operations");
          expect(typeof body.uptimeSeconds).toBe("number");
          expect(body.queues).toEqual(expect.objectContaining({
            notificationOutboxPending: expect.any(Number),
            paymentInboxPending: expect.any(Number),
          }));
          expect(JSON.stringify(body)).not.toMatch(/secret|password|token|session/i);
        } finally {
          await runtime.close();
        }
      } finally {
        await service.close();
      }
    });
  });
});
