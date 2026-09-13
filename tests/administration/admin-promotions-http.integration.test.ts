/** IMP-036F F5 — Promotions / Coupons commercial authoring Admin HTTP. */
import { createServer } from "node:http";

import { serializeSignedCookie } from "better-call";
import { afterEach, describe, expect, it } from "vitest";
import { inject } from "vitest";

import { createMembership, grantRole } from "../../src/server/access-control";
import {
  getWorkforceAuthRuntime,
  WORKFORCE_AUTH_SESSION_COOKIE_NAME,
} from "../../src/server/auth/workforce";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { classifyAdminPromotionsRoute } from "../../src/server/operations/http/admin-promotions-routes";
import { routeOperationsRequest } from "../../src/server/operations/http/router";
import { getApplicationPersistence } from "../../src/server/persistence";
import { getPromotion } from "../../src/server/promotions";
import type { WebConfig } from "../../src/platform/config";
import {
  createEligibleWorkforceUser,
  seedBrandTree,
} from "../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";
import { uniqueCode } from "../database/support/promotions-fixtures";

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
      CUSTOMER_AUTH_SECRET: "promo-admin-http-customer-auth-secret32",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "promo-admin-http-workforce-auth-secret",
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

const STARTS_AT = "2026-06-01T00:00:00.000Z";
const MERCHANDISE_TARGET = {
  targetType: "all_merchandise",
  productId: null,
  variantId: null,
  chargeDefinitionId: null,
};

describe("classifyAdminPromotionsRoute", () => {
  it("classifies Brand-scoped Promotions and Coupon commercial routes", () => {
    const brandId = "11111111-1111-4111-8111-111111111111";
    const promotionId = "22222222-2222-4222-8222-222222222222";
    const couponId = "33333333-3333-4333-8333-333333333333";
    const base = `/api/admin/v1/brands/${brandId}`;

    expect(classifyAdminPromotionsRoute(`${base}/promotions`)).toEqual({
      kind: "list_promotions",
      brandId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}`)).toEqual({
      kind: "get_promotion",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/draft`)).toEqual({
      kind: "update_promotion_draft",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/benefit`)).toEqual({
      kind: "set_benefit",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/targets`)).toEqual({
      kind: "set_targets",
      brandId,
      promotionId,
    });
    expect(
      classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/consequence-preview`),
    ).toEqual({
      kind: "promotion_consequence_preview",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/activate`)).toEqual({
      kind: "activate_promotion",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/retire`)).toEqual({
      kind: "retire_promotion",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/promotions/${promotionId}/coupons`)).toEqual({
      kind: "list_coupons",
      brandId,
      promotionId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/coupons/${couponId}`)).toEqual({
      kind: "get_coupon",
      brandId,
      couponId,
    });
    expect(classifyAdminPromotionsRoute(`${base}/coupons/${couponId}/activate`)).toEqual({
      kind: "activate_coupon",
      brandId,
      couponId,
    });
    expect(classifyAdminPromotionsRoute(`/api/admin/v1/brands/${brandId}/pricing`)).toBeNull();
    expect(classifyAdminPromotionsRoute("/api/commercial/v1/promotions")).toBeNull();
  });
});

describe("IMP-036F F5 Promotions commercial Admin HTTP", () => {
  it("covers draft CAS, consequence review, activation, coupons, anti-leak, and Origin", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "prf5"));
      const otherTree = await persistence.transaction((tx) => seedBrandTree(tx, "qrf5"));
      const brandAdmin = await createEligibleWorkforceUser(persistence);
      const otherBrandAdmin = await createEligibleWorkforceUser(persistence);
      const kitchen = await createEligibleWorkforceUser(persistence);

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
        const kitchenMembership = await createMembership(tx, {
          workforceUserId: kitchen.id,
          scope: {
            scopeType: "outlet",
            brandId: tree.brand.id,
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            outletId: tree.outletA.id,
          },
          status: "active",
        });
        await grantRole(tx, { membershipId: kitchenMembership.id, roleKey: "kitchen_operator" });
      });

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
          },
          "promotions-admin-http-request",
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

      const brandId = tree.brand.id;
      const promoPath = `/api/admin/v1/brands/${brandId}/promotions`;

      {
        const res = await fetch(`${base}${promoPath}`);
        expect(res.status).toBe(401);
      }

      {
        const res = await fetch(`${base}${promoPath}`, {
          method: "POST",
          headers: await headersFor(brandAdmin.id, { origin: "https://evil.example" }),
          body: JSON.stringify({
            code: uniqueCode("http"),
            displayName: "Origin blocked",
            scopeType: "brand",
            triggerType: "automatic",
            startsAt: STARTS_AT,
          }),
        });
        expect(res.status).toBe(403);
        expect(await json(res)).toMatchObject({ ok: false, code: "PROMOTIONS_REQUEST_INVALID" });
      }

      const created = await fetch(`${base}${promoPath}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          code: uniqueCode("http"),
          displayName: "HTTP Promo",
          scopeType: "brand",
          triggerType: "automatic",
          startsAt: STARTS_AT,
        }),
      });
      expect(created.status).toBe(200);
      const createdBody = await json(created);
      const promotion = createdBody.promotion as { id: string; revision: string };
      expect(promotion.revision).toBe("1");
      const promotionId = promotion.id;
      const itemPath = `${promoPath}/${promotionId}`;

      const draft = await fetch(`${base}${itemPath}/draft`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "1",
          displayName: "HTTP Promo Revised",
        }),
      });
      expect(draft.status).toBe(200);
      expect(await json(draft)).toMatchObject({ ok: true, revision: "2" });

      const staleDraft = await fetch(`${base}${itemPath}/draft`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "1",
          displayName: "Stale",
        }),
      });
      expect(staleDraft.status).toBe(409);
      expect(await json(staleDraft)).toMatchObject({ ok: false, code: "PROMOTION_STALE_REVISION" });

      const benefit = await fetch(`${base}${itemPath}/benefit`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "2",
          benefitType: "percentage_discount",
          percentageBps: 1000,
        }),
      });
      expect(benefit.status).toBe(200);
      expect(await json(benefit)).toMatchObject({ revision: "3" });

      const qualifier = await fetch(`${base}${itemPath}/targets`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "3",
          targetRole: "qualifier",
          targets: [MERCHANDISE_TARGET],
        }),
      });
      expect(qualifier.status).toBe(200);
      expect(await json(qualifier)).toMatchObject({ revision: "4" });

      const benefitTargets = await fetch(`${base}${itemPath}/targets`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "4",
          targetRole: "benefit",
          targets: [MERCHANDISE_TARGET],
        }),
      });
      expect(benefitTargets.status).toBe(200);
      expect(await json(benefitTargets)).toMatchObject({ revision: "5" });

      const preview = await fetch(`${base}${itemPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ proposedStatus: "active" }),
      });
      expect(preview.status).toBe(200);
      const previewBody = await json(preview);
      const previewPayload = previewBody.preview as {
        expectedPromotionRevision: string;
        supportedLifecycleStates: string[];
        lifecycleStatus: string;
        currentStatus: string;
        proposedStatus: string;
        customerVisibleImplication: string;
      };
      expect(previewPayload.expectedPromotionRevision).toBe("5");
      expect(previewPayload.lifecycleStatus).toBe("draft");
      expect(previewPayload.currentStatus).toBe("draft");
      expect(previewPayload.proposedStatus).toBe("active");
      expect(previewPayload.customerVisibleImplication).toMatch(/Active automatic/i);
      expect(previewPayload.supportedLifecycleStates).toEqual(["draft", "active", "retired"]);
      expect(previewPayload.supportedLifecycleStates).not.toContain("scheduled");
      const afterPreview = await persistence.withContext((ctx) => getPromotion(ctx, promotionId));
      expect(afterPreview?.revision).toBe(BigInt(5));
      expect(afterPreview?.status).toBe("draft");

      const mutatedAfterReview = await fetch(`${base}${itemPath}/draft`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "5",
          displayName: "After review",
        }),
      });
      expect(mutatedAfterReview.status).toBe(200);
      const staleActivate = await fetch(`${base}${itemPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPromotionRevision: "5" }),
      });
      expect(staleActivate.status).toBe(409);
      expect(await json(staleActivate)).toMatchObject({ ok: false, code: "PROMOTION_STALE_REVISION" });
      const stillDraft = await persistence.withContext((ctx) => getPromotion(ctx, promotionId));
      expect(stillDraft?.status).toBe("draft");

      const activated = await fetch(`${base}${itemPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPromotionRevision: "6" }),
      });
      expect(activated.status).toBe(200);
      expect(await json(activated)).toMatchObject({ revision: "7" });

      const detail = await fetch(`${base}${itemPath}`, { headers: await headersFor(brandAdmin.id) });
      expect(detail.status).toBe(200);
      const detailBody = await json(detail);
      const detailPromotion = detailBody.promotion as { status: string; supportedLifecycleStates: string[] };
      expect(detailPromotion.status).toBe("active");
      expect(detailPromotion.supportedLifecycleStates).toEqual(["draft", "active", "retired"]);

      const otherPath = await fetch(
        `${base}/api/admin/v1/brands/${otherTree.brand.id}/promotions/${promotionId}`,
        { headers: await headersFor(otherBrandAdmin.id) },
      );
      expect(otherPath.status).toBe(404);
      expect(await json(otherPath)).toMatchObject({ ok: false, code: "PROMOTIONS_NOT_FOUND" });

      const couponPromo = await fetch(`${base}${promoPath}`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          code: uniqueCode("cpn"),
          displayName: "HTTP Coupon Promo",
          scopeType: "brand",
          triggerType: "coupon",
          startsAt: STARTS_AT,
        }),
      });
      const couponPromoBody = await json(couponPromo);
      const couponPromotionId = (couponPromoBody.promotion as { id: string }).id;
      const couponPromoPath = `${promoPath}/${couponPromotionId}`;
      await fetch(`${base}${couponPromoPath}/benefit`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "1",
          benefitType: "percentage_discount",
          percentageBps: 500,
        }),
      });
      await fetch(`${base}${couponPromoPath}/targets`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "2",
          targetRole: "qualifier",
          targets: [MERCHANDISE_TARGET],
        }),
      });
      await fetch(`${base}${couponPromoPath}/targets`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({
          expectedPromotionRevision: "3",
          targetRole: "benefit",
          targets: [MERCHANDISE_TARGET],
        }),
      });
      await fetch(`${base}${couponPromoPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedPromotionRevision: "4" }),
      });

      const couponCode = uniqueCode("save").toUpperCase().replace(/-/g, "").slice(0, 12);
      const couponCreated = await fetch(`${base}${couponPromoPath}/coupons`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ origin: "manual", canonicalCode: couponCode }),
      });
      expect(couponCreated.status).toBe(200);
      const couponCreatedBody = await json(couponCreated);
      const coupon = couponCreatedBody.coupon as { id: string; revision: string };
      expect(coupon.revision).toBe("1");
      const couponPath = `/api/admin/v1/brands/${brandId}/coupons/${coupon.id}`;

      const kitchenDenied = await fetch(`${base}${couponPath}/draft`, {
        method: "POST",
        headers: await headersFor(kitchen.id),
        body: JSON.stringify({ expectedCouponRevision: "1", maximumRedemptions: 9 }),
      });
      expect(kitchenDenied.status).toBe(403);
      expect(await json(kitchenDenied)).toMatchObject({ ok: false, code: "PROMOTIONS_UNAUTHORIZED" });

      const couponPreview = await fetch(`${base}${couponPath}/consequence-preview`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ proposedStatus: "active" }),
      });
      expect(couponPreview.status).toBe(200);
      const couponPreviewBody = await json(couponPreview);
      const couponPreviewPayload = couponPreviewBody.preview as {
        expectedCouponRevision: string;
        promotionId: string;
        canonicalCode: string;
        supportedLifecycleStates: string[];
      };
      expect(couponPreviewPayload.expectedCouponRevision).toBe("1");
      expect(couponPreviewPayload.promotionId).toBe(couponPromotionId);
      expect(couponPreviewPayload.canonicalCode).toBe(couponCode);
      expect(couponPreviewPayload.supportedLifecycleStates).toEqual([
        "draft",
        "active",
        "disabled",
        "retired",
      ]);

      const couponActivated = await fetch(`${base}${couponPath}/activate`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedCouponRevision: "1" }),
      });
      expect(couponActivated.status).toBe(200);
      expect(await json(couponActivated)).toMatchObject({ revision: "2" });

      const couponDisabled = await fetch(`${base}${couponPath}/disable`, {
        method: "POST",
        headers: await headersFor(brandAdmin.id),
        body: JSON.stringify({ expectedCouponRevision: "2" }),
      });
      expect(couponDisabled.status).toBe(200);
      expect(await json(couponDisabled)).toMatchObject({ revision: "3" });
    });
  }, 180_000);
});
