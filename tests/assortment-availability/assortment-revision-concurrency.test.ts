/**
 * IMP-036F F4 — real-DB Assortment expectedRuleRevision races.
 */
import { describe, expect, it } from "vitest";

import { assortmentRulesTable } from "../../src/platform/database/schema/assortment";
import {
  AssortmentConflictError,
  includeBrandVariant,
} from "../../src/server/assortment";
import { eq } from "drizzle-orm";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "./support";

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    expect(message.toLowerCase()).not.toMatch(/deadlock/);
  }
}

describe("IMP-036F F4 — Assortment revision concurrency", () => {
  it("two reviewed-absence includes: one success, one stale, single active rule", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "asrace",
      );

      const first = persistence.transaction((tx) =>
        includeBrandVariant(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          expectedRuleRevision: null,
        }),
      );
      const second = persistence.transaction((tx) =>
        includeBrandVariant(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          expectedRuleRevision: null,
        }),
      );

      const settled = await Promise.allSettled([first, second]);
      expect(settled).toHaveLength(2);
      for (const result of settled) assertNoDeadlock(result);

      const fulfilled = settled.filter((result) => result.status === "fulfilled");
      const rejected = settled.filter((result) => result.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toMatchObject({
        status: "rejected",
        reason: expect.any(AssortmentConflictError),
      });
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        assortmentErrorCode: "ASSORTMENT_STALE_REVISION",
      });

      const rows = await persistence.withContext((ctx) =>
        ctx.db
          .select()
          .from(assortmentRulesTable)
          .where(eq(assortmentRulesTable.variantId, catalog.variantId)),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("active");
      expect(rows[0]?.revision).toBe(BigInt(1));
    });
  });
});
