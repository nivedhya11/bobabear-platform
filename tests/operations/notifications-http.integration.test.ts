/**
 * IMP-036D Operations Notification support HTTP.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  createNotificationRequestFromDomainEvent,
  processPendingNotification,
  type NotificationOutboxPayload,
} from "../../src/server/notifications";
import { updateNotificationRequest } from "../../src/server/notifications/repository";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { applicationConfig, closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import {
  withCompletedPositiveOrderHarness,
  type CompletedOrderHarness,
} from "../database/support/order-fixtures";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function workforceAuthConfig() {
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "operations-notif-customer-auth-32chars!!!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "operations-notif-workforce-auth-32chars!!",
    WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
  }, "test");
}

async function signedCookie(token: string): Promise<string> {
  const cookie = await serializeSignedCookie(
    WORKFORCE_AUTH_SESSION_COOKIE_NAME,
    token,
    workforceAuthConfig().workforce.secret,
  );
  return cookie.split(";", 1)[0]!;
}

async function adapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  return (await auth.$context as { internalAdapter: InternalAdapter }).internalAdapter;
}

function orderIntent(orderId: string, customerId: string): NotificationOutboxPayload {
  const occurredAt = new Date();
  return {
    customerId,
    orderId,
    paymentId: null,
    deliveryId: null,
    domainEventRef: `order:${orderId}:received`,
    semanticType: "ORDER_RECEIVED",
    occurredAt: occurredAt.toISOString(),
  };
}

async function grantOutletUser(
  h: CompletedOrderHarness,
  roleKey: "support_refund_operator" | "outlet_manager" | "kitchen_operator",
  outlet: "A" | "B" = "A",
): Promise<string> {
  const user = await createEligibleWorkforceUser(h.persistence);
  const tree = h.actors.tree;
  const selected =
    outlet === "A"
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
    await grantRole(tx, { membershipId: membership.id, roleKey });
  });
  return user.id;
}

async function withOperationsServer(
  h: CompletedOrderHarness,
  run: (value: {
    request: (path: string, init?: RequestInit) => Promise<Response>;
    adapter: InternalAdapter;
    headers: (token: string, extra?: HeadersInit) => Promise<HeadersInit>;
  }) => Promise<void>,
): Promise<void> {
  const runtime = getWorkforceAuthRuntime({
    auth: workforceAuthConfig().workforce,
    persistence: applicationConfig(h.connectionString),
  });
  const adapter = await adapterFor(runtime);
  const server = createServer((req, res) => {
    void routeOperationsRequest(
      req,
      res,
      {
        runtime,
        persistence: h.persistence,
        trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
      },
      "operations-notification-request",
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  try {
    await run({
      request: (path, init = {}) => fetch(`http://127.0.0.1:${address.port}${path}`, init),
      adapter,
      headers: async (token, extra = {}) => ({
        cookie: await signedCookie(token),
        origin: workforceAuthConfig().workforce.baseURL.origin,
        "content-type": "application/json",
        ...extra,
      }),
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await runtime.close();
  }
}

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036D Operations Notification HTTP", () => {
  it("lists only path-order notifications with resource-scoped notification.resend and supports resend", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const supportId = await grantOutletUser(h, "support_refund_operator", "A");
      const kitchenId = await grantOutletUser(h, "kitchen_operator", "A");
      const supportB = await grantOutletUser(h, "support_refund_operator", "B");

      const created = await createNotificationRequestFromDomainEvent(
        h.persistence,
        orderIntent(h.order.id, h.actor.authUserId),
      );
      expect(created).not.toBeNull();
      const failed = await processPendingNotification(h.persistence, created!.id);
      expect(failed.status).toBe("FAILED");

      const otherOrderNotification = await createNotificationRequestFromDomainEvent(
        h.persistence,
        {
          customerId: h.actor.authUserId,
          orderId: null,
          paymentId: null,
          deliveryId: null,
          domainEventRef: `order:${randomUUID()}:received:other`,
          semanticType: "ORDER_RECEIVED",
          occurredAt: new Date().toISOString(),
        },
      );

      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const kitchenToken = (await adapter.createSession(kitchenId)).token;
        const kitchenDenied = await request(
          `/api/operations/v1/orders/${h.order.id}/notifications`,
          { headers: await headers(kitchenToken) },
        );
        expect(kitchenDenied.status).toBe(403);

        const supportToken = (await adapter.createSession(supportId)).token;
        const listed = await request(`/api/operations/v1/orders/${h.order.id}/notifications`, {
          headers: await headers(supportToken),
        });
        expect(listed.status).toBe(200);
        const listBody = await listed.json();
        expect(listBody.items).toHaveLength(1);
        expect(listBody.items[0].notificationRequestId).toBe(created!.id);
        expect(listBody.items[0].resendPermitted).toBe(true);
        expect(JSON.stringify(listBody)).not.toMatch(/meta|access_token|phone|secret/i);

        if (otherOrderNotification) {
          const crossOrder = await request(
            `/api/operations/v1/orders/${h.order.id}/notifications/${otherOrderNotification.id}/resend`,
            {
              method: "POST",
              headers: await headers(supportToken),
              body: JSON.stringify({ reason: "Wrong order probe" }),
            },
          );
          expect(crossOrder.status).toBe(404);
        }

        const tokenB = (await adapter.createSession(supportB)).token;
        const crossOutlet = await request(
          `/api/operations/v1/orders/${h.order.id}/notifications`,
          { headers: await headers(tokenB) },
        );
        expect(crossOutlet.status).toBe(404);

        const resent = await request(
          `/api/operations/v1/orders/${h.order.id}/notifications/${created!.id}/resend`,
          {
            method: "POST",
            headers: await headers(supportToken),
            body: JSON.stringify({ reason: "Customer did not receive the update" }),
          },
        );
        expect(resent.status).toBe(200);
        const resentBody = await resent.json();
        expect(resentBody.notification.notificationRequestId).toBe(created!.id);
        expect(resentBody.notification.attemptCount).toBe("2");
      });
    });
  });

  it("projects and enforces resend eligibility including hard attempt ceiling", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const supportId = await grantOutletUser(h, "support_refund_operator", "A");

      const failedCreated = await createNotificationRequestFromDomainEvent(
        h.persistence,
        orderIntent(h.order.id, h.actor.authUserId),
      );
      expect(failedCreated).not.toBeNull();
      const failed = await processPendingNotification(h.persistence, failedCreated!.id);
      expect(failed.status).toBe("FAILED");

      const reviewCreated = await createNotificationRequestFromDomainEvent(
        h.persistence,
        {
          ...orderIntent(h.order.id, h.actor.authUserId),
          domainEventRef: `order:${h.order.id}:received:review`,
          occurredAt: new Date().toISOString(),
        },
      );
      expect(reviewCreated).not.toBeNull();
      await h.persistence.transaction(async (tx) => {
        await updateNotificationRequest(tx, reviewCreated!.id, {
          status: "REVIEW_REQUIRED",
          attemptCount: BigInt(1),
          maxAttempts: BigInt(3),
          reviewReason: "UNKNOWN_FAILURE",
          nextAttemptAt: null,
          terminalAt: new Date(),
          now: new Date(),
        });
      });

      const ceilingCreated = await createNotificationRequestFromDomainEvent(
        h.persistence,
        {
          ...orderIntent(h.order.id, h.actor.authUserId),
          domainEventRef: `order:${h.order.id}:received:ceiling`,
          occurredAt: new Date().toISOString(),
        },
      );
      expect(ceilingCreated).not.toBeNull();
      await h.persistence.transaction(async (tx) => {
        await updateNotificationRequest(tx, ceilingCreated!.id, {
          status: "FAILED",
          attemptCount: BigInt(20),
          maxAttempts: BigInt(20),
          nextAttemptAt: null,
          terminalAt: new Date(),
          now: new Date(),
        });
      });

      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const supportToken = (await adapter.createSession(supportId)).token;
        const listed = await request(`/api/operations/v1/orders/${h.order.id}/notifications`, {
          headers: await headers(supportToken),
        });
        expect(listed.status).toBe(200);
        const items = (await listed.json()).items as Array<{
          notificationRequestId: string;
          status: string;
          resendPermitted: boolean;
        }>;
        const byId = new Map(items.map((item) => [item.notificationRequestId, item]));
        expect(byId.get(failedCreated!.id)?.resendPermitted).toBe(true);
        expect(byId.get(reviewCreated!.id)?.status).toBe("REVIEW_REQUIRED");
        expect(byId.get(reviewCreated!.id)?.resendPermitted).toBe(true);
        expect(byId.get(ceilingCreated!.id)?.resendPermitted).toBe(false);

        const ceilingDenied = await request(
          `/api/operations/v1/orders/${h.order.id}/notifications/${ceilingCreated!.id}/resend`,
          {
            method: "POST",
            headers: await headers(supportToken),
            body: JSON.stringify({ reason: "Should be blocked at ceiling" }),
          },
        );
        expect(ceilingDenied.status).toBe(409);
        expect((await ceilingDenied.json()).code).toBe("NOTIFICATION_RESEND_NOT_ALLOWED");

        const reviewResend = await request(
          `/api/operations/v1/orders/${h.order.id}/notifications/${reviewCreated!.id}/resend`,
          {
            method: "POST",
            headers: await headers(supportToken),
            body: JSON.stringify({ reason: "Operator follow-up for review-required notice" }),
          },
        );
        expect(reviewResend.status).toBe(200);
      });
    });
  });
});
