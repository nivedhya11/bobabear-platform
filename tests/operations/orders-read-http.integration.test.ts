/** Operations Order read HTTP transport integration (IMP-029). */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { listCustomerOrders } from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { applicationConfig } from "../database/support/cart-fixtures";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import {
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";

type InternalAdapter = {
  createSession: (userId: string) => Promise<{ token: string }>;
};

const MISSING_ORDER_ID = "00000000-0000-4000-8000-000000000099";

function workforceAuthConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "operations-read-customer-auth-secret-32chars!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "operations-read-workforce-auth-secret-32c",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
}

/** Better Auth getSession requires a signed session cookie, not a raw token. */
async function signedWorkforceSessionCookie(token: string): Promise<string> {
  const setCookie = await serializeSignedCookie(
    WORKFORCE_AUTH_SESSION_COOKIE_NAME,
    token,
    workforceAuthConfig().workforce.secret,
  );
  return setCookie.split(";", 1)[0]!;
}

async function adapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  return (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
}

async function placeSucceededOrder(h: Parameters<typeof withPaymentReadyHarness>[0] extends (value: infer T) => unknown ? T : never) {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const options = paymentOpts(provider);
  const started = await startPayment(h.persistence, h.actor, {
    checkoutId: h.checkoutId,
    expectedCheckoutRevision: h.revision,
    paymentMethodIntent: "upi",
    idempotencyKey: newIdempotencyKey("operations-read"),
  }, options);
  await verifyAndProcessWebhook(h.persistence, provider, {
    executionIdentity: started.attempt.providerExecutionIdentity,
    outcome: "succeed",
    amountPaise: started.payment.expectedAmountPaise,
    providerEventId: `operations-read-${started.attempt.id}`,
  }, options);
  const orders = await listCustomerOrders(h.persistence, h.actor, { limit: 5 });
  return orders.items[0]!;
}

async function grantOutletReadUser(
  h: Parameters<typeof withPaymentReadyHarness>[0] extends (value: infer T) => unknown ? T : never,
  outlet: "A" | "B",
): Promise<string> {
  const user = await createEligibleWorkforceUser(h.persistence);
  const tree = h.actors.tree;
  const selected = outlet === "A"
    ? { outlet: tree.outletA, organization: tree.orgA, territory: tree.terrA }
    : { outlet: tree.outletB, organization: tree.orgB, territory: tree.terrB };
  await h.persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: {
        scopeType: "outlet",
        brandId: tree.brand.id,
        organizationId: selected.organization.id,
        territoryId: selected.territory.id,
        outletId: selected.outlet.id,
      },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey: "kitchen_operator" });
  });
  return user.id;
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-029 Operations Order read HTTP", () => {
  it("uses trusted sessions and existing Order read authority without leaking scope", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(h.connectionString),
      });
      const adapter = await adapterFor(runtime);
      const scopedUserId = await grantOutletReadUser(h, "A");
      const outsideUserId = await grantOutletReadUser(h, "B");
      const noPermissionUser = await createEligibleWorkforceUser(h.persistence);
      const scopedSession = await adapter.createSession(scopedUserId);
      const outsideSession = await adapter.createSession(outsideUserId);
      const noPermissionSession = await adapter.createSession(noPermissionUser.id);

      const server = createServer((req, res) => {
        void routeOperationsRequest(req, res, { runtime, persistence: h.persistence }, "operations-test-request");
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const request = (path: string, init: RequestInit = {}) => fetch(`${base}${path}`, init);
      const workforceHeaders = async (token: string, extra: HeadersInit = {}) => ({
        cookie: await signedWorkforceSessionCookie(token),
        ...extra,
      });

      try {
        let response = await request("/api/operations/v1/orders");
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });

        response = await request("/api/operations/v1/orders", {
          headers: await workforceHeaders(noPermissionSession.token),
        });
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ code: "ORDER_UNAUTHORIZED" });

        response = await request("/api/operations/v1/orders", {
          headers: await workforceHeaders(scopedSession.token, {
            "x-workforce-user-id": outsideUserId,
            "x-workforce-role": "admin",
            "x-workforce-permission": "order.read",
            "x-outlet-id": h.actors.tree.outletB.id,
          }),
        });
        expect(response.status).toBe(200);
        const collection = await response.json();
        expect(collection.items.map((item: { orderId: string }) => item.orderId)).toContain(order.orderId);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("x-request-id")).toBe("operations-test-request");
        expect(JSON.stringify(collection)).toContain(`"${order.money.grandTotalMinor}"`);

        response = await request(`/api/operations/v1/orders?outletId=${h.actors.tree.outletA.id}`, {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect(response.status).toBe(200);
        expect((await response.json()).items.map((item: { orderId: string }) => item.orderId)).toContain(order.orderId);

        response = await request(`/api/operations/v1/orders?outletId=${h.actors.tree.outletB.id}`, {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ code: "ORDER_NOT_FOUND" });

        response = await request(`/api/operations/v1/orders/${order.orderId}`, {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect(response.status).toBe(200);
        expect((await response.json()).order).toMatchObject({ orderId: order.orderId });

        const outside = await request(`/api/operations/v1/orders/${order.orderId}`, {
          headers: await workforceHeaders(outsideSession.token),
        });
        const missing = await request(`/api/operations/v1/orders/${MISSING_ORDER_ID}`, {
          headers: await workforceHeaders(outsideSession.token),
        });
        expect([outside.status, (await outside.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);
        expect([missing.status, (await missing.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);

        response = await request("/api/operations/v1/orders/not-a-uuid", {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);

        response = await request("/api/operations/v1/orders?unknown=value", {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);

        response = await request("/api/operations/v1/orders?cursor=malformed", {
          headers: await workforceHeaders(scopedSession.token),
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_CURSOR_INVALID"]);

        response = await request("/api/operations/v1/orders", { method: "POST" });
        expect(response.status).toBe(405);
        expect(response.headers.get("allow")).toBe("GET");
        response = await request(`/api/operations/v1/orders/${order.orderId}`, { method: "POST" });
        expect(response.status).toBe(405);
        expect(response.headers.get("allow")).toBe("GET");
        response = await request("/api/operations/v1/unknown");
        expect([response.status, (await response.json()).code]).toEqual([404, "NOT_FOUND"]);
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await runtime.close();
      }
    });
  });
});
