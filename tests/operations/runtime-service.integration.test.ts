/** Operations runtime/service integration (IMP-029). */
import { createServer } from "node:http";
import * as net from "node:net";

import { serializeSignedCookie } from "better-call";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { listCustomerOrders } from "../../src/server/order";
import { createOperationsRequestListener } from "../../src/server/operations/http/app";
import { OperationsService } from "../../src/server/operations/service";
import { startPayment } from "../../src/server/payment";
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

/**
 * Workforce auth base URL with no HTTP listener. Allocated by binding then
 * closing a local port so probes get fast ECONNREFUSED (WSL may black-hole
 * never-bound ports). Operations must authenticate via shared
 * WorkforceAuthRuntime / DB session authority only — never by calling a
 * workforce-auth HTTP service at this origin.
 */
let deadWorkforceAuthBaseUrl = "";

async function allocateDeadWorkforceAuthBaseUrl(): Promise<string> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to allocate dead workforce-auth base URL port");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${address.port}`;
}

function authConfig() {
  if (!deadWorkforceAuthBaseUrl) {
    throw new Error("dead workforce-auth base URL not allocated");
  }
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "operations-runtime-customer-auth-secret-32!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "operations-runtime-workforce-auth-secret-32!",
    WORKFORCE_AUTH_BASE_URL: deadWorkforceAuthBaseUrl,
  }, "test").workforce;
}

async function signedWorkforceSessionCookie(token: string): Promise<string> {
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

async function placeSucceededOrder(h: Harness) {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const options = paymentOpts(provider);
  const started = await startPayment(h.persistence, h.actor, {
    checkoutId: h.checkoutId,
    expectedCheckoutRevision: h.revision,
    paymentMethodIntent: "upi",
    idempotencyKey: newIdempotencyKey("operations-runtime"),
  }, options);
  await verifyAndProcessWebhook(h.persistence, provider, {
    executionIdentity: started.attempt.providerExecutionIdentity,
    outcome: "succeed",
    amountPaise: started.payment.expectedAmountPaise,
    providerEventId: `operations-runtime-${started.attempt.id}`,
  }, options);
  return (await listCustomerOrders(h.persistence, h.actor, { limit: 5 })).items[0]!;
}

async function grantOutletManager(h: Harness): Promise<string> {
  const user = await createEligibleWorkforceUser(h.persistence);
  const tree = h.actors.tree;
  await h.persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: {
        scopeType: "outlet",
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        territoryId: tree.terrA.id,
        outletId: tree.outletA.id,
      },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
  });
  return user.id;
}

async function createSignedManagerSession(h: Harness): Promise<{ cookie: string; token: string }> {
  const runtime = getWorkforceAuthRuntime({
    auth: authConfig(),
    persistence: applicationConfig(h.connectionString),
  });
  try {
    const adapter = await adapterFor(runtime);
    const managerId = await grantOutletManager(h);
    const session = await adapter.createSession(managerId);
    return { cookie: await signedWorkforceSessionCookie(session.token), token: session.token };
  } finally {
    await runtime.close();
  }
}

async function assertNoWorkforceAuthHttpListener(baseUrl: string): Promise<void> {
  const url = new URL(baseUrl);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  await expect(new Promise<void>((resolve, reject) => {
    const probe = net.connect({ host: url.hostname, port });
    const timer = setTimeout(() => {
      probe.destroy();
      reject(new Error(`workforce-auth listener probe timed out for ${baseUrl}`));
    }, 1_000);
    probe.once("connect", () => {
      clearTimeout(timer);
      probe.destroy();
      reject(new Error(`workforce-auth HTTP listener unexpectedly present at ${baseUrl}`));
    });
    probe.once("error", () => {
      clearTimeout(timer);
      resolve();
    });
  })).resolves.toBeUndefined();
}

beforeAll(async () => {
  deadWorkforceAuthBaseUrl = await allocateDeadWorkforceAuthBaseUrl();
});

afterEach(async () => { await closeTrackedPersistenceHandles(); });

describe("OperationsService", () => {
  it("starts once, serves internal health, issues server request IDs, logs safely, and closes idempotently", async () => {
    await withPaymentReadyHarness(async (h) => {
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      const service = new OperationsService({
        auth: authConfig(), persistenceConfig: applicationConfig(h.connectionString),
        trustedOrigin: authConfig().baseURL.origin, host: "127.0.0.1", port: 0,
      });
      try {
        await service.start();
        const port = service.boundPort;
        expect(port).not.toBeNull();
        await service.start();
        expect(service.boundPort).toBe(port);
        const live = await fetch(`http://127.0.0.1:${port}/health/live`, { headers: { "x-request-id": "caller-id" } });
        expect([live.status, await live.json()]).toEqual([200, { ok: true }]);
        expect(live.headers.get("x-request-id")).not.toBe("caller-id");
        const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
        expect([ready.status, await ready.json()]).toEqual([200, { ok: true }]);
        const event = JSON.parse(log.mock.calls.at(-1)?.[0] as string);
        expect(Object.keys(event).sort()).toEqual(["durationMs", "httpStatus", "operation", "requestId", "safeOutcomeCode"]);
        await service.close();
        await service.close();
        expect(service.boundPort).toBeNull();
        await expect(fetch(`http://127.0.0.1:${port}/health/live`)).rejects.toThrow();
      } finally {
        log.mockRestore();
      }
    });
  });

  it("converts unexpected listener failures to a generic safe 500", async () => {
    const listener = createOperationsRequestListener({
      runtime: {} as never,
      persistence: {} as never,
      trustedOrigin: "http://localhost:3200",
    });
    const server = createServer(listener);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing listener address");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/operations/v1/orders`);
      expect(response.status).toBe(500);
      const body = await response.json() as Record<string, unknown>;
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INTERNAL_ERROR");
      expect(body).not.toHaveProperty("stack");
      expect(body).not.toHaveProperty("message");
      expect(body).not.toHaveProperty("error");
      expect(body).not.toHaveProperty("details");
      const headerRequestId = response.headers.get("x-request-id");
      expect(headerRequestId).toMatch(/^[0-9a-f-]{36}$/);
      if ("requestId" in body) {
        expect(body.requestId).toBe(headerRequestId);
        expect(Object.keys(body).sort()).toEqual(["code", "ok", "requestId"]);
      } else {
        expect(Object.keys(body).sort()).toEqual(["code", "ok"]);
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("serves signed workforce GET and trusted/untrusted Origin mutations through the real service listener", async () => {
    await withPaymentReadyHarness(async (h) => {
      await assertNoWorkforceAuthHttpListener(deadWorkforceAuthBaseUrl);
      const order = await placeSucceededOrder(h);
      const { cookie } = await createSignedManagerSession(h);
      const trustedOrigin = authConfig().baseURL.origin;
      const service = new OperationsService({
        auth: authConfig(),
        persistenceConfig: applicationConfig(h.connectionString),
        trustedOrigin,
        host: "127.0.0.1",
        port: 0,
      });
      try {
        await service.start();
        const port = service.boundPort;
        expect(port).not.toBeNull();
        const base = `http://127.0.0.1:${port}`;

        // Authenticated business GET with no workforce-auth HTTP listener running.
        const list = await fetch(`${base}/api/operations/v1/orders`, {
          headers: { cookie },
        });
        expect(list.status).toBe(200);
        const listBody = await list.json();
        expect(listBody.ok).toBe(true);
        expect(listBody.items.map((item: { orderId: string }) => item.orderId)).toContain(order.orderId);
        await assertNoWorkforceAuthHttpListener(deadWorkforceAuthBaseUrl);

        const untrusted = await fetch(`${base}/api/operations/v1/orders/${order.orderId}/accept`, {
          method: "POST",
          headers: {
            cookie,
            origin: "https://untrusted.example",
            "content-type": "application/json",
          },
          body: '{"expectedOrderRevision":"1"}',
        });
        expect([untrusted.status, (await untrusted.json()).code]).toEqual([403, "ORDER_REQUEST_INVALID"]);
        const stillPlaced = await fetch(`${base}/api/operations/v1/orders/${order.orderId}`, {
          headers: { cookie },
        });
        expect(stillPlaced.status).toBe(200);
        expect((await stillPlaced.json()).order.status).toBe("PLACED");

        const trusted = await fetch(`${base}/api/operations/v1/orders/${order.orderId}/accept`, {
          method: "POST",
          headers: {
            cookie,
            origin: trustedOrigin,
            "content-type": "application/json",
          },
          body: '{"expectedOrderRevision":"1"}',
        });
        expect(trusted.status).toBe(200);
        expect((await trusted.json()).order.status).toBe("ACCEPTED");
      } finally {
        await service.close();
      }
    });
  });

  it("bounds in-flight shutdown and refuses new connections after close", async () => {
    await withPaymentReadyHarness(async (h) => {
      const order = await placeSucceededOrder(h);
      const { cookie } = await createSignedManagerSession(h);
      const trustedOrigin = authConfig().baseURL.origin;
      const shutdownTimeoutMs = 250;
      const service = new OperationsService({
        auth: authConfig(),
        persistenceConfig: applicationConfig(h.connectionString),
        trustedOrigin,
        host: "127.0.0.1",
        port: 0,
        shutdownTimeoutMs,
      });
      await service.start();
      const port = service.boundPort;
      expect(port).not.toBeNull();

      const socket = net.connect({ host: "127.0.0.1", port: port! });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("error", reject);
      });
      socket.write(
        `POST /api/operations/v1/orders/${order.orderId}/accept HTTP/1.1\r\n`
        + `Host: 127.0.0.1:${port}\r\n`
        + `Origin: ${trustedOrigin}\r\n`
        + `Cookie: ${cookie}\r\n`
        + "Content-Type: application/json\r\n"
        + "Content-Length: 64\r\n"
        + "\r\n",
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      const startedCloseAt = Date.now();
      await service.close();
      const closeDurationMs = Date.now() - startedCloseAt;
      expect(closeDurationMs).toBeGreaterThanOrEqual(shutdownTimeoutMs - 50);
      expect(closeDurationMs).toBeLessThan(2_000);
      expect(service.boundPort).toBeNull();

      socket.destroy();
      await expect(fetch(`http://127.0.0.1:${port}/health/live`)).rejects.toThrow();
      await expect(new Promise<void>((resolve, reject) => {
        const probe = net.connect({ host: "127.0.0.1", port: port! });
        probe.once("connect", () => {
          probe.destroy();
          reject(new Error("listener unexpectedly accepted a connection after close"));
        });
        probe.once("error", () => resolve());
      })).resolves.toBeUndefined();
    });
  });
});
