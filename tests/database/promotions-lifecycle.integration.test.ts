/**
 * Promotion / Coupon lifecycle, activation validation, audit, and privilege proofs (IMP-016).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import {
  promotionAuditEventsTable,
  promotionBenefitsTable,
  promotionCouponsTable,
  promotionTargetsTable,
} from "../../src/platform/database/schema/promotions";
import { createBrand } from "../../src/server/organization";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  createPromotionDraft,
  deleteCouponDraft,
  deletePromotionDraft,
  disableCoupon,
  enableCoupon,
  getPromotion,
  insertPromotionAuditEvent,
  retireCoupon,
  retirePromotion,
  setPromotionBenefit,
  setPromotionTargets,
  updateCouponDraft,
  updatePromotionDraft,
} from "../../src/server/promotions";
import { PromotionAdminError } from "../../src/server/promotions/errors";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";
import {
  createAndActivatePromotion,
  createCatalogProductVariant,
  createReadyDraftPromotion,
  seedPromotionsHarness,
  uniqueCode,
} from "./support/promotions-fixtures";
import { assertSafeIdentifier, quoteIdentifier } from "./support/identifiers";
import { randomBytes } from "node:crypto";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("promotion lifecycle and immutability", () => {
  it("draft mutate → activate (incl. future-effective) → seal → retire; denies illegal transitions", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      const draft = await createReadyDraftPromotion(harness, { code: uniqueCode("life") });

      await harness.persistence.transaction(async (tx) => {
        await updatePromotionDraft(tx, {
          actor,
          promotionId: draft.id,
          displayName: "Updated Draft",
          priority: 3,
        });
        await setPromotionBenefit(tx, {
          actor,
          promotionId: draft.id,
          benefit: {
            benefitType: "fixed_amount_discount",
            percentageBps: null,
            fixedAmountPaise: BigInt(500),
            maximumDiscountPaise: null,
            buyQuantity: null,
            getQuantity: null,
            repeatable: null,
            maximumRewardQuantity: null,
            includeModifiers: false,
            includeBundleDeltas: false,
          },
        });
      });

      // Future-effective still seals immediately
      const future = await createReadyDraftPromotion(harness, {
        code: uniqueCode("future"),
        startsAt: new Date("2099-01-01T00:00:00Z"),
      });
      await harness.persistence.transaction(async (tx) => {
        await activatePromotion(tx, { actor, promotionId: future.id });
      });
      const futureRow = await harness.persistence.withContext((ctx) => getPromotion(ctx, future.id));
      expect(futureRow?.status).toBe("active");
      expect(futureRow?.configurationFingerprint).toBeTruthy();
      expect(futureRow?.activatedAt).toBeTruthy();

      await harness.persistence.transaction(async (tx) => {
        await activatePromotion(tx, { actor, promotionId: draft.id });
      });
      const active = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(active?.status).toBe("active");
      expect(active?.configurationFingerprint).toMatch(/^[a-f0-9]{64}$/);

      await expect(
        harness.persistence.transaction(async (tx) => {
          await updatePromotionDraft(tx, {
            actor,
            promotionId: draft.id,
            displayName: "Nope",
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await setPromotionBenefit(tx, {
            actor,
            promotionId: draft.id,
            benefit: {
              benefitType: "percentage_discount",
              percentageBps: 500,
              fixedAmountPaise: null,
              maximumDiscountPaise: null,
              buyQuantity: null,
              getQuantity: null,
              repeatable: null,
              maximumRewardQuantity: null,
              includeModifiers: false,
              includeBundleDeltas: false,
            },
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await setPromotionTargets(tx, {
            actor,
            promotionId: draft.id,
            targetRole: "benefit",
            targets: [
              {
                targetRole: "benefit",
                targetType: "all_merchandise",
                productId: null,
                variantId: null,
                chargeDefinitionId: null,
              },
            ],
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await deletePromotionDraft(tx, { actor, promotionId: draft.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      // active → draft via SQL denied by CHECK (fingerprint/activated_at remain)
      await expect(
        harness.persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.promotions
            set status = 'draft'
            where id = ${draft.id}
          `);
        }),
      ).rejects.toThrow();

      await harness.persistence.transaction(async (tx) => {
        await retirePromotion(tx, { actor, promotionId: draft.id });
      });
      const retired = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(retired?.status).toBe("retired");

      await expect(
        harness.persistence.transaction(async (tx) => {
          await activatePromotion(tx, { actor, promotionId: draft.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_RETIRED" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await updatePromotionDraft(tx, {
            actor,
            promotionId: draft.id,
            displayName: "retired mutate",
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await deletePromotionDraft(tx, { actor, promotionId: draft.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_NOT_DRAFT" });

      // never-active draft delete allowed
      const disposable = await createReadyDraftPromotion(harness, { code: uniqueCode("del") });
      await harness.persistence.transaction(async (tx) => {
        await deletePromotionDraft(tx, { actor, promotionId: disposable.id });
      });
      const gone = await harness.persistence.withContext((ctx) => getPromotion(ctx, disposable.id));
      expect(gone).toBeNull();
    });
  }, 120_000);

  it("activation validation rejects incomplete / invalid configurations", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      const bare = await harness.persistence.transaction(async (tx) =>
        createPromotionDraft(tx, {
          actor,
          brandId: harness.tree.brand.id,
          code: uniqueCode("bare"),
          displayName: "Bare",
          scopeType: "brand",
          triggerType: "automatic",
          startsAt: new Date("2026-01-01T00:00:00Z"),
        }),
      );

      await expect(
        harness.persistence.transaction(async (tx) => {
          await activatePromotion(tx, { actor, promotionId: bare.id });
        }),
      ).rejects.toBeInstanceOf(PromotionAdminError);

      await harness.persistence.transaction(async (tx) => {
        await setPromotionBenefit(tx, {
          actor,
          promotionId: bare.id,
          benefit: {
            benefitType: "percentage_discount",
            percentageBps: 1000,
            fixedAmountPaise: null,
            maximumDiscountPaise: null,
            buyQuantity: null,
            getQuantity: null,
            repeatable: null,
            maximumRewardQuantity: null,
            includeModifiers: false,
            includeBundleDeltas: false,
          },
        });
        await setPromotionTargets(tx, {
          actor,
          promotionId: bare.id,
          targetRole: "qualifier",
          targets: [
            {
              targetRole: "qualifier",
              targetType: "all_merchandise",
              productId: null,
              variantId: null,
              chargeDefinitionId: null,
            },
          ],
        });
      });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await activatePromotion(tx, { actor, promotionId: bare.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_BENEFIT_TARGET_REQUIRED" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await createPromotionDraft(tx, {
            actor,
            brandId: harness.tree.brand.id,
            code: uniqueCode("badwin"),
            displayName: "Bad window",
            scopeType: "brand",
            triggerType: "automatic",
            startsAt: new Date("2026-06-01T00:00:00Z"),
            endsAt: new Date("2026-01-01T00:00:00Z"),
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_TIME_WINDOW_INVALID" });

      await expect(
        harness.persistence.transaction(async (tx) => {
          const d = await createPromotionDraft(tx, {
            actor,
            brandId: harness.tree.brand.id,
            code: uniqueCode("badpct"),
            displayName: "Bad pct",
            scopeType: "brand",
            triggerType: "automatic",
            startsAt: new Date("2026-01-01T00:00:00Z"),
          });
          await setPromotionBenefit(tx, {
            actor,
            promotionId: d.id,
            benefit: {
              benefitType: "percentage_discount",
              percentageBps: 10001,
              fixedAmountPaise: null,
              maximumDiscountPaise: null,
              buyQuantity: null,
              getQuantity: null,
              repeatable: null,
              maximumRewardQuantity: null,
              includeModifiers: false,
              includeBundleDeltas: false,
            },
          });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_BENEFIT_INVALID" });

      // all_merchandise + explicit product
      await expect(
        harness.persistence.transaction(async (tx) => {
          const d = await createPromotionDraft(tx, {
            actor,
            brandId: harness.tree.brand.id,
            code: uniqueCode("ambig"),
            displayName: "Ambig",
            scopeType: "brand",
            triggerType: "automatic",
            startsAt: new Date("2026-01-01T00:00:00Z"),
          });
          await setPromotionTargets(tx, {
            actor,
            promotionId: d.id,
            targetRole: "benefit",
            targets: [
              {
                targetRole: "benefit",
                targetType: "all_merchandise",
                productId: null,
                variantId: null,
                chargeDefinitionId: null,
              },
              {
                targetRole: "benefit",
                targetType: "product",
                productId: "00000000-0000-4000-8000-000000000099",
                variantId: null,
                chargeDefinitionId: null,
              },
            ],
          });
        }),
      ).rejects.toThrow();

      // cross-brand product/variant
      const otherBrand = await harness.persistence.transaction(async (tx) =>
        createBrand(tx, { code: uniqueCode("ob"), name: "Other Brand" }),
      );
      // brand_admin can't manage other brand catalog — use raw insert via admin SQL for foreign brand product
      const foreignProductId = "b0160000-0000-4000-8000-000000000001";
      const foreignVariantId = "b0160000-0000-4000-8000-000000000002";
      await withTestDatabaseClient(database.connectionString, async (admin) => {
        await admin.pool.query(
          `insert into app.catalog_products (
             id, brand_id, code, name, description, product_kind, lifecycle_status, created_at, updated_at
           ) values ($1, $2, 'foreign-p', 'Foreign', null, 'standard', 'draft', now(), now())`,
          [foreignProductId, otherBrand.id],
        );
        await admin.pool.query(
          `insert into app.catalog_variants (
             id, brand_id, product_id, product_kind, code, name, description, is_default, is_selector_visible,
             lifecycle_status, created_at, updated_at
           ) values ($1, $2, $3, 'standard', 'default', 'Default', null, true, false, 'draft', now(), now())`,
          [foreignVariantId, otherBrand.id, foreignProductId],
        );
      });

      const cross = await createReadyDraftPromotion(harness, { code: uniqueCode("cross") });
      await expect(
        harness.persistence.transaction(async (tx) => {
          await setPromotionTargets(tx, {
            actor,
            promotionId: cross.id,
            targetRole: "benefit",
            targets: [
              {
                targetRole: "benefit",
                targetType: "product",
                productId: foreignProductId,
                variantId: null,
                chargeDefinitionId: null,
              },
            ],
          });
          await activatePromotion(tx, { actor, promotionId: cross.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_TARGET_BRAND_MISMATCH" });

      const crossV = await createReadyDraftPromotion(harness, { code: uniqueCode("crossv") });
      await expect(
        harness.persistence.transaction(async (tx) => {
          await setPromotionTargets(tx, {
            actor,
            promotionId: crossV.id,
            targetRole: "benefit",
            targets: [
              {
                targetRole: "benefit",
                targetType: "variant",
                productId: null,
                variantId: foreignVariantId,
                chargeDefinitionId: null,
              },
            ],
          });
          await activatePromotion(tx, { actor, promotionId: crossV.id });
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_TARGET_BRAND_MISMATCH" });
    });
  }, 120_000);
});

describe("coupon lifecycle and immutability", () => {
  it("covers draft→active→disable/enable/retire, reuse rules, and audit hygiene", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      const draftPromo = await createReadyDraftPromotion(harness, {
        code: uniqueCode("cp"),
        triggerType: "coupon",
      });
      const couponOnDraft = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "DRAFTONLY1",
        }),
      );
      await expect(
        harness.persistence.transaction(async (tx) => {
          await activateCoupon(tx, { actor, couponId: couponOnDraft.id });
        }),
      ).rejects.toMatchObject({ code: "COUPON_PROMOTION_NOT_ACTIVE" });

      await harness.persistence.transaction(async (tx) => {
        await activatePromotion(tx, { actor, promotionId: draftPromo.id });
      });

      const created = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "SAVE16A",
          maximumRedemptions: 10,
        }),
      );

      await harness.persistence.transaction(async (tx) => {
        await updateCouponDraft(tx, {
          actor,
          couponId: created.id,
          maximumRedemptions: 20,
        });
      });

      await harness.persistence.transaction(async (tx) => {
        await activateCoupon(tx, { actor, couponId: created.id });
      });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await updateCouponDraft(tx, {
            actor,
            couponId: created.id,
            maximumRedemptions: 99,
          });
        }),
      ).rejects.toMatchObject({ code: "COUPON_NOT_DRAFT" });

      await harness.persistence.transaction(async (tx) => {
        await disableCoupon(tx, { actor, couponId: created.id });
        await enableCoupon(tx, { actor, couponId: created.id });
        await disableCoupon(tx, { actor, couponId: created.id });
        await retireCoupon(tx, { actor, couponId: created.id });
      });

      await expect(
        harness.persistence.transaction(async (tx) => {
          await enableCoupon(tx, { actor, couponId: created.id });
        }),
      ).rejects.toThrow();

      await expect(
        harness.persistence.transaction(async (tx) => {
          await deleteCouponDraft(tx, { actor, couponId: created.id });
        }),
      ).rejects.toMatchObject({ code: "COUPON_IMMUTABLE" });

      // ever-active code cannot be reused
      await expect(
        harness.persistence.transaction(async (tx) =>
          createCouponDraft(tx, {
            actor,
            promotionId: draftPromo.id,
            origin: "manual",
            canonicalCode: "SAVE16A",
          }),
        ),
      ).rejects.toMatchObject({ code: "COUPON_CODE_CONFLICT" });

      // never-active draft delete + code reuse
      const reusable = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "REUSEME1",
        }),
      );
      await harness.persistence.transaction(async (tx) => {
        await deleteCouponDraft(tx, { actor, couponId: reusable.id });
      });
      const reused = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "REUSEME1",
        }),
      );
      expect(reused.canonicalCode).toBe("REUSEME1");

      // audit does not store canonical code
      await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select().from(promotionAuditEventsTable);
        for (const row of rows) {
          const meta = row.metadata as Record<string, unknown>;
          expect(meta).not.toHaveProperty("canonicalCode");
          expect(JSON.stringify(meta)).not.toMatch(/SAVE16A|REUSEME1/i);
        }
      });

      // active → retired path also works from active
      const c2 = await harness.persistence.transaction(async (tx) =>
        createCouponDraft(tx, {
          actor,
          promotionId: draftPromo.id,
          origin: "manual",
          canonicalCode: "SAVE16B",
        }),
      );
      await harness.persistence.transaction(async (tx) => {
        await activateCoupon(tx, { actor, couponId: c2.id });
        await retireCoupon(tx, { actor, couponId: c2.id });
      });
    });
  }, 120_000);
});

describe("promotion audit atomicity and privileges", () => {
  it("records lifecycle audits and rolls back mutation when audit insert fails", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      const actor = harness.brandAdminPrincipal;

      const draft = await createReadyDraftPromotion(harness, { code: uniqueCode("aud") });
      await harness.persistence.transaction(async (tx) => {
        await activatePromotion(tx, { actor, promotionId: draft.id });
        await retirePromotion(tx, { actor, promotionId: draft.id });
      });

      await harness.persistence.withContext(async (ctx) => {
        const actions = (
          await ctx.db.select({ action: promotionAuditEventsTable.action }).from(promotionAuditEventsTable)
        ).map((r) => r.action);
        expect(actions).toEqual(
          expect.arrayContaining([
            "promotion.created",
            "promotion.activated",
            "promotion.retired",
          ]),
        );
      });

      // Atomicity: illegal audit metadata aborts the surrounding transaction including a prior update
      const before = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      await expect(
        harness.persistence.transaction(async (tx) => {
          await tx.db.execute(sql`
            update app.promotions
            set display_name = 'SHOULD_ROLLBACK', updated_at = now()
            where id = ${draft.id}
          `);
          await insertPromotionAuditEvent(tx, {
            actorWorkforceUserId: harness.brandAdmin.id,
            permissionKey: "promotions.manage",
            action: "promotion.updated",
            resourceType: "promotion",
            resourceId: draft.id,
            brandId: harness.tree.brand.id,
            metadata: { canonicalCode: "LEAK" },
          });
        }),
      ).rejects.toThrow();
      const after = await harness.persistence.withContext((ctx) => getPromotion(ctx, draft.id));
      expect(after?.displayName).toBe(before?.displayName);
      expect(after?.displayName).not.toBe("SHOULD_ROLLBACK");
    });
  }, 120_000);

  it("denies audit UPDATE and DELETE for application-shaped role", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const harness = await seedPromotionsHarness(database.connectionString, openHandles);
      await createAndActivatePromotion(harness, { code: uniqueCode("priv") });

      const auditId = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select().from(promotionAuditEventsTable).limit(1);
        return rows[0]!.id;
      });

      const suffix = randomBytes(6).toString("hex");
      const role = `boba_test_promo_app_${suffix}`;
      assertSafeIdentifier(role);
      const password = randomBytes(24).toString("hex");

      await withTestDatabaseClient(database.connectionString, async (admin) => {
        await admin.pool.query(
          `CREATE ROLE ${quoteIdentifier(role)} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
        );
        await admin.pool.query(
          `GRANT CONNECT ON DATABASE ${quoteIdentifier(database.databaseName)} TO ${quoteIdentifier(role)}`,
        );
        await admin.pool.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(role)}`);
        await admin.pool.query(
          `GRANT SELECT, INSERT ON app.promotion_audit_events TO ${quoteIdentifier(role)}`,
        );
        // Explicitly no UPDATE/DELETE — mirrors migration REVOKE
      });

      const url = new URL(database.connectionString);
      url.username = encodeURIComponent(role);
      url.password = encodeURIComponent(password);
      await withTestDatabaseClient(url.toString(), async (client) => {
        await expect(
          client.pool.query(`update app.promotion_audit_events set action = 'x' where id = $1`, [
            auditId,
          ]),
        ).rejects.toThrow();
        await expect(
          client.pool.query(`delete from app.promotion_audit_events where id = $1`, [auditId]),
        ).rejects.toThrow();
      });
    });
  }, 120_000);
});

// silence unused import warnings for tables referenced only in types of drizzle updates
void promotionBenefitsTable;
void promotionCouponsTable;
void promotionTargetsTable;
void createCatalogProductVariant;
