/**
 * IMP-036F F4 — PriceBook aggregate revision races and customer-truth chain.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { priceBooksTable } from "../../src/platform/database/schema/pricing";
import { checkoutSnapshotLinesTable } from "../../src/platform/database/schema/checkout";
import {
  PricingConflictError,
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
  previewPriceBookConsequence,
  resolveBrandVariantPrice,
  retirePriceBook,
} from "../../src/server/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  evaluateCheckout,
  setCheckoutDestination,
  startCheckout,
} from "../../src/server/checkout";
import {
  FIXED_NOW,
  checkoutOpts,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "../assortment-availability/support";

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    expect(message.toLowerCase()).not.toMatch(/deadlock/);
  }
}

const AT = new Date("2026-09-11T12:00:00.000Z");

describe("IMP-036F F4 — PriceBook revision concurrency", () => {
  it("two draft child writes with the same expected revision: one success, one stale", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "prrace",
      );
      const book = await persistence.transaction((tx) =>
        createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Race book",
          effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
        }),
      );

      const sibling = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "prrac2",
      );

      const first = persistence.transaction((tx) =>
        attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(17_900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        }),
      );
      const second = persistence.transaction((tx) =>
        attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: sibling.variantId,
          amountPaise: BigInt(18_900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        }),
      );

      const settled = await Promise.allSettled([first, second]);
      for (const result of settled) assertNoDeadlock(result);
      const fulfilled = settled.filter((result) => result.status === "fulfilled");
      const rejected = settled.filter((result) => result.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        pricingErrorCode: "PRICE_BOOK_STALE_REVISION",
      });
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PricingConflictError);

      const row = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(priceBooksTable)
          .where(eq(priceBooksTable.id, book.id));
        return rows[0];
      });
      expect(row?.revision).toBe(BigInt(2));
    });
  });

  it("preview revision N, competing attach, activate with N rejected, customer price unchanged", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "prvact",
      );
      const active = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Live A",
          effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
        return book;
      });

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Candidate B",
          effectiveFrom: new Date("2027-01-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(22_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
        }),
      );
      const reviewed = preview.expectedPriceBookRevision;

      await persistence.transaction((tx) =>
        attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(23_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: reviewed,
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: draft.id,
            expectedPriceBookRevision: reviewed,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "PRICE_BOOK_STALE_REVISION" });

      const live = await persistence.withContext((ctx) =>
        resolveBrandVariantPrice(ctx, {
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          at: AT,
        }),
      );
      expect(live.amountPaise).toBe(BigInt(10_000));
      expect(active.id).toBeTruthy();

      const draftRow = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(priceBooksTable)
          .where(eq(priceBooksTable.id, draft.id));
        return rows[0];
      });
      expect(draftRow?.lifecycleStatus).toBe("draft");
    });
  });
});

describe("IMP-036F F4 — historical checkout snapshot remains immutable", () => {
  it("later PriceBook activation does not rewrite a captured checkout snapshot", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, catalog, cartId, addressId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(persistence, actors.customerA, { cartId }, opts);
      const withDest = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: withDest.id,
          expectedCheckoutRevision: withDest.revision,
        },
        opts,
      );
      const snapshotId = ready.snapshot.id;
      const capturedLine = ready.snapshot.lines[0]!;
      expect(capturedLine.lineBasePaise).toBe(BigInt(10_000));

      const activeBook = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(priceBooksTable)
          .where(eq(priceBooksTable.brandId, actors.tree.brand.id));
        return rows.find((row) => row.lifecycleStatus === "active")!;
      });

      await persistence.transaction((tx) =>
        retirePriceBook(tx, {
          actor: actors.brandAdminActor,
          brandId: actors.tree.brand.id,
          priceBookId: activeBook.id,
        }),
      );

      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: actors.brandAdminActor,
          brandId: actors.tree.brand.id,
          scopeType: "brand",
          code: `pb-${randomUUID().slice(0, 8)}`,
          name: "Replacement B",
          effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: actors.brandAdminActor,
          brandId: actors.tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(22_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        await activatePriceBook(tx, {
          actor: actors.brandAdminActor,
          brandId: actors.tree.brand.id,
          priceBookId: book.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
      });

      const live = await persistence.withContext((ctx) =>
        resolveBrandVariantPrice(ctx, {
          brandId: actors.tree.brand.id,
          variantId: catalog.variantId,
          at: FIXED_NOW,
        }),
      );
      expect(live.amountPaise).toBe(BigInt(22_000));

      const historical = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(checkoutSnapshotLinesTable)
          .where(eq(checkoutSnapshotLinesTable.snapshotId, snapshotId));
        return rows[0];
      });
      expect(historical?.lineBasePaise).toBe(BigInt(10_000));
      expect(historical?.lineTotalPaise).toBe(capturedLine.lineTotalPaise);
    });
  });
});
