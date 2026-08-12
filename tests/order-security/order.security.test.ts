/**
 * Order security tests (IMP-023) — SEC-C01…SEC-C10 and SEC-W01…SEC-W15.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createMembership,
  createWorkforcePrincipalFromTrustedIdentity,
  grantRole,
} from "../../src/server/access-control";
import {
  acceptOrder,
  cancelOrder,
  fulfilOrder,
  getCustomerOrder,
  getWorkforceOrder,
  listCustomerOrders,
  searchWorkforceOrders,
} from "../../src/server/order";
import * as orderPublicApi from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "../database/support/access-control-fixtures";
import {
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
  type PaymentReadyHarness,
} from "../database/support/payment-fixtures";
import { withTestDatabaseClient } from "../database/support/test-database";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const MISSING_ORDER_ID = "00000000-0000-4000-8000-000000000099";
const DESTINATION_PII = [
  "Ashutosh Joshi",
  "+919876543210",
  "Flat 204, Block-B",
] as const;

type PlacedOrder = Readonly<{
  orderId: string;
  orderNumber: string;
  revision: bigint;
  checkoutId: string;
}>;

async function placeSucceededOrder(
  h: PaymentReadyHarness,
): Promise<PlacedOrder> {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const opts = paymentOpts(provider);
  const started = await startPayment(
    h.persistence,
    h.actor,
    {
      checkoutId: h.checkoutId,
      expectedCheckoutRevision: h.revision,
      paymentMethodIntent: "upi",
      idempotencyKey: newIdempotencyKey("ord-sec"),
    },
    opts,
  );
  await verifyAndProcessWebhook(
    h.persistence,
    provider,
    {
      executionIdentity: started.attempt.providerExecutionIdentity,
      outcome: "succeed",
      amountPaise: started.payment.expectedAmountPaise,
      providerEventId: `ord-sec-${started.attempt.id}`,
    },
    opts,
  );

  const listed = await listCustomerOrders(h.persistence, h.actor, {
    limit: 10,
  });
  expect(listed.items.length).toBeGreaterThanOrEqual(1);
  const summary = listed.items[0]!;
  return Object.freeze({
    orderId: summary.orderId,
    orderNumber: summary.orderNumber,
    revision: BigInt(summary.revision),
    checkoutId: h.checkoutId,
  });
}

async function grantOutletRole(
  persistence: PaymentReadyHarness["persistence"],
  tree: PaymentReadyHarness["actors"]["tree"],
  roleKey:
    | "outlet_manager"
    | "kitchen_operator"
    | "delivery_coordinator"
    | "support_refund_operator",
  outlet: "A" | "B" = "A",
) {
  const user = await createEligibleWorkforceUser(persistence);
  const outletRow = outlet === "A" ? tree.outletA : tree.outletB;
  const org = outlet === "A" ? tree.orgA : tree.orgB;
  const terr = outlet === "A" ? tree.terrA : tree.terrB;
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: {
        scopeType: "outlet",
        brandId: tree.brand.id,
        organizationId: org.id,
        territoryId: terr.id,
        outletId: outletRow.id,
      },
      status: "active",
    });
    await grantRole(tx, {
      membershipId: membership.id,
      roleKey,
    });
  });
  return { user, actor: principalFor(user.id) };
}

async function grantBrandRole(
  persistence: PaymentReadyHarness["persistence"],
  brandId: string,
  roleKey: "brand_admin" | "finance_viewer" | "support_refund_operator",
) {
  const user = await createEligibleWorkforceUser(persistence);
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: { scopeType: "brand", brandId },
      status: "active",
    });
    await grantRole(tx, {
      membershipId: membership.id,
      roleKey,
    });
  });
  return { user, actor: principalFor(user.id) };
}

async function stripKitchenOrderRead(
  connectionString: string,
): Promise<void> {
  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `delete from app.access_role_permissions
       where role_key = 'kitchen_operator'
         and permission_key = 'order.read'`,
    );
  });
}

function assertNoDestinationPii(value: unknown): void {
  const dumped = JSON.stringify(value);
  for (const fragment of DESTINATION_PII) {
    expect(dumped).not.toContain(fragment);
  }
  expect(value).not.toHaveProperty("destination");
  expect(value).not.toHaveProperty("recipientName");
  expect(value).not.toHaveProperty("recipientPhone");
  expect(value).not.toHaveProperty("addressLine1");
}

describe("IMP-023 order security — customer SEC-C01…SEC-C10", () => {
  it("SEC-C01 unauthenticated customer cannot read Orders", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await expect(
        getCustomerOrder(h.persistence, null, { orderId: placed.orderId }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        listCustomerOrders(h.persistence, undefined, {}),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("SEC-C02 Customer A can get own Order (no internal provenance)", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const detail = await getCustomerOrder(h.persistence, h.actor, {
        orderId: placed.orderId,
      });
      expect(detail.orderId).toBe(placed.orderId);
      expect(detail.orderNumber).toBe(placed.orderNumber);
      expect(detail.destination.recipientName).toBe("Ashutosh Joshi");
      expect(detail).not.toHaveProperty("paymentProvenanceKind");
      expect(detail).not.toHaveProperty("acceptedByWorkforceUserId");
      expect(detail).not.toHaveProperty("paymentId");
    });
  });

  it("SEC-C03 Customer B cannot get A's Order (ORDER_NOT_FOUND)", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await expect(
        getCustomerOrder(h.persistence, h.actors.customerB, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    });
  });

  it("SEC-C04 missing and cross-customer both conceal as ORDER_NOT_FOUND", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const missing = getCustomerOrder(h.persistence, h.actor, {
        orderId: MISSING_ORDER_ID,
      });
      const cross = getCustomerOrder(h.persistence, h.actors.customerB, {
        orderId: placed.orderId,
      });
      await expect(missing).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
      await expect(cross).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    });
  });

  it("SEC-C05 customer list returns only own Orders", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const own = await listCustomerOrders(h.persistence, h.actor, {});
      expect(own.items.map((i) => i.orderId)).toContain(placed.orderId);

      const other = await listCustomerOrders(
        h.persistence,
        h.actors.customerB,
        {},
      );
      expect(other.items.map((i) => i.orderId)).not.toContain(placed.orderId);
    });
  });

  it("SEC-C06 customer cannot supply ownership override", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await expect(
        getCustomerOrder(h.persistence, h.actors.customerB, {
          orderId: placed.orderId,
          customerAuthUserId: h.actors.customerAId,
        } as never),
      ).rejects.toMatchObject({
        code: "ORDER_REQUEST_INVALID",
        field: "customerAuthUserId",
      });
      await expect(
        listCustomerOrders(h.persistence, h.actors.customerB, {
          customerAuthUserId: h.actors.customerAId,
        } as never),
      ).rejects.toMatchObject({
        code: "ORDER_REQUEST_INVALID",
        field: "customerAuthUserId",
      });
    });
  });

  it("SEC-C07/C08/C09 customer cannot accept, fulfil, or cancel", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const input = {
        orderId: placed.orderId,
        expectedOrderRevision: placed.revision,
      };
      await expect(
        acceptOrder(h.persistence, h.actor, input),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
      await expect(
        fulfilOrder(h.persistence, h.actor, input),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
      await expect(
        cancelOrder(h.persistence, h.actor, {
          ...input,
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        }),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
    });
  });

  it("SEC-C10 plain CustomerActor-shaped forgery fails (incl. TS cast)", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const forged = {
        kind: "customer" as const,
        authUserId: h.actors.customerAId,
        authorized: true,
        scopeApproved: true,
      };
      const castForged = forged as unknown as typeof h.actor;
      await expect(
        getCustomerOrder(h.persistence, forged, { orderId: placed.orderId }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        getCustomerOrder(h.persistence, castForged, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        listCustomerOrders(h.persistence, {
          kind: "customer",
          authUserId: h.actors.customerAId,
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });
});

describe("IMP-023 order security — workforce SEC-W01…SEC-W15", () => {
  it("SEC-W01 without order.read cannot read/search (ORDER_UNAUTHORIZED)", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const nobody = await createEligibleWorkforceUser(h.persistence);
      const actor = principalFor(nobody.id);
      await expect(
        getWorkforceOrder(h.persistence, actor, { orderId: placed.orderId }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
      await expect(
        searchWorkforceOrders(h.persistence, actor, {}),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
    });
  });

  it("SEC-W02 order.read works only inside authorized scope", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const { actor } = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "outlet_manager",
        "A",
      );
      const detail = await getWorkforceOrder(h.persistence, actor, {
        orderId: placed.orderId,
      });
      expect(detail.orderId).toBe(placed.orderId);
      expect(detail.outlet.outletId).toBe(h.outletId);
      const searched = await searchWorkforceOrders(h.persistence, actor, {});
      expect(searched.items.map((i) => i.orderId)).toContain(placed.orderId);
    });
  });

  it("SEC-W03/W04 outside-Outlet / outside-Brand concealed as ORDER_NOT_FOUND", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const outsideOutlet = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "outlet_manager",
        "B",
      );
      await expect(
        getWorkforceOrder(h.persistence, outsideOutlet.actor, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });

      const outsideBrand = await grantBrandRole(
        h.persistence,
        h.actors.otherTree.brand.id,
        "brand_admin",
      );
      await expect(
        getWorkforceOrder(h.persistence, outsideBrand.actor, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    });
  });

  it("SEC-W05 missing/outside-scope converge to ORDER_NOT_FOUND", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const { actor } = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "kitchen_operator",
        "A",
      );
      await expect(
        getWorkforceOrder(h.persistence, actor, {
          orderId: MISSING_ORDER_ID,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });

      const outside = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "kitchen_operator",
        "B",
      );
      await expect(
        getWorkforceOrder(h.persistence, outside.actor, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    });
  });

  it("SEC-W06/W07/W08 order.accept/fulfil/cancel required", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const finance = await grantBrandRole(
        h.persistence,
        h.actors.tree.brand.id,
        "finance_viewer",
      );
      const input = {
        orderId: placed.orderId,
        expectedOrderRevision: placed.revision,
      };
      await expect(
        acceptOrder(h.persistence, finance.actor, input),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
      await expect(
        fulfilOrder(h.persistence, finance.actor, input),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
      await expect(
        cancelOrder(h.persistence, finance.actor, {
          ...input,
          cancellationReasonCode: "BUSINESS_DECISION",
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });

      // Kitchen can accept/fulfil but not cancel.
      const kitchen = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "kitchen_operator",
        "A",
      );
      await expect(
        cancelOrder(h.persistence, kitchen.actor, {
          ...input,
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });

      // Delivery can fulfil but not accept.
      const delivery = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "delivery_coordinator",
        "A",
      );
      await expect(
        acceptOrder(h.persistence, delivery.actor, input),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
    });
  });

  it("SEC-W09 mutation permission does not grant general search", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await stripKitchenOrderRead(h.connectionString);
      const kitchen = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "kitchen_operator",
        "A",
      );
      await expect(
        getWorkforceOrder(h.persistence, kitchen.actor, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
      await expect(
        searchWorkforceOrders(h.persistence, kitchen.actor, {}),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });

      // Accept still works with order.accept alone.
      const accepted = await acceptOrder(h.persistence, kitchen.actor, {
        orderId: placed.orderId,
        expectedOrderRevision: placed.revision,
      });
      expect(accepted.status).toBe("ACCEPTED");
    });
  });

  it("SEC-W10 order.read does not grant mutation", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const finance = await grantBrandRole(
        h.persistence,
        h.actors.tree.brand.id,
        "finance_viewer",
      );
      const detail = await getWorkforceOrder(h.persistence, finance.actor, {
        orderId: placed.orderId,
      });
      expect(detail.orderId).toBe(placed.orderId);
      await expect(
        acceptOrder(h.persistence, finance.actor, {
          orderId: placed.orderId,
          expectedOrderRevision: placed.revision,
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
    });
  });

  it("SEC-W11 caller brandId/outletId cannot broaden scope", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const { actor } = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "outlet_manager",
        "A",
      );

      await expect(
        searchWorkforceOrders(h.persistence, actor, {
          outletId: h.actors.tree.outletB.id,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });

      const otherBrandSearch = await searchWorkforceOrders(
        h.persistence,
        actor,
        { brandId: h.actors.otherTree.brand.id },
      );
      expect(otherBrandSearch.items.map((i) => i.orderId)).not.toContain(
        placed.orderId,
      );
      expect(otherBrandSearch.items).toHaveLength(0);

      // Explicit foreign outlet on get path still conceals.
      await expect(
        getWorkforceOrder(h.persistence, actor, {
          orderId: placed.orderId,
          outletId: h.actors.tree.outletB.id,
        } as never),
      ).rejects.toMatchObject({
        code: "ORDER_REQUEST_INVALID",
        field: "outletId",
      });
    });
  });

  it("SEC-W12 no Super Admin role-name bypass; authorized/scopeApproved ignored", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const forgedPlain = {
        workforceUserId: "00000000-0000-4000-8000-00000000psa1",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
        roleName: "platform_super_admin",
        roleKey: "platform_super_admin",
        authorized: true,
        scopeApproved: true,
      };
      await expect(
        getWorkforceOrder(h.persistence, forgedPlain, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });

      const castForged = forgedPlain as unknown as ReturnType<
        typeof principalFor
      >;
      await expect(
        getWorkforceOrder(h.persistence, castForged, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });

      // Trusted principal mint with unknown user still cannot bypass RBAC.
      const spoofed = createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "00000000-0000-4000-8000-00000000psa1",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      });
      await expect(
        getWorkforceOrder(h.persistence, spoofed, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
    });
  });

  it("SEC-W13 plain WorkforceActor-shaped forgery fails", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const { user } = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "outlet_manager",
        "A",
      );
      const forged = {
        workforceUserId: user.id,
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      };
      await expect(
        acceptOrder(h.persistence, forged, {
          orderId: placed.orderId,
          expectedOrderRevision: placed.revision,
        }),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
      await expect(
        searchWorkforceOrders(h.persistence, {
          ...forged,
          authorized: true,
        }),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
    });
  });

  it("SEC-W14 workforce cannot impersonate CustomerActor", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      const { actor } = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "outlet_manager",
        "A",
      );
      await expect(
        getCustomerOrder(h.persistence, actor, { orderId: placed.orderId }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        listCustomerOrders(h.persistence, {
          kind: "customer",
          authUserId: h.actors.customerAId,
          workforceUserId: actor.workforceUserId,
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("SEC-W15 mutation result does not leak full PII without order.read", async () => {
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await stripKitchenOrderRead(h.connectionString);
      const kitchen = await grantOutletRole(
        h.persistence,
        h.actors.tree,
        "kitchen_operator",
        "A",
      );
      const accepted = await acceptOrder(h.persistence, kitchen.actor, {
        orderId: placed.orderId,
        expectedOrderRevision: placed.revision,
      });
      assertNoDestinationPii(accepted);
      expect(accepted).toMatchObject({
        orderId: placed.orderId,
        status: "ACCEPTED",
      });

      // Still cannot escalate to a full PII detail read without order.read.
      await expect(
        getWorkforceOrder(h.persistence, kitchen.actor, {
          orderId: placed.orderId,
        }),
      ).rejects.toMatchObject({ code: "ORDER_UNAUTHORIZED" });
    });
  });

  it("public barrel must not export mint factories / raw-ID constructors", async () => {
    const forbidden = [
      "createCustomerActorFromTrustedAuthIdentity",
      "customerActorFromTrustedCustomerAuthIdentity",
      "createWorkforcePrincipalFromTrustedIdentity",
      "principalFor",
      "mintCustomerActor",
      "createOrder",
      "updateOrder",
      "setOrderStatus",
    ] as const;
    for (const name of forbidden) {
      expect(
        Object.prototype.hasOwnProperty.call(orderPublicApi, name),
      ).toBe(false);
    }

    const indexSource = readFileSync(
      path.join(process.cwd(), "src/server/order/index.ts"),
      "utf8",
    );
    expect(indexSource).toMatch(/Intentionally NOT re-exported/);
    expect(indexSource).not.toMatch(
      /\bexport\s+\{[^}]*\bcreateWorkforcePrincipalFromTrustedIdentity\b/,
    );
    expect(indexSource).not.toMatch(
      /\bexport\s+\{[^}]*\bcreateCustomerActorFromTrustedAuthIdentity\b/,
    );

    // Raw IDs / authorized flags are not authority.
    await withPaymentReadyHarness(async (h) => {
      const placed = await placeSucceededOrder(h);
      await expect(
        getCustomerOrder(
          h.persistence,
          {
            kind: "customer",
            authUserId: h.actors.customerAId,
            authorized: true,
            scopeApproved: true,
          },
          { orderId: placed.orderId },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        getWorkforceOrder(
          h.persistence,
          {
            workforceUserId: h.actors.psa.id,
            authorized: true,
            scopeApproved: true,
            roleName: "platform_super_admin",
          },
          { orderId: placed.orderId },
        ),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });
    });
  });
});
