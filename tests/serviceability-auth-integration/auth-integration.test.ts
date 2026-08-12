/**
 * Serviceability ↔ workforce auth integration (IMP-019).
 */
import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  addOutletServiceabilityPins,
  evaluateServiceability,
  setOutletServiceabilityRoutingPriority,
} from "../../src/server/serviceability";
import { requireServiceabilityWorkforceActor } from "../../src/server/serviceability/authorize";
import {
  closeTrackedPersistenceHandles,
  withServiceabilityHarness,
} from "../database/support/serviceability-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-019 serviceability auth integration", () => {
  it("real workforce principal can perform an allowed admin op", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const config = await setOutletServiceabilityRoutingPriority(
        persistence,
        actors.brandAdminActor,
        {
          outletId: actors.tree.outletA.id,
          routingPriority: 4,
          expectedRevision: null,
        },
      );
      expect(config.routingPriority).toBe(4);
      expect(config.revision).toBe(BigInt(1));
      expect(actors.brandAdminActor.workforceUserId).toBe(actors.brandAdmin.id);
    });
  });

  it("unauthenticated actor is rejected before mutation", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      expect(() => requireServiceabilityWorkforceActor(undefined)).toThrow(
        expect.objectContaining({ code: "SERVICEABILITY_UNAUTHENTICATED" }),
      );
      expect(() => requireServiceabilityWorkforceActor(null)).toThrow(
        expect.objectContaining({ code: "SERVICEABILITY_UNAUTHENTICATED" }),
      );

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, null, {
          outletId: actors.tree.outletA.id,
          routingPriority: 1,
          expectedRevision: null,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_UNAUTHENTICATED" });

      const count = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c from app.outlet_serviceability_configs
          where outlet_id = ${actors.tree.outletA.id}::uuid
        `);
        return rows.rows[0]?.c as number;
      });
      expect(count).toBe(0);

      const audits = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c from app.outlet_serviceability_audit_events
          where outlet_id = ${actors.tree.outletA.id}::uuid
        `);
        return rows.rows[0]?.c as number;
      });
      expect(audits).toBe(0);
    });
  });

  it("evaluateServiceability works without a workforce session", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await setOutletServiceabilityRoutingPriority(persistence, actors.psaActor, {
        outletId: actors.tree.outletA.id,
        routingPriority: 1,
        expectedRevision: null,
      });
      await addOutletServiceabilityPins(persistence, actors.psaActor, {
        outletId: actors.tree.outletA.id,
        postalCodes: ["248001"],
        expectedRevision: BigInt(1),
      });

      const decision = await evaluateServiceability(persistence, {
        brandId: actors.tree.brand.id,
        location: { postalCode: "248001" },
      });
      expect(decision.status).toBe("SERVICEABLE");
      if (decision.status === "SERVICEABLE") {
        expect(decision.selectedOutletId).toBe(actors.tree.outletA.id);
      }
    });
  });
});
