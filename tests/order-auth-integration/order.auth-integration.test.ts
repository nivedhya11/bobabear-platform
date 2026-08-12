/**
 * Order ↔ auth trust-chain integration (IMP-023).
 *
 * Only trusted session → CustomerActor / WorkforcePrincipal paths may
 * read or mutate Orders. Raw user-id objects are never authority.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  createMembership,
  createWorkforcePrincipalFromTrustedIdentity,
  grantRole,
} from "../../src/server/access-control";
import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  acceptOrder,
  getCustomerOrder,
  listCustomerOrders,
} from "../../src/server/order";
import { startPayment } from "../../src/server/payment";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "../database/support/cart-fixtures";
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
} from "../database/support/payment-fixtures";

const ORDER_AUTH_PII_HASH_SECRET =
  "order-auth-integration-pii-hash-secret-32!" as CustomerPiiHashSecret;

function orderAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "order-auth-integration-customer-secret-32ch!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "order-auth-integration-workforce-secret-32c",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

type InternalAdapter = {
  createSession: (userId: string) => Promise<{ token: string }>;
  findSession: (
    token: string,
  ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
  deleteSession: (token: string) => Promise<void>;
};

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-023 order auth integration", () => {
  it("trusted customer session chain can getCustomerOrder", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ord-auth"),
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
          providerEventId: `ord-auth-${started.attempt.id}`,
        },
        opts,
      );

      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          ORDER_AUTH_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: orderAuthFoundationConfig().customer,
          persistence: applicationConfig(h.connectionString),
        },
        phoneDeps,
      );
      trackPersistenceHandle(runtime);

      const auth = await runtime.getAuth();
      const context = (await auth.$context) as {
        internalAdapter: InternalAdapter;
      };
      const session = await context.internalAdapter.createSession(
        h.actors.customerAId,
      );
      const identity = await resolveTrustedCustomerAuthIdentity(runtime, {
        sessionToken: session.token,
      });
      expect(identity?.userId).toBe(h.actors.customerAId);
      const actor = customerActorFromTrustedCustomerAuthIdentity(identity);

      const listed = await listCustomerOrders(h.persistence, actor, {
        limit: 5,
      });
      expect(listed.items.length).toBeGreaterThanOrEqual(1);
      const detail = await getCustomerOrder(h.persistence, actor, {
        orderId: listed.items[0]!.orderId,
      });
      expect(detail.orderId).toBe(listed.items[0]!.orderId);
      expect(detail.destination.recipientName).toBe("Ashutosh Joshi");

      await context.internalAdapter.deleteSession(session.token);
      await runtime.close();
      await otpProvider.close();
    });
  });

  it("createWorkforcePrincipalFromTrustedIdentity can acceptOrder", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ord-wf"),
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
          providerEventId: `ord-wf-${started.attempt.id}`,
        },
        opts,
      );

      const listed = await listCustomerOrders(h.persistence, h.actor, {
        limit: 5,
      });
      const orderId = listed.items[0]!.orderId;
      const revision = BigInt(listed.items[0]!.revision);

      const kitchenUser = await createEligibleWorkforceUser(h.persistence);
      await h.persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: kitchenUser.id,
          scope: {
            scopeType: "outlet",
            brandId: h.actors.tree.brand.id,
            organizationId: h.actors.tree.orgA.id,
            territoryId: h.actors.tree.terrA.id,
            outletId: h.actors.tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: membership.id,
          roleKey: "kitchen_operator",
        });
      });

      // Explicit trusted-identity factory (not a raw id object).
      const workforceActor = createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: kitchenUser.id,
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      });
      expect(workforceActor.workforceUserId).toBe(kitchenUser.id);
      // principalFor is the same mint path used by fixtures.
      expect(principalFor(kitchenUser.id).workforceUserId).toBe(
        kitchenUser.id,
      );

      const accepted = await acceptOrder(h.persistence, workforceActor, {
        orderId,
        expectedOrderRevision: revision,
      });
      expect(accepted.status).toBe("ACCEPTED");
      expect(accepted.orderId).toBe(orderId);
      expect(accepted).not.toHaveProperty("destination");
    });
  });

  it("raw user id objects fail for customer and workforce Order ops", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ord-raw"),
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
          providerEventId: `ord-raw-${started.attempt.id}`,
        },
        opts,
      );
      const listed = await listCustomerOrders(h.persistence, h.actor, {
        limit: 1,
      });
      const orderId = listed.items[0]!.orderId;
      const revision = BigInt(listed.items[0]!.revision);

      await expect(
        getCustomerOrder(
          h.persistence,
          { kind: "customer", authUserId: h.actors.customerAId },
          { orderId },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await expect(
        acceptOrder(
          h.persistence,
          {
            workforceUserId: h.actors.psa.id,
            disabledAt: null,
            passwordChangeRequired: false,
            twoFactorEnabled: true,
          },
          { orderId, expectedOrderRevision: revision },
        ),
      ).rejects.toMatchObject({ code: "WORKFORCE_AUTH_REQUIRED" });

      // customerActorFromTrustedCustomerAuthIdentity rejects raw ids.
      expect(() =>
        customerActorFromTrustedCustomerAuthIdentity({
          userId: h.actors.customerAId,
        } as never),
      ).toThrow(
        expect.objectContaining({ code: "CUSTOMER_AUTH_REQUIRED" }),
      );
    });
  });
});
