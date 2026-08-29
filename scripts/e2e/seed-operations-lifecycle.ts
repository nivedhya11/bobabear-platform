#!/usr/bin/env -S node --conditions=react-server --import tsx
/** Test-only IMP-030 fixtures for the isolated Compose database. */
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { sql } from "drizzle-orm";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getCustomerAuthRuntime,
  resolveTrustedCustomerAuthIdentity,
} from "../../src/server/auth/customer";
import { createWorkforceOperatorAuthRuntime, createWorkforceOperatorUser } from "../../src/server/auth/workforce/operator";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { addCartLine } from "../../src/server/cart";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../src/server/cart/auth-adapter";
import { createOwnAddress } from "../../src/server/customer-addresses";
import { customerActorFromTrustedCustomerAuthSession } from "../../src/server/customer-addresses/auth-adapter";
import {
  createCustomerOtpProvider,
  createCustomerTemporaryIdentityDeriver,
  loadCustomerPiiHashSecret,
} from "../../src/server/customer-auth";
import { evaluateCheckout, setCheckoutDestination, startCheckout } from "../../src/server/checkout";
import { acceptOrder, listCustomerOrders } from "../../src/server/order";
import { processVerifiedProviderEvent, startPayment } from "../../src/server/payment";
import { createFakePaymentProvider, FAKE_PAYMENT_SIGNATURE_HEADER } from "../../src/server/payment/provider/fake";
import { sealVerifiedProviderEvent } from "../../src/server/payment/verified-event";
import { getApplicationPersistence } from "../../src/server/persistence";
import { loadConfig } from "../../src/platform/config";
import { normalizeIndianMobileNumber } from "../../src/shared/customer-auth/phone";
import { createEligibleWorkforceUser, principalFor } from "../../tests/database/support/access-control-fixtures";
import { seedCustomerOrderingCommerce } from "./seed-customer-ordering";

const manifestPath = process.env.OPERATIONS_E2E_FIXTURE_MANIFEST;
const email = process.env.WORKFORCE_E2E_EMAIL;
const temporaryPassword = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
if (!manifestPath || !email || !temporaryPassword) throw new Error("Missing private E2E fixture configuration.");
const fixtureManifestPath: string = manifestPath;
const workforceEmail: string = email;
const workforceTemporaryPassword: string = temporaryPassword;

const orderPhoneNumbers = [
  "+919876543211",
  "+919876543212",
  "+919876543213",
] as const;

async function placeOrder(persistence: ReturnType<typeof getApplicationPersistence>, brandId: string, phoneIndex: 0 | 1 | 2) {
  const config = loadConfig({ processKind: "worker", source: process.env });
  const otpProvider = createCustomerOtpProvider({ kind: "local", environmentType: "test", fixedCode: "123456" });
  const runtime = getCustomerAuthRuntime(
    {
      auth: loadAuthFoundationConfig(process.env, "test").customer,
      persistence: config,
    },
    {
      otpProvider,
      identityDeriver: createCustomerTemporaryIdentityDeriver(
        loadCustomerPiiHashSecret(process.env, {
          customerAuthSecret: process.env.CUSTOMER_AUTH_SECRET,
          workforceAuthSecret: process.env.WORKFORCE_AUTH_SECRET,
        }),
      ),
    },
  );
  let actor: ReturnType<typeof customerActorFromTrustedCustomerAuthIdentity>;
  let addressesActor: ReturnType<typeof customerActorFromTrustedCustomerAuthSession>;
  try {
    const normalizedPhone = normalizeIndianMobileNumber(orderPhoneNumbers[phoneIndex]);
    if (!normalizedPhone.ok) throw new Error("operations lifecycle E2E phone fixture is invalid");
    const phoneNumber = normalizedPhone.phoneNumber;
    const auth = await runtime.getAuth();
    const now = new Date();
    await otpProvider.startVerification({ phoneNumber, generatedCode: "123456", now, expiresAt: new Date(now.getTime() + 5 * 60_000) });
    const verification = await auth.api.verifyPhoneNumber({
      body: { phoneNumber, code: "123456", disableSession: false, updatePhoneNumber: false },
      returnHeaders: true,
    });
    const sessionCookie = verification.headers.getSetCookie()
      .map((cookie) => cookie.split(";", 1)[0]!)
      .find((cookie) => cookie.includes("session_token"));
    if (!sessionCookie) throw new Error("Customer auth did not issue a session.");
    const identity = await resolveTrustedCustomerAuthIdentity(runtime, { headers: new Headers({ cookie: sessionCookie }) });
    if (!identity) throw new Error("Customer auth session did not resolve.");
    actor = customerActorFromTrustedCustomerAuthIdentity(identity);
    addressesActor = customerActorFromTrustedCustomerAuthSession(identity);
  } finally {
    await runtime.close();
    await otpProvider.close();
  }
  const variant = await persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute<{ id: string }>("select id from app.catalog_variants where lifecycle_status = 'active' limit 1");
    const id = result.rows[0]?.id;
    if (!id) throw new Error("No active variant after commerce seed.");
    return id;
  });
  const cart = await addCartLine(persistence, { kind: "customer", actor, brandId }, { variantId: variant, quantity: 1 });
  const address = await createOwnAddress(persistence, addressesActor, {
    recipientName: "Operations E2E Customer",
    recipientPhone: "+919876543210",
    addressLine1: "Flat 204, Block-B",
    city: "Dehradun",
    stateCode: "IN-UT",
    postalCode: "248001",
  });
  const checkoutPolicy = { checkoutTtlMs: 15 * 60 * 1000 };
  const draft = await startCheckout(persistence, actor, { cartId: cart.cart.id }, { policy: checkoutPolicy });
  const withDestination = await setCheckoutDestination(persistence, actor, {
    checkoutId: draft.id,
    expectedCheckoutRevision: draft.revision,
    destination: { kind: "SAVED_ADDRESS", savedAddressId: address.id },
  });
  const ready = await evaluateCheckout(persistence, actor, {
    checkoutId: withDestination.id,
    expectedCheckoutRevision: withDestination.revision,
  }, { policy: checkoutPolicy });
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const paymentOptions = { provider, policy: {}, checkoutPolicy };
  const started = await startPayment(persistence, actor, { checkoutId: ready.checkout.id, expectedCheckoutRevision: ready.checkout.revision, paymentMethodIntent: "upi", idempotencyKey: `operations-e2e-${phoneIndex}-${crypto.randomUUID()}` }, paymentOptions);
  const rawBody = new TextEncoder().encode(JSON.stringify({ executionIdentity: started.attempt.providerExecutionIdentity, outcome: "succeed", amountPaise: started.payment.expectedAmountPaise.toString(), providerEventId: `operations-e2e-${phoneIndex}-${started.attempt.id}` }));
  const headers = Object.freeze({ [FAKE_PAYMENT_SIGNATURE_HEADER]: provider.computeWebhookSignature(rawBody) });
  const evidence = await provider.verifyWebhook({ rawBody, headers });
  if ("family" in evidence) throw new Error("Payment provider returned refund evidence.");
  await processVerifiedProviderEvent(persistence, sealVerifiedProviderEvent({ provider: provider.name, rawBody, headers, evidence }), paymentOptions);
  const order = (await listCustomerOrders(persistence, actor, { limit: 1 })).items[0];
  if (!order) throw new Error("Order placement did not create an order.");
  return order;
}

async function main() {
  const config = loadConfig({ processKind: "worker", source: process.env });
  const commerce = await seedCustomerOrderingCommerce(config);
  const persistence = getApplicationPersistence(config);
  const auth = loadAuthFoundationConfig(process.env, "test").workforce;
  const runtime = createWorkforceOperatorAuthRuntime({ auth, persistence: config });
  try {
    const scope = await persistence.withContext(async (ctx) => {
      const result = await ctx.db.execute<{ organization_id: string; territory_id: string }>(sql`
        select organization_id, territory_id from app.outlets where id = ${commerce.outletId}::uuid
      `);
      const outlet = result.rows[0];
      if (!outlet) throw new Error("Seeded outlet disappeared.");
      return outlet;
    });
    const operator = await createWorkforceOperatorUser(runtime, { email: workforceEmail, name: "Operations E2E Manager", temporaryPassword: workforceTemporaryPassword });
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, { workforceUserId: operator.userId, status: "active", scope: { scopeType: "outlet", brandId: commerce.brandId, organizationId: scope.organization_id, territoryId: scope.territory_id, outletId: commerce.outletId } });
      await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
    });
    const preseedUser = await createEligibleWorkforceUser(persistence, { name: "Operations E2E Preseed Actor" });
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, { workforceUserId: preseedUser.id, status: "active", scope: { scopeType: "outlet", brandId: commerce.brandId, organizationId: scope.organization_id, territoryId: scope.territory_id, outletId: commerce.outletId } });
      await grantRole(tx, { membershipId: membership.id, roleKey: "outlet_manager" });
    });
    const a = await placeOrder(persistence, commerce.brandId, 0);
    const b = await placeOrder(persistence, commerce.brandId, 1);
    const c = await placeOrder(persistence, commerce.brandId, 2);
    const accepted = await acceptOrder(persistence, principalFor(preseedUser.id), { orderId: b.orderId, expectedOrderRevision: BigInt(b.revision) });
    if (accepted.status !== "ACCEPTED") throw new Error("Preseed Order B did not become ACCEPTED.");
    await writeFile(fixtureManifestPath, JSON.stringify({ email: workforceEmail, orders: { accept: { id: a.orderId, number: a.orderNumber, status: "PLACED", revision: a.revision }, fulfil: { id: b.orderId, number: b.orderNumber, status: accepted.status, revision: accepted.revision }, cancel: { id: c.orderId, number: c.orderNumber, status: "PLACED", revision: c.revision } }, outletId: commerce.outletId }), { mode: 0o600 });
  } finally {
    await runtime.close();
    await persistence.close();
  }
}
main().catch((error: unknown) => { process.stderr.write(`operations lifecycle seed failed: ${error instanceof Error ? error.message : "unknown"}\n`); process.exitCode = 1; });
