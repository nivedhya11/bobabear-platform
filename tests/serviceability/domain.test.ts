/**
 * Serviceability domain behaviour tests (IMP-019) — real PostgreSQL.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  addOutletServiceabilityPins,
  evaluateServiceability,
  findServiceabilityCandidates,
  fixedServiceabilityClock,
  getOutletServiceabilityConfiguration,
  removeOutletServiceabilityPins,
  replaceOutletServiceabilityPins,
  setOutletServiceabilityRoutingPriority,
  ServiceabilityError,
} from "../../src/server/serviceability";
import {
  closeTrackedPersistenceHandles,
  pauseOutletIndefinitely,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  TEST_OUTSIDE_COORDS,
  withServiceabilityHarness,
} from "../database/support/serviceability-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const PIN_A = "248001";
const PIN_B = "110001";
const PIN_UNCOVERED = "560001";
const FIXED_NOW = new Date("2026-08-08T12:00:00.000Z");

describe("IMP-036B outlet-distance serviceability evaluation", () => {
  it("returns SERVICEABLE inside configured radius and NOT_SERVICEABLE outside", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id);
      const clock = fixedServiceabilityClock(FIXED_NOW);

      const inside = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_INSIDE_COORDS },
        },
        { clock },
      );
      expect(inside).toEqual({
        status: "SERVICEABLE",
        evaluatedAt: FIXED_NOW,
        selectedOutletId: tree.outletA.id,
      });

      const outside = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_OUTSIDE_COORDS },
        },
        { clock },
      );
      expect(outside).toEqual({
        status: "NOT_SERVICEABLE",
        evaluatedAt: FIXED_NOW,
      });
    });
  });

  it("ignores postalCode for geographic authority", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id);
      const clock = fixedServiceabilityClock(FIXED_NOW);

      const withoutPin = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock },
      );
      const withPin = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_INSIDE_COORDS, postalCode: PIN_UNCOVERED },
        },
        { clock },
      );
      expect(withoutPin).toEqual(withPin);

      const outsideWithPin = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_OUTSIDE_COORDS, postalCode: PIN_A },
        },
        { clock },
      );
      expect(outsideWithPin.status).toBe("NOT_SERVICEABLE");
    });
  });

  it("returns INDETERMINATE when coordinates are missing", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const decision = await evaluateServiceability(persistence, {
        brandId: actors.tree.brand.id,
        location: { postalCode: PIN_A },
      });
      expect(decision).toMatchObject({
        status: "INDETERMINATE",
        reason: "LOCATION_COORDINATES_REQUIRED",
      });
    });
  });

  it("does not treat legacy PIN configuration as a geographic candidate", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId: tree.outletA.id,
        routingPriority: 1,
        expectedRevision: null,
      });
      await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId: tree.outletA.id,
        postalCodes: [PIN_A],
        expectedRevision: BigInt(1),
      });

      const decision = await evaluateServiceability(persistence, {
        brandId: tree.brand.id,
        location: { coordinates: TEST_INSIDE_COORDS, postalCode: PIN_A },
      });
      expect(decision).toMatchObject({
        status: "INDETERMINATE",
        reason: "CONFIGURATION_INCONSISTENT",
      });
    });
  });

  it("four statuses; selectedOutletId only on SERVICEABLE; evaluatedAt always present", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor, psaActor } = actors;
      const clock = fixedServiceabilityClock(FIXED_NOW);

      const noConfig = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock },
      );
      expect(noConfig).toMatchObject({
        status: "INDETERMINATE",
        reason: "CONFIGURATION_INCONSISTENT",
      });

      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id);

      const svc = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock },
      );
      expect(svc.status).toBe("SERVICEABLE");
      if (svc.status === "SERVICEABLE") {
        expect(svc.selectedOutletId).toBe(tree.outletA.id);
      }

      await pauseOutletIndefinitely(persistence, psaActor, tree.outletA.id);
      const temp = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock },
      );
      expect(temp).toEqual({
        status: "TEMPORARILY_UNAVAILABLE",
        evaluatedAt: FIXED_NOW,
      });
    });
  });

  it("orders candidates by routing_priority ASC then outlet_id ASC", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      const [firstId, secondId] =
        tree.outletA.id < tree.outletB.id
          ? [tree.outletA.id, tree.outletB.id]
          : [tree.outletB.id, tree.outletA.id];

      await seedOutletDistanceServiceability(persistence, brandAdminActor, firstId, {
        routingPriority: 5,
      });
      await seedOutletDistanceServiceability(persistence, brandAdminActor, secondId, {
        routingPriority: 5,
        routingExpectedRevision: BigInt(2),
      });

      const candidates = await persistence.withContext((ctx) =>
        findServiceabilityCandidates(ctx, { brandId: tree.brand.id }),
      );
      expect(candidates.map((c) => c.outletId)).toEqual([firstId, secondId]);

      const decision = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock: fixedServiceabilityClock(FIXED_NOW) },
      );
      expect(decision).toMatchObject({
        status: "SERVICEABLE",
        selectedOutletId: firstId,
      });

      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId: secondId,
        routingPriority: 1,
        expectedRevision: BigInt(4),
      });
      const preferLower = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock: fixedServiceabilityClock(FIXED_NOW) },
      );
      expect(preferLower).toMatchObject({
        status: "SERVICEABLE",
        selectedOutletId: secondId,
      });
    });
  });

  it("fails over when preferred outlet is unavailable", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor, psaActor } = actors;
      const clock = fixedServiceabilityClock(FIXED_NOW);

      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id, {
        routingPriority: 1,
      });
      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletB.id, {
        routingPriority: 2,
        routingExpectedRevision: BigInt(2),
      });

      await pauseOutletIndefinitely(persistence, psaActor, tree.outletA.id);

      const failover = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock },
      );
      expect(failover).toEqual({
        status: "SERVICEABLE",
        evaluatedAt: FIXED_NOW,
        selectedOutletId: tree.outletB.id,
      });
    });
  });

  it("validation errors for bad coordinates are thrown, not returned as statuses", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      await expect(
        evaluateServiceability(persistence, {
          brandId: actors.tree.brand.id,
          location: {
            coordinates: { latitude: "91.0", longitude: "78.0" },
          },
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_COORDINATES_INVALID" });

      await expect(
        evaluateServiceability(persistence, {
          brandId: "not-a-uuid",
          location: { coordinates: TEST_INSIDE_COORDS },
        }),
      ).rejects.toBeInstanceOf(ServiceabilityError);
    });
  });
});

describe("IMP-019 serviceability evaluation (legacy admin PIN tables remain non-authoritative)", () => {
  it("lower-priority failure after a winning outlet does not invalidate the winner", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor, psaActor } = actors;
      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletA.id, {
        routingPriority: 1,
      });
      await seedOutletDistanceServiceability(persistence, brandAdminActor, tree.outletB.id, {
        routingPriority: 99,
        routingExpectedRevision: BigInt(2),
      });
      await pauseOutletIndefinitely(persistence, psaActor, tree.outletB.id);

      const decision = await evaluateServiceability(
        persistence,
        { brandId: tree.brand.id, location: { coordinates: TEST_INSIDE_COORDS } },
        { clock: fixedServiceabilityClock(FIXED_NOW) },
      );
      expect(decision).toEqual({
        status: "SERVICEABLE",
        evaluatedAt: FIXED_NOW,
        selectedOutletId: tree.outletA.id,
      });
    });
  });
});

describe("IMP-019 serviceability administration", () => {
  it("creates priority, add/remove/replace pins, empty no-config no-ops, revision rules", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      const outletId = tree.outletA.id;

      const absent = await getOutletServiceabilityConfiguration(
        persistence,
        brandAdminActor,
        { outletId },
      );
      expect(absent).toEqual({
        outletId,
        routingPriority: null,
        postalCodes: [],
        revision: null,
        serviceOriginLatitude: null,
        serviceOriginLongitude: null,
        maxServiceDistanceMeters: null,
      });

      // Empty add/remove/replace with no config are no-ops.
      expect(
        await addOutletServiceabilityPins(persistence, brandAdminActor, {
          outletId,
          postalCodes: [],
          expectedRevision: null,
        }),
      ).toMatchObject({ revision: null, routingPriority: null });
      expect(
        await removeOutletServiceabilityPins(persistence, brandAdminActor, {
          outletId,
          postalCodes: [PIN_A],
          expectedRevision: null,
        }),
      ).toMatchObject({ revision: null });
      expect(
        await replaceOutletServiceabilityPins(persistence, brandAdminActor, {
          outletId,
          postalCodes: [],
          expectedRevision: null,
        }),
      ).toMatchObject({ revision: null });

      await expect(
        addOutletServiceabilityPins(persistence, brandAdminActor, {
          outletId,
          postalCodes: [PIN_A],
          expectedRevision: null,
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED" });

      const created = await setOutletServiceabilityRoutingPriority(
        persistence,
        brandAdminActor,
        { outletId, routingPriority: 7, expectedRevision: null },
      );
      expect(created.revision).toBe(BigInt(1));
      expect(created.routingPriority).toBe(7);
      expect(typeof created.revision).toBe("bigint");

      // No-op priority: revision stable.
      const noopPriority = await setOutletServiceabilityRoutingPriority(
        persistence,
        brandAdminActor,
        { outletId, routingPriority: 7, expectedRevision: BigInt(1) },
      );
      expect(noopPriority.revision).toBe(BigInt(1));

      const withPins = await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_A, PIN_B, PIN_A],
        expectedRevision: BigInt(1),
      });
      expect(withPins.postalCodes).toEqual([PIN_B, PIN_A].sort());
      expect(withPins.revision).toBe(BigInt(2));

      // Duplicate add is no-op.
      const dupAdd = await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_A],
        expectedRevision: BigInt(2),
      });
      expect(dupAdd.revision).toBe(BigInt(2));

      const removed = await removeOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_B],
        expectedRevision: BigInt(2),
      });
      expect(removed.postalCodes).toEqual([PIN_A]);
      expect(removed.revision).toBe(BigInt(3));

      const replaced = await replaceOutletServiceabilityPins(
        persistence,
        brandAdminActor,
        { outletId, postalCodes: [PIN_B], expectedRevision: BigInt(3) },
      );
      expect(replaced.postalCodes).toEqual([PIN_B]);
      expect(replaced.revision).toBe(BigInt(4));

      // Identical replace is no-op.
      const noopReplace = await replaceOutletServiceabilityPins(
        persistence,
        brandAdminActor,
        { outletId, postalCodes: [PIN_B], expectedRevision: BigInt(4) },
      );
      expect(noopReplace.revision).toBe(BigInt(4));

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
          outletId,
          routingPriority: 3,
          expectedRevision: BigInt(1),
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_CONFIGURATION_CONFLICT" });
    });
  });

  it("writes four audit actions with deltas; no audit on no-op or conflict", async () => {
    await withServiceabilityHarness(async ({ persistence, actors }) => {
      const { tree, brandAdminActor } = actors;
      const outletId = tree.outletA.id;

      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId,
        routingPriority: 3,
        expectedRevision: null,
      });
      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId,
        routingPriority: 3,
        expectedRevision: BigInt(1),
      });
      await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_A, PIN_B],
        expectedRevision: BigInt(1),
      });
      await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_A],
        expectedRevision: BigInt(2),
      });
      await removeOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_B],
        expectedRevision: BigInt(2),
      });
      await replaceOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: [PIN_A, PIN_UNCOVERED],
        expectedRevision: BigInt(3),
      });

      await expect(
        setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
          outletId,
          routingPriority: 9,
          expectedRevision: BigInt(1),
        }),
      ).rejects.toMatchObject({ code: "SERVICEABILITY_CONFIGURATION_CONFLICT" });

      const audits = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select action, previous_revision::text as prev, new_revision::text as next,
                 previous_routing_priority, new_routing_priority,
                 added_postal_codes, removed_postal_codes
          from app.outlet_serviceability_audit_events
          where outlet_id = ${outletId}::uuid
          order by new_revision
        `);
        return rows.rows;
      });

      expect(audits).toHaveLength(4);
      expect(audits[0]).toMatchObject({
        action: "serviceability_routing_priority_set",
        prev: null,
        next: "1",
        previous_routing_priority: null,
        new_routing_priority: 3,
      });
      expect(audits[1]).toMatchObject({
        action: "serviceability_pins_added",
        prev: "1",
        next: "2",
      });
      expect([...((audits[1]!.added_postal_codes as string[]) ?? [])].sort()).toEqual(
        [PIN_A, PIN_B].sort(),
      );
      expect(audits[2]).toMatchObject({
        action: "serviceability_pins_removed",
        prev: "2",
        next: "3",
      });
      expect(audits[2]!.removed_postal_codes).toEqual([PIN_B]);
      expect(audits[3]).toMatchObject({
        action: "serviceability_pins_replaced",
        prev: "3",
        next: "4",
      });
      expect([...((audits[3]!.added_postal_codes as string[]) ?? [])].sort()).toEqual([
        PIN_UNCOVERED,
      ]);
      expect([...((audits[3]!.removed_postal_codes as string[]) ?? [])].sort()).toEqual(
        [],
      );
    });
  });
});
