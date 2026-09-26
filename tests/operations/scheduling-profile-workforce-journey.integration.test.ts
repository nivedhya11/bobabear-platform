/**
 * IMP-036I pre-UAT — Outlet Manager configures scheduled fulfilment on Store Hours,
 * then Pickup and Delivery scheduled windows become available.
 *
 * @vitest-environment jsdom
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createElement } from "react";

import { serializeSignedCookie } from "better-call";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import { getWorkforceAuthRuntime, WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  evaluateCheckout,
  listCheckoutScheduledWindows,
  setCheckoutDestination,
  setCheckoutFulfilment,
  startCheckout,
} from "../../src/server/checkout";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import type { WebConfig } from "../../src/platform/config";
import { createEligibleWorkforceUser } from "../database/support/access-control-fixtures";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { checkoutOpts, withCheckoutReadyHarness } from "../database/support/checkout-fixtures";
import { seedPickupEligibleOutlet } from "../database/support/order-fixtures";
import { StoreSchedulingProfileClient } from "../../src/components/operations/store/StoreSchedulingProfileClient";

const outletState = vi.hoisted(() => ({
  outletId: "",
  canManage: true,
  announce: vi.fn(),
}));

vi.mock("../../src/components/operations/store/StoreOutletContext", () => ({
  useStoreOutlet: () => ({
    outletId: outletState.outletId,
    capabilities: {
      "outlet.operating_schedule.read": true,
      "outlet.operating_schedule.manage": outletState.canManage,
    },
    announce: outletState.announce,
    staleOutletId: null,
  }),
}));

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

const openHandles: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  cleanup();
  await Promise.all(openHandles.splice(0).map((handle) => handle.close()));
  await closeTrackedPersistenceHandles();
});

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

function workforceAuthConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "sched-ui-customer-auth-secret-32ch!",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "sched-ui-workforce-auth-secret-32c",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3200",
    },
    "test",
  );
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

describe("IMP-036I workforce scheduling profile journey", () => {
  it("lets an outlet manager configure lead times on Store Hours and unlocks scheduled windows", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const outletId = harness.actors.tree.outletA.id;
      outletState.outletId = outletId;
      outletState.canManage = true;
      const opts = checkoutOpts();
      await seedPickupEligibleOutlet(
        harness.persistence,
        harness.actors.brandAdminActor,
        outletId,
      );

      const manager = await createEligibleWorkforceUser(harness.persistence);
      const kitchen = await createEligibleWorkforceUser(harness.persistence);
      await harness.persistence.transaction(async (tx) => {
        const managerMembership = await createMembership(tx, {
          workforceUserId: manager.id,
          scope: {
            scopeType: "outlet",
            brandId: harness.actors.tree.brand.id,
            organizationId: harness.actors.tree.orgA.id,
            territoryId: harness.actors.tree.terrA.id,
            outletId,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: managerMembership.id, roleKey: "outlet_manager" });

        const kitchenMembership = await createMembership(tx, {
          workforceUserId: kitchen.id,
          scope: {
            scopeType: "outlet",
            brandId: harness.actors.tree.brand.id,
            organizationId: harness.actors.tree.orgA.id,
            territoryId: harness.actors.tree.terrA.id,
            outletId,
          },
          status: "active",
        });
        await grantRole(tx, {
          membershipId: kitchenMembership.id,
          roleKey: "kitchen_operator",
        });
      });

      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(harness.database.connectionString),
      });
      openHandles.push(runtime);
      const adapter = await adapterFor(runtime);
      const managerCookie = await signedCookie((await adapter.createSession(manager.id)).token);
      const kitchenCookie = await signedCookie((await adapter.createSession(kitchen.id)).token);
      const origin = workforceAuthConfig().workforce.baseURL.origin;
      const posts: unknown[] = [];
      let activeCookie = managerCookie;

      const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        void routeOperationsRequest(
          req,
          res,
          {
            runtime,
            persistence: harness.persistence,
            trustedOrigin: origin,
            stepUpSessionHashSecret: workforceAuthConfig().workforce.secret,
          },
          "scheduling-profile-ui",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      openHandles.push({
        close: () =>
          new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;

      const realFetch = globalThis.fetch.bind(globalThis);
      window.fetch = async (input, init) => {
        const raw =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const url = new URL(raw, "http://localhost:3000");
        const headers = new Headers(init?.headers);
        headers.set("cookie", activeCookie);
        headers.set("origin", origin);
        if (init?.body && url.pathname.endsWith("/scheduling-profile")) {
          posts.push(JSON.parse(String(init.body)));
        }
        return realFetch(`${base}${url.pathname}${url.search}`, {
          method: init?.method,
          headers,
          body: init?.body,
        });
      };

      const started = await startCheckout(
        harness.persistence,
        harness.actors.customerA,
        { cartId: harness.cartId },
        opts,
      );
      expect(started.fulfilmentTiming).toBe("ASAP");
      const withDestination = await setCheckoutDestination(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: harness.addressId },
        },
        opts,
      );
      const deliveryBefore = await listCheckoutScheduledWindows(
        harness.persistence,
        harness.actors.customerA,
        { checkoutId: withDestination.id },
        opts,
      );
      expect(deliveryBefore.availability).toBe("NO_TIMES");
      expect(deliveryBefore.windows).toEqual([]);

      const pickupBeforeMode = await setCheckoutFulfilment(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: withDestination.id,
          expectedCheckoutRevision: withDestination.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      const pickupBefore = await listCheckoutScheduledWindows(
        harness.persistence,
        harness.actors.customerA,
        { checkoutId: pickupBeforeMode.id },
        opts,
      );
      expect(pickupBefore.availability).toBe("NO_TIMES");
      expect(pickupBefore.windows).toEqual([]);

      activeCookie = kitchenCookie;
      const kitchenDenied = await realFetch(`${base}/api/operations/v1/outlets/${outletId}/scheduling-profile`, {
        method: "POST",
        headers: {
          cookie: kitchenCookie,
          origin,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          pickupMinLeadMinutes: 15,
          deliveryMinLeadMinutes: 15,
          expectedRevision: 0,
        }),
      });
      expect(kitchenDenied.status).toBe(403);
      expect((await kitchenDenied.json()).code).toBe("STORE_UNAUTHORIZED");
      activeCookie = managerCookie;

      const user = userEvent.setup();
      render(createElement(StoreSchedulingProfileClient));
      await waitFor(() =>
        expect(screen.getByTestId("store-scheduling-unconfigured")).toHaveTextContent(
          "Scheduled fulfilment isn't configured for this outlet.",
        ),
      );
      expect(screen.getByTestId("store-scheduling-unconfigured")).toHaveTextContent(
        "Set minimum lead times for Pickup and Delivery to make scheduled windows available.",
      );

      await user.type(screen.getByTestId("store-scheduling-pickup"), "30");
      await user.type(screen.getByTestId("store-scheduling-delivery"), "60");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(screen.getByTestId("store-scheduling-configured")).toBeInTheDocument(),
      );
      expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("30");
      expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("60");
      expect(posts[0]).toEqual({
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 60,
        expectedRevision: 0,
      });
      expect(JSON.stringify(posts[0])).not.toMatch(/[Cc]ancellation|scheduledCancellationPolicy/);

      const pickupAfter = await listCheckoutScheduledWindows(
        harness.persistence,
        harness.actors.customerA,
        { checkoutId: pickupBeforeMode.id },
        opts,
      );
      expect(pickupAfter.availability).toBe("AVAILABLE");
      expect(pickupAfter.windows.length).toBeGreaterThan(0);

      const deliveryMode = await setCheckoutFulfilment(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: pickupBeforeMode.id,
          expectedCheckoutRevision: pickupBeforeMode.revision,
          fulfilmentMode: "DELIVERY",
        },
        opts,
      );
      const deliveryReady = await setCheckoutDestination(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: deliveryMode.id,
          expectedCheckoutRevision: deliveryMode.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: harness.addressId },
        },
        opts,
      );
      const deliveryAfter = await listCheckoutScheduledWindows(
        harness.persistence,
        harness.actors.customerA,
        { checkoutId: deliveryReady.id },
        opts,
      );
      expect(deliveryAfter.availability).toBe("AVAILABLE");
      expect(deliveryAfter.windows.length).toBeGreaterThan(0);

      const evaluated = await evaluateCheckout(
        harness.persistence,
        harness.actors.customerA,
        {
          checkoutId: deliveryReady.id,
          expectedCheckoutRevision: deliveryReady.revision,
        },
        opts,
      );
      expect(evaluated.checkout.fulfilmentTiming).toBe("ASAP");
      expect(evaluated.snapshot.fulfilmentTiming).toBe("ASAP");

      await user.clear(screen.getByTestId("store-scheduling-pickup"));
      await user.type(screen.getByTestId("store-scheduling-pickup"), "45");
      await user.clear(screen.getByTestId("store-scheduling-delivery"));
      await user.type(screen.getByTestId("store-scheduling-delivery"), "90");
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("45"));
      expect(posts.at(-1)).toMatchObject({
        pickupMinLeadMinutes: 45,
        deliveryMinLeadMinutes: 90,
        expectedRevision: 1,
      });

      const staleWrite = await realFetch(
        `${base}/api/operations/v1/outlets/${outletId}/scheduling-profile`,
        {
          method: "POST",
          headers: {
            cookie: managerCookie,
            origin,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            pickupMinLeadMinutes: 20,
            deliveryMinLeadMinutes: 40,
            expectedRevision: 2,
          }),
        },
      );
      expect(staleWrite.status).toBe(200);

      await user.clear(screen.getByTestId("store-scheduling-pickup"));
      await user.type(screen.getByTestId("store-scheduling-pickup"), "15");
      await user.clear(screen.getByTestId("store-scheduling-delivery"));
      await user.type(screen.getByTestId("store-scheduling-delivery"), "15");
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(screen.getByTestId("store-scheduling-error")).toHaveTextContent(
          "This configuration changed. Saved lead times were reloaded. Review them before saving again.",
        ),
      );
      expect(posts.at(-1)).toMatchObject({
        pickupMinLeadMinutes: 15,
        deliveryMinLeadMinutes: 15,
        expectedRevision: 2,
      });
      expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("20");
      expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("40");
      expect(screen.queryByTestId("store-scheduling-success")).not.toBeInTheDocument();
    });
  });
});
