/** IMP-036F F5 — Pricing-owned delivery tariff Admin HTTP. */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it, inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import { resolveCustomerDeliveryCharge } from "../../src/server/pricing/resolve-delivery-charge";
import type { WebConfig } from "../../src/platform/config";
import type { CheckoutDestination } from "../../src/shared/checkout";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import {
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
} from "../database/support/serviceability-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

type InternalAdapter = { createSession: (userId: string) => Promise<{ token: string }> };

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

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
      CUSTOMER_AUTH_SECRET: "tariff-admin-http-customer-auth-secret32",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "tariff-admin-http-workforce-auth-secret",
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
  return ((await auth.$context) as { internalAdapter: InternalAdapter }).internalAdapter;
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

const AT = new Date("2026-09-13T12:00:00.000Z");
const BANDS = [
  { maxDistanceMeters: 7000, amountPaise: 2500 },
  { maxDistanceMeters: 9000, amountPaise: 6000 },
];

function destination(): CheckoutDestination {
  return {
    destinationKind: "ONE_TIME_ADDRESS",
    sourceSavedAddressId: null,
    recipientName: "Tariff Customer",
    recipientPhone: "+919999999999",
    addressLine1: "1 Test Street",
    addressLine2: null,
    landmark: null,
    locality: null,
    city: "Dehradun",
    stateCode: "UK",
    postalCode: "248001",
    coordinates: TEST_INSIDE_COORDS,
    label: null,
  };
}

describe("IMP-036F F5 Delivery tariff Admin HTTP", () => {
  it("Pricing-authorized tariff read/mutate/preview with Brand derived from Outlet", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "trf5"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "urf5"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const outletManager = await createEligibleWorkforceUser(persistence);
      const actor = principalFor(brandAdmin.id);

      await persistence.transaction(async (tx) => {
        const membership = await createMembership(tx, {
          workforceUserId: brandAdmin.id,
          scope: { scopeType: "brand", brandId: tree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
        const otherMembership = await createMembership(tx, {
          workforceUserId: otherBrandAdmin.id,
          scope: { scopeType: "brand", brandId: otherTree.brand.id },
          status: "active",
        });
        await grantRole(tx, { membershipId: otherMembership.id, roleKey: "brand_admin" });
        const outletMembership = await createMembership(tx, {
          workforceUserId: outletManager.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: outletMembership.id, roleKey: "outlet_manager" });
      });

      await seedOutletDistanceServiceability(persistence, actor, tree.outletA.id);

      const runtime = getWorkforceAuthRuntime({
        auth: workforceAuthConfig().workforce,
        persistence: applicationConfig(database.connectionString),
      });
      openHandles.push(runtime);
      const adapter = await adapterFor(runtime);
      const server = createServer((req, res) => {
        void routeOperationsRequest(
          req,
          res,
          {
            runtime,
            persistence,
            trustedOrigin: workforceAuthConfig().workforce.baseURL.origin,
            stepUpSessionHashSecret: workforceAuthConfig().workforce.secret,
          },
          "tariff-admin-http-request",
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      openHandles.push({
        close: () =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      });

      const headersFor = async (userId: string, extra: HeadersInit = {}) => {
        const session = await adapter.createSession(userId);
        return {
          cookie: await signedCookie(session.token),
          origin: workforceAuthConfig().workforce.baseURL.origin,
          "content-type": "application/json",
          ...extra,
        };
      };
      const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;

      const path = `/api/admin/v1/brands/${tree.brand.id}/pricing/outlets/${tree.outletA.id}/delivery-tariff`;

      {
        const res = await fetch(`${base}${path}`);
        expect(res.status).toBe(401);
      }

      const read = await fetch(`${base}${path}`, { headers: await headersFor(brandAdmin.id) });
      expect(read.status).toBe(200);
      const readBody = await json(read);
      const tariff = readBody.tariff as {
        brandId: string;
        expectedTariffConfigRevision: string;
        deliveryFeeBands: unknown[];
      };
      expect(tariff.brandId).toBe(tree.brand.id);
      expect(tariff.deliveryFeeBands).toEqual([]);
      const revision = tariff.expectedTariffConfigRevision;

      const outletDenied = await fetch(`${base}${path}`, {
        method: "POST",
        headers: await headersFor(outletManager.id),
        body: JSON.stringify({
          expectedTariffConfigRevision: revision,
          deliveryFeeBands: BANDS,
          freeDeliverySubtotalThresholdPaise: 50_000,
        }),
      });
      expect(outletDenied.status).toBe(403);
      expect(await json(outletDenied)).toMatchObject({ ok: false, code: "PRICING_UNAUTHORIZED" });

      const preview = await fetch(`${base}${path}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          deliveryFeeBands: BANDS,
          freeDeliverySubtotalThresholdPaise: 50_000,
        }),
      });
      expect(preview.status).toBe(200);
      const previewBody = await json(preview);
      const previewPayload = previewBody.preview as {
        expectedTariffConfigRevision: string;
        wouldChangeCustomerDeliveryPrice: boolean;
        geographicServiceabilityUnchanged: boolean;
      };
      expect(previewPayload.expectedTariffConfigRevision).toBe(revision);
      expect(previewPayload.wouldChangeCustomerDeliveryPrice).toBe(true);
      expect(previewPayload.geographicServiceabilityUnchanged).toBe(true);

      const updated = await fetch(`${base}${path}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedTariffConfigRevision: revision,
          deliveryFeeBands: BANDS,
          freeDeliverySubtotalThresholdPaise: 50_000,
        }),
      });
      expect(updated.status).toBe(200);
      const updatedBody = await json(updated);
      expect(updatedBody.revision).toBe(String(BigInt(revision) + BigInt(1)));

      const stale = await fetch(`${base}${path}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedTariffConfigRevision: revision,
          deliveryFeeBands: [{ maxDistanceMeters: 9000, amountPaise: 100 }],
          freeDeliverySubtotalThresholdPaise: null,
        }),
      });
      expect(stale.status).toBe(409);
      expect(await json(stale)).toMatchObject({ ok: false, code: "TARIFF_STALE_REVISION" });

      const invalid = await fetch(`${base}${path}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedTariffConfigRevision: updatedBody.revision,
          deliveryFeeBands: [
            { maxDistanceMeters: 9000, amountPaise: 6000 },
            { maxDistanceMeters: 7000, amountPaise: 2500 },
          ],
          freeDeliverySubtotalThresholdPaise: null,
        }),
      });
      expect(invalid.status).toBe(400);

      const afterInvalid = await fetch(`${base}${path}`, { headers: await headersFor(brandAdmin.id) });
      const afterInvalidBody = await json(afterInvalid);
      const afterInvalidTariff = afterInvalidBody.tariff as {
        expectedTariffConfigRevision: string;
        deliveryFeeBands: Array<{ amountPaise: number }>;
        freeDeliverySubtotalThresholdPaise: string | null;
      };
      expect(afterInvalidTariff.expectedTariffConfigRevision).toBe(updatedBody.revision);
      expect(afterInvalidTariff.deliveryFeeBands[0]?.amountPaise).toBe(2500);
      expect(afterInvalidTariff.freeDeliverySubtotalThresholdPaise).toBe("50000");

      const foreign = await fetch(
        `${base}/api/admin/v1/brands/${tree.brand.id}/pricing/outlets/${otherTree.outletA.id}/delivery-tariff`,
        { headers: await headersFor(brandAdmin.id) },
      );
      expect(foreign.status).toBe(404);
      expect(await json(foreign)).toMatchObject({ ok: false, code: "PRICING_NOT_FOUND" });

      const missing = await fetch(
        `${base}/api/admin/v1/brands/${tree.brand.id}/pricing/outlets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/delivery-tariff`,
        { headers: await headersFor(brandAdmin.id) },
      );
      expect(missing.status).toBe(404);

      const charge = await persistence.withContext((ctx) =>
        resolveCustomerDeliveryCharge(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          destination: destination(),
          at: AT,
          prePromotionSubtotalPaise: BigInt(10_000),
        }),
      );
      expect(charge?.amountPaise).toBe(BigInt(2500));
    });
  }, 180_000);
});
