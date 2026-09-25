/**
 * IMP-036I Tranche 3 — customer Scheduled HTTP transport.
 *
 * Proves the live checkout routes, not direct scheduled-customer calls.
 */
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { saveOutletSchedulingProfile } from "../../src/server/scheduled-fulfilment/foundations";
import { mintCustomerSessionCookieHeader, withCustomerCommerceHttpService } from "./support/service-harness";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { withCheckoutReadyHarness } from "../database/support/checkout-fixtures";
import { seedPickupEligibleOutlet } from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function jsonHeaders(cookie?: string): HeadersInit {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return headers;
}

describe("IMP-036I Tranche 3 customer Scheduled HTTP", () => {
  it("requires auth, hides foreign checkouts, and mutates delivery timing only through server windows", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const { connectionString } = harness.database;
      const cookie = await mintCustomerSessionCookieHeader(connectionString, harness.actors.customerAId);
      const foreignCookie = await mintCustomerSessionCookieHeader(
        connectionString,
        harness.actors.customerBId,
      );
      const outletId = harness.actors.tree.outletA.id;

      await withCustomerCommerceHttpService(connectionString, async ({ baseUrl }) => {
        const started = await fetch(`${baseUrl}/api/v1/checkouts`, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({ cartId: harness.cartId }),
        });
        expect(started.status).toBe(200);
        const startedBody = await started.json();
        const checkoutId = startedBody.checkout.id as string;
        let revision = startedBody.checkout.revision as string;
        expect(startedBody.checkout.fulfilmentTiming).toBe("ASAP");

        const windowsPath = `${baseUrl}/api/v1/checkouts/${checkoutId}/scheduled-windows`;
        const timingPath = `${baseUrl}/api/v1/checkouts/${checkoutId}/fulfilment-timing`;

        const unauthenticated = await fetch(windowsPath);
        expect(unauthenticated.status).toBe(401);
        expect((await unauthenticated.json()).code).toBe("CUSTOMER_AUTH_REQUIRED");

        const foreign = await fetch(windowsPath, { headers: { cookie: foreignCookie } });
        expect(foreign.status).toBe(404);
        const foreignBody = await foreign.json();
        expect(foreignBody.code).toBe("CHECKOUT_NOT_FOUND");
        expect(JSON.stringify(foreignBody)).not.toContain(checkoutId);

        const missingProfile = await fetch(windowsPath, { headers: { cookie } });
        expect(missingProfile.status).toBe(200);
        const missingProfileBody = await missingProfile.json();
        expect(missingProfileBody.availability).toBe("DESTINATION_REQUIRED");
        expect(missingProfileBody.windows).toEqual([]);

        const timingWithoutDestination = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentTiming: "SCHEDULED",
            scheduledWindowStartAt: "2026-09-26T08:00:00.000Z",
            scheduledWindowEndAt: "2026-09-26T08:30:00.000Z",
          }),
        });
        expect(timingWithoutDestination.status).toBe(409);
        expect((await timingWithoutDestination.json()).code).toBe("CHECKOUT_STATE_CONFLICT");

        const dest = await fetch(`${baseUrl}/api/v1/checkouts/${checkoutId}/destination`, {
          method: "PUT",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: harness.addressId },
          }),
        });
        expect(dest.status).toBe(200);
        revision = (await dest.json()).checkout.revision as string;

        const noTimes = await fetch(windowsPath, { headers: { cookie } });
        expect(noTimes.status).toBe(200);
        const noTimesBody = await noTimes.json();
        expect(noTimesBody.availability).toBe("NO_TIMES");
        expect(noTimesBody.windows).toEqual([]);

        await saveOutletSchedulingProfile(harness.persistence, {
          outletId,
          pickupMinLeadMinutes: 30,
          deliveryMinLeadMinutes: 45,
        });

        const listed = await fetch(windowsPath, { headers: { cookie } });
        expect(listed.status).toBe(200);
        const listedBody = await listed.json();
        expect(listedBody.availability).toBe("AVAILABLE");
        expect(listedBody.timeZone).toBe("Asia/Kolkata");
        expect(listedBody.cancellationCutoffMinutes).toBe(60);
        expect(listedBody.windows.length).toBeGreaterThan(0);
        const chosen = listedBody.windows[0] as { startAt: string; endAt: string; timeZone: string };
        expect(chosen.timeZone).toBe("Asia/Kolkata");
        expect(new Date(chosen.endAt).getTime() - new Date(chosen.startAt).getTime()).toBe(30 * 60 * 1000);

        const foreignAfter = await fetch(windowsPath, { headers: { cookie: foreignCookie } });
        expect(foreignAfter.status).toBe(404);
        const foreignAfterBody = await foreignAfter.json();
        expect(foreignAfterBody).not.toHaveProperty("windows");
        expect(JSON.stringify(foreignAfterBody)).not.toContain(chosen.startAt);

        const wrongMethod = await fetch(windowsPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: "{}",
        });
        expect(wrongMethod.status).toBe(405);
        expect((await wrongMethod.json()).code).toBe("METHOD_NOT_ALLOWED");

        const wrongTimingMethod = await fetch(timingPath, { headers: { cookie } });
        expect(wrongTimingMethod.status).toBe(405);
        expect((await wrongTimingMethod.json()).code).toBe("METHOD_NOT_ALLOWED");

        const invalidJson = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: "[]",
        });
        expect(invalidJson.status).toBe(400);
        expect((await invalidJson.json()).code).toBe("INVALID_REQUEST");

        const invalidTiming = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentTiming: "LATER",
          }),
        });
        expect(invalidTiming.status).toBe(400);
        expect((await invalidTiming.json()).code).toBe("CHECKOUT_INVALID_INPUT");

        const manufactured = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentTiming: "SCHEDULED",
            scheduledWindowStartAt: "1999-01-01T00:00:00.000Z",
            scheduledWindowEndAt: "1999-01-01T00:30:00.000Z",
          }),
        });
        expect(manufactured.status).toBe(409);
        expect((await manufactured.json()).code).toBe("CHECKOUT_STATE_CONFLICT");

        const stillAsap = await fetch(
          `${baseUrl}/api/v1/checkouts/active?checkoutId=${checkoutId}`,
          { headers: { cookie } },
        );
        expect(stillAsap.status).toBe(200);
        expect((await stillAsap.json()).checkout.fulfilmentTiming).toBe("ASAP");

        const scheduled = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentTiming: "SCHEDULED",
            scheduledWindowStartAt: chosen.startAt,
            scheduledWindowEndAt: chosen.endAt,
          }),
        });
        expect(scheduled.status).toBe(200);
        const scheduledBody = await scheduled.json();
        expect(scheduledBody.checkout.fulfilmentTiming).toBe("SCHEDULED");
        expect(scheduledBody.checkout.scheduledWindowStartAt).toBe(chosen.startAt);
        const scheduledRevision = scheduledBody.checkout.revision as string;
        expect(scheduledRevision).not.toBe(revision);

        const stale = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentTiming: "ASAP",
          }),
        });
        expect(stale.status).toBe(409);
        expect((await stale.json()).code).toBe("CHECKOUT_CONFLICT");

        const unchanged = await fetch(
          `${baseUrl}/api/v1/checkouts/active?checkoutId=${checkoutId}`,
          { headers: { cookie } },
        );
        expect(unchanged.status).toBe(200);
        const unchangedCheckout = (await unchanged.json()).checkout;
        expect(unchangedCheckout.fulfilmentTiming).toBe("SCHEDULED");
        expect(unchangedCheckout.scheduledWindowStartAt).toBe(chosen.startAt);
        expect(unchangedCheckout.revision).toBe(scheduledRevision);

        const foreignTiming = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(foreignCookie),
          body: JSON.stringify({
            expectedCheckoutRevision: scheduledRevision,
            fulfilmentTiming: "ASAP",
          }),
        });
        expect(foreignTiming.status).toBe(404);
        expect(JSON.stringify(await foreignTiming.json())).not.toContain(chosen.startAt);

        const asap = await fetch(timingPath, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: scheduledRevision,
            fulfilmentTiming: "ASAP",
          }),
        });
        expect(asap.status).toBe(200);
        const asapBody = await asap.json();
        expect(asapBody.checkout.fulfilmentTiming).toBe("ASAP");
        expect(asapBody.checkout.scheduledWindowStartAt).toBeNull();
      });
    });
  });

  it("schedules pickup without a delivery destination", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const { connectionString } = harness.database;
      const cookie = await mintCustomerSessionCookieHeader(connectionString, harness.actors.customerAId);
      const outletId = harness.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(harness.persistence, harness.actors.brandAdminActor, outletId);
      await saveOutletSchedulingProfile(harness.persistence, {
        outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 90,
      });

      await withCustomerCommerceHttpService(connectionString, async ({ baseUrl }) => {
        const started = await fetch(`${baseUrl}/api/v1/checkouts`, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({ cartId: harness.cartId }),
        });
        expect(started.status).toBe(200);
        const startedBody = await started.json();
        const checkoutId = startedBody.checkout.id as string;
        let revision = startedBody.checkout.revision as string;

        const fulfilment = await fetch(`${baseUrl}/api/v1/checkouts/${checkoutId}/fulfilment`, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: revision,
            fulfilmentMode: "PICKUP",
            pickupOutletId: outletId,
          }),
        });
        expect(fulfilment.status).toBe(200);
        const fulfilmentBody = await fulfilment.json();
        expect(fulfilmentBody.checkout.fulfilmentMode).toBe("PICKUP");
        expect(fulfilmentBody.checkout.destination).toBeNull();
        revision = fulfilmentBody.checkout.revision as string;

        const listed = await fetch(
          `${baseUrl}/api/v1/checkouts/${checkoutId}/scheduled-windows`,
          { headers: { cookie } },
        );
        expect(listed.status).toBe(200);
        const listedBody = await listed.json();
        expect(listedBody.availability).toBe("AVAILABLE");
        expect(listedBody.cancellationCutoffMinutes).toBe(30);
        expect(listedBody.availability).not.toBe("DESTINATION_REQUIRED");
        const chosen = listedBody.windows[0] as { startAt: string; endAt: string };

        const scheduled = await fetch(
          `${baseUrl}/api/v1/checkouts/${checkoutId}/fulfilment-timing`,
          {
            method: "POST",
            headers: jsonHeaders(cookie),
            body: JSON.stringify({
              expectedCheckoutRevision: revision,
              fulfilmentTiming: "SCHEDULED",
              scheduledWindowStartAt: chosen.startAt,
              scheduledWindowEndAt: chosen.endAt,
            }),
          },
        );
        expect(scheduled.status).toBe(200);
        const scheduledBody = await scheduled.json();
        expect(scheduledBody.checkout.fulfilmentMode).toBe("PICKUP");
        expect(scheduledBody.checkout.destination).toBeNull();
        expect(scheduledBody.checkout.fulfilmentTiming).toBe("SCHEDULED");

        const evaluated = await fetch(`${baseUrl}/api/v1/checkouts/${checkoutId}/evaluate`, {
          method: "POST",
          headers: jsonHeaders(cookie),
          body: JSON.stringify({
            expectedCheckoutRevision: scheduledBody.checkout.revision,
          }),
        });
        expect(evaluated.status).toBe(200);
        const evalBody = await evaluated.json();
        expect(evalBody.snapshot.fulfilmentMode).toBe("PICKUP");
        expect(evalBody.snapshot.destination).toBeNull();
        expect(evalBody.snapshot.scheduledCancellationCutoffMinutes).toBe(30);
      });
    });
  });

  it("rejects an unknown checkout id without disclosing another customer's checkout", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const cookie = await mintCustomerSessionCookieHeader(
        harness.database.connectionString,
        harness.actors.customerAId,
      );
      await withCustomerCommerceHttpService(harness.database.connectionString, async ({ baseUrl }) => {
        const missing = randomUUID();
        const response = await fetch(`${baseUrl}/api/v1/checkouts/${missing}/scheduled-windows`, {
          headers: { cookie },
        });
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.code).toBe("CHECKOUT_NOT_FOUND");
        expect(body).not.toHaveProperty("windows");
      });
    });
  });
});
