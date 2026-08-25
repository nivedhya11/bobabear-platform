/** Operations Order mutation HTTP transport integration (IMP-029). */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { addCartLine } from "../../src/server/cart";
import { acceptOrder, cancelOrder, fulfilOrder, getWorkforceOrder, listCustomerOrders } from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import { resolveOperationsWorkforcePrincipal } from "../../src/server/operations/http/auth";
import { readOperationsJsonObjectBody } from "../../src/server/operations/http/body";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { applicationConfig, customerActorFromAuthenticatedSession, seedCustomerAuthUser } from "../database/support/cart-fixtures";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import {
  closeTrackedPersistenceHandles,
  bringCheckoutToReady,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";
import { createSavedAddressForCustomer } from "../database/support/checkout-fixtures";

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

async function placeSecondSucceededOrder(h: Harness) {
  const customerId = `operations-mutation-${randomUUID()}`;
  await seedCustomerAuthUser(h.connectionString, customerId);
  const actor = await customerActorFromAuthenticatedSession(h.connectionString, customerId);
  const added = await addCartLine(h.persistence, {
    kind: "customer", actor, brandId: h.actors.tree.brand.id,
  }, { variantId: h.catalog.variantId, quantity: 1 });
  const address = await createSavedAddressForCustomer(h.persistence, customerId);
  const ready = await bringCheckoutToReady(h.persistence, actor, added.cart.id, address.id);
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const options = paymentOpts(provider);
  const started = await startPayment(h.persistence, actor, {
    checkoutId: ready.checkoutId,
    expectedCheckoutRevision: ready.revision,
    paymentMethodIntent: "upi",
    idempotencyKey: newIdempotencyKey("operations-mutation-second"),
  }, options);
  await verifyAndProcessWebhook(h.persistence, provider, {
    executionIdentity: started.attempt.providerExecutionIdentity,
    outcome: "succeed",
    amountPaise: started.payment.expectedAmountPaise,
    providerEventId: `operations-mutation-second-${started.attempt.id}`,
  }, options);
  return (await listCustomerOrders(h.persistence, actor, { limit: 5 })).items[0]!;
}

async function grantOutletUser(h: Harness, roleKey: "outlet_manager" | "kitchen_operator" | "delivery_coordinator" | "support_refund_operator", outlet: "A" | "B" = "A"): Promise<string> {
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
  it("rejects unauthenticated, malformed-origin, forged-body, raw-control, and unknown-action mutation requests", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const acceptedBody = '{"expectedOrderRevision":"1"}';
        for (const origin of [
          workforceAuthConfig().workforce.baseURL.origin,
          "https://trusted.example/path",
          "null",
          "https://untrusted.example",
        ]) {
          const response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: acceptedBody,
          });
          if (origin === workforceAuthConfig().workforce.baseURL.origin) {
            expect([response.status, (await response.json()).code]).toEqual([401, "WORKFORCE_AUTH_REQUIRED"]);
          } else {
            expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_REQUEST_INVALID"]);
          }
        }
        let response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, {
          method: "POST", headers: await headers(manager.token),
          body: '{"expectedOrderRevision":"1","actorId":"forged","role":"admin","permission":"order.accept","scopeApproved":true}',
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/accept`, {
          method: "POST", headers: await headers(manager.token),
          body: `{"expectedOrderRevision":"1","note":"raw${String.fromCharCode(1)}control"}`,
        });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${order.orderId}/something-else`, { method: "POST" });
        expect(response.status).toBe(404);
      });
    });
  });

  it("proves accept permission, revision, non-disclosure, and lifecycle rejection behavior", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      const deliveryId = await grantOutletUser(h, "delivery_coordinator");
      const outsideId = await grantOutletUser(h, "outlet_manager", "B");
      await withOperationsServer(h, async ({ request, runtime, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const delivery = await adapter.createSession(deliveryId);
        const outside = await adapter.createSession(outsideId);
        let response = await request(`/api/operations/v1/orders/${placed.orderId}/accept`, { method: "POST", headers: await headers(delivery.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_UNAUTHORIZED"]);
        const missing = await request("/api/operations/v1/orders/00000000-0000-4000-8000-000000000099/accept", { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1"}' });
        const outOfScope = await request(`/api/operations/v1/orders/${placed.orderId}/accept`, { method: "POST", headers: await headers(outside.token), body: '{"expectedOrderRevision":"1"}' });
        expect([missing.status, (await missing.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);
        expect([outOfScope.status, (await outOfScope.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);
        const principal = await resolveOperationsWorkforcePrincipal(runtime, { cookie: await signedCookie(manager.token) });
        if (!principal) throw new Error("Expected principal");
        await acceptOrder(h.persistence, principal, { orderId: placed.orderId, expectedOrderRevision: BigInt(1) });
        response = await request(`/api/operations/v1/orders/${placed.orderId}/accept`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_CONFLICT"]);
        await fulfilOrder(h.persistence, principal, { orderId: placed.orderId, expectedOrderRevision: BigInt(2) });
        response = await request(`/api/operations/v1/orders/${placed.orderId}/accept`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"3"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_ACCEPT_NOT_ALLOWED"]);
      });
    });
  });

  it("proves fulfil and cancel mutations enforce permission, scope, state, body target, and query boundaries", async () => {
    await withPaymentReadyHarness(async (h) => {
      const fulfilTarget = await placeSucceededOrder(h);
      const cancelled = await placeSecondSucceededOrder(h);
      const cancelTarget = await placeSecondSucceededOrder(h);
      const substitute = await placeSecondSucceededOrder(h);
      const fulfilled = await placeSecondSucceededOrder(h);
      const managerId = await grantOutletUser(h, "outlet_manager");
      const kitchenId = await grantOutletUser(h, "kitchen_operator");
      const outsideId = await grantOutletUser(h, "outlet_manager", "B");
      const supportId = await grantOutletUser(h, "support_refund_operator");
      await withOperationsServer(h, async ({ request, runtime, adapter, headers }) => {
        const manager = await adapter.createSession(managerId);
        const kitchen = await adapter.createSession(kitchenId);
        const outside = await adapter.createSession(outsideId);
        const support = await adapter.createSession(supportId);
        const principal = await resolveOperationsWorkforcePrincipal(runtime, { cookie: await signedCookie(manager.token) });
        if (!principal) throw new Error("Expected principal");
        await acceptOrder(h.persistence, principal, { orderId: fulfilTarget.orderId, expectedOrderRevision: BigInt(1) });
        await cancelOrder(h.persistence, principal, { orderId: cancelled.orderId, expectedOrderRevision: BigInt(1), cancellationReasonCode: "CUSTOMER_REQUESTED" });
        await acceptOrder(h.persistence, principal, { orderId: cancelTarget.orderId, expectedOrderRevision: BigInt(1) });
        await acceptOrder(h.persistence, principal, { orderId: substitute.orderId, expectedOrderRevision: BigInt(1) });
        await acceptOrder(h.persistence, principal, { orderId: fulfilled.orderId, expectedOrderRevision: BigInt(1) });
        await fulfilOrder(h.persistence, principal, { orderId: fulfilled.orderId, expectedOrderRevision: BigInt(2) });
        let response = await request(`/api/operations/v1/orders/${fulfilTarget.orderId}/fulfil`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"2"}' });
        expect([response.status, (await response.json()).order.status]).toEqual([200, "FULFILLED"]);
        response = await request(`/api/operations/v1/orders/${cancelled.orderId}/fulfil`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"2"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_FULFIL_NOT_ALLOWED"]);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/fulfil`, { method: "POST", headers: await headers(support.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([403, "ORDER_UNAUTHORIZED"]);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/fulfil`, { method: "POST", headers: await headers(outside.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([404, "ORDER_NOT_FOUND"]);
        const fulfilSubstituteBefore = await getWorkforceOrder(h.persistence, principal, { orderId: substitute.orderId });
        const fulfilBodyTargetBefore = await getWorkforceOrder(h.persistence, principal, { orderId: cancelTarget.orderId });
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/fulfil`, { method: "POST", headers: await headers(kitchen.token), body: `{"orderId":"${cancelTarget.orderId}","expectedOrderRevision":"1"}` });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        expect(await getWorkforceOrder(h.persistence, principal, { orderId: substitute.orderId })).toEqual(fulfilSubstituteBefore);
        expect(await getWorkforceOrder(h.persistence, principal, { orderId: cancelTarget.orderId })).toEqual(fulfilBodyTargetBefore);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/fulfil?role=admin`, { method: "POST", headers: await headers(kitchen.token), body: '{"expectedOrderRevision":"1"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        response = await request(`/api/operations/v1/orders/${cancelTarget.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"2","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect([response.status, (await response.json()).order.status]).toEqual([200, "CANCELLED"]);
        response = await request(`/api/operations/v1/orders/${fulfilled.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"3","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_CANCEL_NOT_ALLOWED"]);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect([response.status, (await response.json()).code]).toEqual([409, "ORDER_CONFLICT"]);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: `{"expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED","actorId":"forged","cancelledByWorkforceUserId":"forged"}` });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        const cancelSubstituteBefore = await getWorkforceOrder(h.persistence, principal, { orderId: substitute.orderId });
        const cancelBodyTargetBefore = await getWorkforceOrder(h.persistence, principal, { orderId: cancelTarget.orderId });
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/cancel`, { method: "POST", headers: await headers(manager.token), body: `{"orderId":"${cancelTarget.orderId}","expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED"}` });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        expect(await getWorkforceOrder(h.persistence, principal, { orderId: substitute.orderId })).toEqual(cancelSubstituteBefore);
        expect(await getWorkforceOrder(h.persistence, principal, { orderId: cancelTarget.orderId })).toEqual(cancelBodyTargetBefore);
        response = await request(`/api/operations/v1/orders/${substitute.orderId}/cancel?outletId=${h.actors.tree.outletB.id}`, { method: "POST", headers: await headers(manager.token), body: '{"expectedOrderRevision":"1","cancellationReasonCode":"CUSTOMER_REQUESTED"}' });
        expect([response.status, (await response.json()).code]).toEqual([400, "ORDER_REQUEST_INVALID"]);
        expect((await getWorkforceOrder(h.persistence, principal, { orderId: substitute.orderId })).status).toBe("ACCEPTED");
      });
    });
  });

  it("safely reports Operations body timeout and stream read errors", async () => {
    vi.useFakeTimers();
    try {
      const stalled = new PassThrough();
      (stalled as unknown as { headers: Record<string, string> }).headers = { "content-type": "application/json" };
      const timeout = readOperationsJsonObjectBody(stalled as unknown as import("node:http").IncomingMessage);
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(timeout).resolves.toEqual({ ok: false });
    } finally {
      vi.useRealTimers();
    }
    const broken = new PassThrough();
    (broken as unknown as { headers: Record<string, string> }).headers = { "content-type": "application/json" };
    const failed = readOperationsJsonObjectBody(broken as unknown as import("node:http").IncomingMessage);
    broken.emit("error", new Error("read failure"));
    await expect(failed).resolves.toEqual({ ok: false });
  });

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
