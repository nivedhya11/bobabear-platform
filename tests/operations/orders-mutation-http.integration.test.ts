/** Operations Order mutation HTTP transport integration (IMP-029). */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { acceptOrder, cancelOrder, fulfilOrder, listCustomerOrders } from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import { resolveOperationsWorkforcePrincipal } from "../../src/server/operations/http/auth";
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

type Harness = Parameters<typeof withPaymentReadyHarness>[0] extends (value: infer T) => unknown ? T : never;
type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function workforceAuthConfig() {
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "operations-mutation-customer-auth-32chars!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "operations-mutation-workforce-auth-32char",
    WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
  }, "test");
}

function transportValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, entry: unknown) => typeof entry === "bigint" ? entry.toString(10) : entry));
}

async function signedCookie(token: string): Promise<string> {
  const cookie = await serializeSignedCookie(WORKFORCE_AUTH_SESSION_COOKIE_NAME, token, workforceAuthConfig().workforce.secret);
  return cookie.split(";", 1)[0]!;
}

async function adapterFor(runtime: { getAuth: () => Promise<{ $context: Promise<unknown> }> }): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  return (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
}

async function placeSucceededOrder(h: Harness) {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const options = paymentOpts(provider);
  const started = await startPayment(h.persistence, h.actor, {
    checkoutId: h.checkoutId,
    expectedCheckoutRevision: h.revision,
    paymentMethodIntent: "upi",
    idempotencyKey: newIdempotencyKey("operations-mutation"),
  }, options);
  await verifyAndProcessWebhook(h.persistence, provider, {
    executionIdentity: started.attempt.providerExecutionIdentity,
    outcome: "succeed",
    amountPaise: started.payment.expectedAmountPaise,
    providerEventId: `operations-mutation-${started.attempt.id}`,
  }, options);
  return (await listCustomerOrders(h.persistence, h.actor, { limit: 5 })).items[0]!;
}

async function grantOutletUser(h: Harness, roleKey: "outlet_manager" | "kitchen_operator", outlet: "A" | "B" = "A"): Promise<string> {
  const user = await createEligibleWorkforceUser(h.persistence);
  const tree = h.actors.tree;
  const selected = outlet === "A"
    ? { outlet: tree.outletA, organization: tree.orgA, territory: tree.terrA }
    : { outlet: tree.outletB, organization: tree.orgB, territory: tree.terrB };
  await h.persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, { workforceUserId: user.id, scope: {
      scopeType: "outlet", brandId: tree.brand.id, organizationId: selected.organization.id,
      territoryId: selected.territory.id, outletId: selected.outlet.id,
    }, status: "active" });
    await grantRole(tx, { membershipId: membership.id, roleKey });
  });
  return user.id;
}

async function withOperationsServer(h: Harness, run: (value: {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  runtime: ReturnType<typeof getWorkforceAuthRuntime>;
  adapter: InternalAdapter;
  headers: (token: string, extra?: HeadersInit) => Promise<HeadersInit>;
}) => Promise<void>): Promise<void> {
  const runtime = getWorkforceAuthRuntime({ auth: workforceAuthConfig().workforce, persistence: applicationConfig(h.connectionString) });
  const adapter = await adapterFor(runtime);
  const server = createServer((req, res) => {
    void routeOperationsRequest(req, res, {
      runtime, persistence: h.persistence, trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
    }, "operations-mutation-request");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  try {
    await run({
      request: (path, init = {}) => fetch(`http://127.0.0.1:${address.port}${path}`, init), runtime, adapter,
      headers: async (token, extra = {}) => ({ cookie: await signedCookie(token), origin: workforceAuthConfig().workforce.baseURL.origin, "content-type": "application/json", ...extra }),
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await runtime.close();
  }
}

afterEach(async () => { await closeTrackedPersistenceHandles(); });

describe("IMP-029 Operations Order mutation HTTP", () => {
  it("accepts through trusted authority, preserves replay projection, and rejects boundary bypasses", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      const kitchenId = await grantOutletUser(h, "kitchen_operator");
      const outsideId = await grantOutletUser(h, "outlet_manager", "B");
      await withOperationsServer(h, async ({ request, runtime, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const kitchen = await adapter.createSession(kitchenId);
        const outside = await adapter.createSession(outsideId);
        let response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(manager.token, { "sec-fetch-site": "cross-site" }), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept?role=admin`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        const cookie = await signedCookie(manager.token);
        for (const [body, contentType] of [
          ["", "application/json"],
          ["{", "application/json"],
          ["null", "application/json"],
          ["[]", "application/json"],
          ['"1"', "application/json"],
          ['{"unexpected":true}', "application/json"],
          ['{"expectedOrderRevision":"1"}', "text/plain"],
        ]) {
          response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: { cookie, origin: workforceAuthConfig().workforce.baseURL.origin, "content-type": contentType }, body });
          expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        }
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: { cookie, origin: workforceAuthConfig().workforce.baseURL.origin }, body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(manager.token), body: `{${JSON.stringify("x".repeat(64 * 1024))}}` });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers("bad-token"), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(outside.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(manager.token, { "x-workforce-user-id": kitchenId, "x-workforce-role": "admin", "x-workforce-permission": "order.cancel", "x-outlet-id": h.actors.tree.outletB.id }), body: '{"expectedOrderRevision":"1"}' });
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("x-request-id")).toBe("operations-mutation-request");
        const accepted = await response.json();
        expect(accepted.order.revision).toBe("2");
        const managerPrincipal = await resolveOperationsWorkforcePrincipal(runtime, { cookie: await signedCookie(manager.token) });
        if (!managerPrincipal) throw new Error("Expected principal");
        expect(accepted.order).toEqual(transportValue(await acceptOrder(h.persistence, managerPrincipal, { orderId: order.orderId, expectedOrderRevision: BigInt(2) })));
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(kitchen.token), body: '{"expectedOrderRevision":"2"}' });
        expect(response.status).toBe(200);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":2}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request("/api/operations/v1/orders", { method: "POST" });
        expect([response.status, response.headers.get("allow")]).toEqual([405, "GET"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}`, { method: "POST" });
        expect([response.status, response.headers.get("allow")]).toEqual([405, "GET"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { method: "POST", headers: await headers(manager.token), body: '{"orderId":"00000000-0000-4000-8000-000000000099","expectedOrderRevision":"2"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
      });
    });
  });

  it("fulfils only after existing lifecycle acceptance and preserves authoritative replay", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      const kitchenId = await grantOutletUser(h, "kitchen_operator");
      await withOperationsServer(h, async ({ request, runtime, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const kitchen = await adapter.createSession(kitchenId);
        let response = await request(`/api/operations/v1/orders/${order.orderId}/fulfil`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_FULFIL_NOT_ALLOWED"]);
        const principal = await resolveOperationsWorkforcePrincipal(runtime, { cookie: await signedCookie(manager.token) });
        if (!principal) throw new Error("Expected principal");
        await acceptOrder(h.persistence, principal, { orderId: order.orderId, expectedOrderRevision: BigInt(1) });
        response = await request(`/api/operations/v1/orders/${order.orderId}/fulfil`, { method: "POST", headers: await headers(kitchen.token), body: '{"expectedOrderRevision":"2"}' });
        expect(response.status).toBe(200);
        const fulfilled = await response.json();
        expect(fulfilled.order).toEqual(transportValue(await fulfilOrder(h.persistence, principal, { orderId: order.orderId, expectedOrderRevision: BigInt(3) })));
        response = await request(`/api/operations/v1/orders/${order.orderId}/fulfil`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"2"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_CONFLICT"]);
      });
    });
  });

  it("cancels with existing permission, parser, state, and replay semantics", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      const kitchenId = await grantOutletUser(h, "kitchen_operator");
      await withOperationsServer(h, async ({ request, runtime, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const kitchen = await adapter.createSession(kitchenId);
        let response = await request(`/api/operations/v1/orders/${order.orderId}/cancel`, { method: "POST", headers: await headers(kitchen.token), body: '{"expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_UNAUTHORIZED"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_CANCELLATION_REASON_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect(response.status).toBe(200);
        const cancelled = await response.json();
        const principal = await resolveOperationsWorkforcePrincipal(runtime, { cookie: await signedCookie(manager.token) });
        if (!principal) throw new Error("Expected principal");
        expect(cancelled.order).toEqual(transportValue(await cancelOrder(h.persistence, principal, { orderId: order.orderId, expectedOrderRevision: BigInt(2), cancellationReasonCode: "CUSTOMER_REQUESTED" })));
        response = await request(`/api/operations/v1/orders/${order.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"2","cancellationReasonCode":"BUSINESS_DECISION"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_CANCEL_NOT_ALLOWED"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, { headers: await headers(manager.token) });
        expect([response.status, response.headers.get("allow")]).toEqual([405, "POST"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/fulfil`, { headers: await headers(manager.token) });
        expect([response.status, response.headers.get("allow")]).toEqual([405, "POST"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/cancel`, { headers: await headers(manager.token) });
        expect([response.status, response.headers.get("allow")]).toEqual([405, "POST"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept/extra`);
        expect([response.status, (await response.json()).code]).toEqual([404, "NOT_FOUND"]);
      });
    });
  });
});
