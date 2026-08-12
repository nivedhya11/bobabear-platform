/**
 * Payment ↔ customer-auth integration (IMP-022) — PAY-G5.
 *
 * Only trusted session → CustomerActor path may start Payment.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/payment/auth-adapter";
import { startPayment } from "../../src/server/payment";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "../database/support/cart-fixtures";
import {
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";

const PAYMENT_AUTH_PII_HASH_SECRET =
  "payment-auth-integration-pii-hash-secret-32!" as CustomerPiiHashSecret;

function paymentAuthFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "payment-auth-integration-customer-secret-32ch!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "payment-auth-integration-workforce-secret-32c",
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

describe("IMP-022 payment auth integration", () => {
  it("only trusted live-session identity can start Payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      const otpProvider = createLocalCustomerOtpProviderForTests({
        environmentType: "test",
      });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(
          PAYMENT_AUTH_PII_HASH_SECRET,
        ),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: paymentAuthFoundationConfig().customer,
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

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const started = await startPayment(
        h.persistence,
        actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("auth"),
        },
        paymentOpts(provider),
      );
      expect(started.payment.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(started.payment.currency).toBe("INR");
      expect(started.payment.status).toBe("PROCESSING");

      await context.internalAdapter.deleteSession(session.token);
      await runtime.close();
      await otpProvider.close();
    });
  });

  it("forged raw customer id actor is rejected", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      await expect(
        startPayment(
          h.persistence,
          { kind: "customer", authUserId: h.actors.customerAId },
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
          },
          paymentOpts(provider),
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });
});
