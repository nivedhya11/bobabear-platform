/**
 * IMP-036D Operations Refund HTTP — provider-free reservation.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { findRefundById } from "../../src/server/refund/repository";
import { reconcileNonTerminalRefundsBatch } from "../../src/server/refund";
import { applicationConfig } from "../database/support/cart-fixtures";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  withRefundReadyHarness,
  type RefundReadyHarness,
} from "../database/support/refund-fixtures";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function workforceAuthConfig() {
  return loadAuthFoundationConfig({
    CUSTOMER_AUTH_SECRET: "operations-refund-customer-auth-32chars!!",
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: "operations-refund-workforce-auth-32chars!",
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

async function grantScopedUser(
  h: RefundReadyHarness,
  roleKey: "support_refund_operator" | "finance_viewer" | "outlet_manager" | "kitchen_operator",
  outlet: "A" | "B" = "A",
): Promise<string> {
  const user = await createEligibleWorkforceUser(h.persistence);
  const tree = h.actors.tree;
  const selected =
    outlet === "A"
      ? { outlet: tree.outletA, organization: tree.orgA, territory: tree.terrA }
      : { outlet: tree.outletB, organization: tree.orgB, territory: tree.terrB };
  await h.persistence.transaction(async (tx) => {
    const scope =
      roleKey === "finance_viewer"
        ? {
            scopeType: "organization" as const,
            brandId: tree.brand.id,
            organizationId: selected.organization.id,
            territoryId: null,
            outletId: null,
          }
        : {
            scopeType: "outlet" as const,
            brandId: tree.brand.id,
            organizationId: selected.organization.id,
            territoryId: selected.territory.id,
            outletId: selected.outlet.id,
          };
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope,
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey });
  });
  return user.id;
}

async function withOperationsServer(
  h: RefundReadyHarness,
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
      "operations-refund-request",
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

describe("IMP-036D Operations Refund HTTP", () => {
  it("GET requires payment.refund.read; POST requires payment.refund; reserves ACCEPTED with zero provider I/O", async () => {
    await withRefundReadyHarness(async (h) => {
      const providerCallsBefore = h.provider.createRefundCallCount;
      const supportId = await grantScopedUser(h, "support_refund_operator");
      const financeId = await grantScopedUser(h, "finance_viewer");
      const kitchenId = await grantScopedUser(h, "kitchen_operator");
      const refundRequestId = randomUUID();

      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const kitchenToken = (await adapter.createSession(kitchenId)).token;
        const denied = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          headers: await headers(kitchenToken),
        });
        expect(denied.status).toBe(403);
        expect((await denied.json()).code).toBe("REFUND_UNAUTHORIZED");

        const financeToken = (await adapter.createSession(financeId)).token;
        const listed = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          headers: await headers(financeToken),
        });
        expect(listed.status).toBe(200);
        const listBody = await listed.json();
        expect(listBody.ok).toBe(true);
        expect(listBody.refunds).toEqual([]);
        expect(listBody.balance.remainingRefundableAmountPaise).toBe(h.grandTotalPaise.toString());

        const financePost = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(financeToken),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "partial support refund",
          }),
        });
        expect(financePost.status).toBe(403);

        const supportToken = (await adapter.createSession(supportId)).token;
        const created = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(supportToken),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "partial support refund",
            paymentId: randomUUID(),
            outletId: randomUUID(),
            providerPaymentId: "pay_forged",
          }),
        });
        expect(created.status).toBe(400);
        expect((await created.json()).code).toBe("REFUND_INVALID_INPUT");

        const reserved = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(supportToken),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "partial support refund",
          }),
        });
        expect(reserved.status).toBe(200);
        const reservedBody = await reserved.json();
        expect(reservedBody.refund.status).toBe("ACCEPTED");
        expect(reservedBody.refund.refundId).toBe(refundRequestId);
        expect(reservedBody.refund.recoveryHint).toMatch(/awaiting provider/i);
        expect(h.provider.createRefundCallCount).toBe(providerCallsBefore);

        const row = await h.persistence.withContext((ctx) => findRefundById(ctx, refundRequestId));
        expect(row?.status).toBe("ACCEPTED");
        expect(row?.providerPaymentId).toBe(h.providerPaymentId);
        expect(row?.providerIdempotencyKey).toBe(
          `boba_rfnd_${refundRequestId.replace(/-/g, "")}`,
        );

        const replay = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(supportToken),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "partial support refund",
          }),
        });
        expect(replay.status).toBe(200);
        expect((await replay.json()).refund.refundId).toBe(refundRequestId);

        const conflict = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(supportToken),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(4)),
            reason: "different amount",
          }),
        });
        expect(conflict.status).toBe(409);
        expect((await conflict.json()).code).toBe("REFUND_IDEMPOTENCY_CONFLICT");

        h.provider.setRefundOutcome("processed");
        const processed = await reconcileNonTerminalRefundsBatch(h.persistence, {
          provider: h.provider,
        });
        expect(processed).toBeGreaterThanOrEqual(1);
        const after = await h.persistence.withContext((ctx) => findRefundById(ctx, refundRequestId));
        expect(after?.status).toBe("PROCESSED");
      });
    });
  });

  it("denies cross-outlet access and does not leak unauthorized refundRequestId", async () => {
    await withRefundReadyHarness(async (h) => {
      const supportA = await grantScopedUser(h, "support_refund_operator", "A");
      const supportB = await grantScopedUser(h, "support_refund_operator", "B");
      const refundRequestId = randomUUID();

      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const tokenA = (await adapter.createSession(supportA)).token;
        const created = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(tokenA),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "outlet A refund",
          }),
        });
        expect(created.status).toBe(200);

        const tokenB = (await adapter.createSession(supportB)).token;
        const listDenied = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          headers: await headers(tokenB),
        });
        expect(listDenied.status).toBe(404);

        const replayDenied = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          method: "POST",
          headers: await headers(tokenB),
          body: JSON.stringify({
            refundRequestId,
            amountPaise: Number(h.grandTotalPaise / BigInt(2)),
            reason: "outlet A refund",
          }),
        });
        expect([403, 404]).toContain(replayDenied.status);
        const body = await replayDenied.json();
        expect(body.ok).toBe(false);
        expect(body.refund).toBeUndefined();
      });
    });
  });

  it("concurrent duplicate submissions converge on one Refund", async () => {
    await withRefundReadyHarness(async (h) => {
      const supportId = await grantScopedUser(h, "support_refund_operator");
      const refundRequestId = randomUUID();
      const amount = Number(h.grandTotalPaise / BigInt(2));

      await withOperationsServer(h, async ({ request, adapter, headers }) => {
        const token = (await adapter.createSession(supportId)).token;
        const hdrs = await headers(token);
        const body = JSON.stringify({
          refundRequestId,
          amountPaise: amount,
          reason: "concurrent refund",
        });
        const [a, b] = await Promise.all([
          request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
            method: "POST",
            headers: hdrs,
            body,
          }),
          request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
            method: "POST",
            headers: hdrs,
            body,
          }),
        ]);
        expect(a.status).toBe(200);
        expect(b.status).toBe(200);
        const bodyA = await a.json();
        const bodyB = await b.json();
        expect(bodyA.refund.refundId).toBe(refundRequestId);
        expect(bodyB.refund.refundId).toBe(refundRequestId);

        const listed = await request(`/api/operations/v1/orders/${h.order.id}/refunds`, {
          headers: hdrs,
        });
        const listedBody = await listed.json();
        expect(listedBody.refunds).toHaveLength(1);
      });
    });
  });
});
