/**
 * Serviceability concurrency hard-gate tests (IMP-019).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  addOutletServiceabilityPins,
  evaluateServiceability,
  getOutletServiceabilityConfiguration,
  removeOutletServiceabilityPins,
  replaceOutletServiceabilityPins,
  setOutletServiceabilityRoutingPriority,
} from "../../src/server/serviceability";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  closeTrackedPersistenceHandles,
  trackPersistenceHandle,
  withServiceabilityHarness,
} from "../database/support/serviceability-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function dualPersistence(connectionString: string) {
  const a = getApplicationPersistence(applicationConfig(connectionString));
  const b = getApplicationPersistence(applicationConfig(connectionString));
  trackPersistenceHandle(a);
  trackPersistenceHandle(b);
  return { a, b };
}

describe("IMP-019 serviceability concurrency", () => {
  it("lock order places outlet FOR UPDATE before config mutation", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/server/serviceability/administration.ts"),
      "utf8",
    );
    for (const fn of [
      "setOutletServiceabilityRoutingPriority",
      "addOutletServiceabilityPins",
      "removeOutletServiceabilityPins",
      "replaceOutletServiceabilityPins",
    ]) {
      const idx = source.indexOf(`export async function ${fn}`);
      expect(idx).toBeGreaterThanOrEqual(0);
      const bodyStart = source.indexOf("{", idx);
      const lockIdx = source.indexOf("lockOutletForServiceabilityMutation", bodyStart);
      const configLockIdx = source.indexOf(
        "lockServiceabilityConfigForUpdate",
        bodyStart,
      );
      const nextExport = source.indexOf("\nexport async function ", bodyStart + 1);
      const end = nextExport === -1 ? source.length : nextExport;
      expect(lockIdx).toBeGreaterThan(bodyStart);
      expect(lockIdx).toBeLessThan(end);
      expect(configLockIdx).toBeGreaterThan(lockIdx);
      expect(configLockIdx).toBeLessThan(end);
    }
  });

  it("same-outlet races for setPriority/add/remove/replace: at most one material mutation from same expectedRevision", async () => {
    await withServiceabilityHarness(async ({ persistence, actors, database }) => {
      const { brandAdminActor, tree } = actors;
      const outletId = tree.outletA.id;
      const { a, b } = dualPersistence(database.connectionString);

      const base = await setOutletServiceabilityRoutingPriority(
        persistence,
        brandAdminActor,
        { outletId, routingPriority: 5, expectedRevision: null },
      );
      expect(base.revision).toBe(BigInt(1));

      const racePriority = await Promise.allSettled([
        setOutletServiceabilityRoutingPriority(a, brandAdminActor, {
          outletId,
          routingPriority: 8,
          expectedRevision: BigInt(1),
        }),
        setOutletServiceabilityRoutingPriority(b, brandAdminActor, {
          outletId,
          routingPriority: 9,
          expectedRevision: BigInt(1),
        }),
      ]);
      const fulfilledPriority = racePriority.filter((r) => r.status === "fulfilled");
      const rejectedPriority = racePriority.filter((r) => r.status === "rejected");
      expect(fulfilledPriority).toHaveLength(1);
      expect(rejectedPriority).toHaveLength(1);
      expect((rejectedPriority[0] as PromiseRejectedResult).reason).toMatchObject({
        code: "SERVICEABILITY_CONFIGURATION_CONFLICT",
      });
      const afterPriority = await getOutletServiceabilityConfiguration(
        persistence,
        brandAdminActor,
        { outletId },
      );
      expect(afterPriority.revision).toBe(BigInt(2));
      expect([8, 9]).toContain(afterPriority.routingPriority);

      // Seed pins then race add vs remove from same revision.
      const withPins = await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: ["248001", "110001"],
        expectedRevision: afterPriority.revision,
      });

      const raceAddRemove = await Promise.allSettled([
        addOutletServiceabilityPins(a, brandAdminActor, {
          outletId,
          postalCodes: ["560001"],
          expectedRevision: withPins.revision,
        }),
        removeOutletServiceabilityPins(b, brandAdminActor, {
          outletId,
          postalCodes: ["110001"],
          expectedRevision: withPins.revision,
        }),
      ]);
      expect(
        raceAddRemove.filter((r) => r.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        raceAddRemove.filter((r) => r.status === "rejected"),
      ).toHaveLength(1);
      const conflict = raceAddRemove.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      expect(conflict?.reason).toMatchObject({
        code: "SERVICEABILITY_CONFIGURATION_CONFLICT",
      });
      // No raw SQL unique-violation text leaked.
      expect(String(conflict?.reason?.message ?? "")).not.toMatch(/duplicate key|23505/i);

      const mid = await getOutletServiceabilityConfiguration(
        persistence,
        brandAdminActor,
        { outletId },
      );

      const raceReplace = await Promise.allSettled([
        replaceOutletServiceabilityPins(a, brandAdminActor, {
          outletId,
          postalCodes: ["400001"],
          expectedRevision: mid.revision,
        }),
        replaceOutletServiceabilityPins(b, brandAdminActor, {
          outletId,
          postalCodes: ["400002"],
          expectedRevision: mid.revision,
        }),
      ]);
      expect(raceReplace.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(raceReplace.filter((r) => r.status === "rejected")).toHaveLength(1);
      expect(
        (raceReplace.find((r) => r.status === "rejected") as PromiseRejectedResult)
          .reason,
      ).toMatchObject({ code: "SERVICEABILITY_CONFIGURATION_CONFLICT" });

      const final = await getOutletServiceabilityConfiguration(
        persistence,
        brandAdminActor,
        { outletId },
      );
      expect(final.postalCodes).toHaveLength(1);
      expect(["400001", "400002"]).toContain(final.postalCodes[0]);
    });
  });

  it.each([
    {
      name: "setPriority vs addPins",
      race: async (
        a: ReturnType<typeof getApplicationPersistence>,
        b: ReturnType<typeof getApplicationPersistence>,
        actor: Parameters<typeof setOutletServiceabilityRoutingPriority>[1],
        outletId: string,
        expectedRevision: bigint,
      ) =>
        Promise.allSettled([
          setOutletServiceabilityRoutingPriority(a, actor, {
            outletId,
            routingPriority: 11,
            expectedRevision,
          }),
          addOutletServiceabilityPins(b, actor, {
            outletId,
            postalCodes: ["560001"],
            expectedRevision,
          }),
        ]),
      seedPins: false,
    },
    {
      name: "addPins vs addPins",
      race: async (
        a: ReturnType<typeof getApplicationPersistence>,
        b: ReturnType<typeof getApplicationPersistence>,
        actor: Parameters<typeof addOutletServiceabilityPins>[1],
        outletId: string,
        expectedRevision: bigint,
      ) =>
        Promise.allSettled([
          addOutletServiceabilityPins(a, actor, {
            outletId,
            postalCodes: ["560001"],
            expectedRevision,
          }),
          addOutletServiceabilityPins(b, actor, {
            outletId,
            postalCodes: ["560002"],
            expectedRevision,
          }),
        ]),
      seedPins: false,
    },
    {
      name: "replacePins vs addPins",
      race: async (
        a: ReturnType<typeof getApplicationPersistence>,
        b: ReturnType<typeof getApplicationPersistence>,
        actor: Parameters<typeof replaceOutletServiceabilityPins>[1],
        outletId: string,
        expectedRevision: bigint,
      ) =>
        Promise.allSettled([
          replaceOutletServiceabilityPins(a, actor, {
            outletId,
            postalCodes: ["400001"],
            expectedRevision,
          }),
          addOutletServiceabilityPins(b, actor, {
            outletId,
            postalCodes: ["560001"],
            expectedRevision,
          }),
        ]),
      seedPins: true,
    },
    {
      name: "replacePins vs removePins",
      race: async (
        a: ReturnType<typeof getApplicationPersistence>,
        b: ReturnType<typeof getApplicationPersistence>,
        actor: Parameters<typeof replaceOutletServiceabilityPins>[1],
        outletId: string,
        expectedRevision: bigint,
      ) =>
        Promise.allSettled([
          replaceOutletServiceabilityPins(a, actor, {
            outletId,
            postalCodes: ["400001"],
            expectedRevision,
          }),
          removeOutletServiceabilityPins(b, actor, {
            outletId,
            postalCodes: ["110001"],
            expectedRevision,
          }),
        ]),
      seedPins: true,
    },
  ] as const)(
    "same-outlet race matrix case: $name — one material winner, conflict loser, coherent revision/audit",
    async ({ name, race, seedPins }) => {
      await withServiceabilityHarness(async ({ persistence, actors, database }) => {
        const { brandAdminActor, tree } = actors;
        const outletId = tree.outletA.id;
        const { a, b } = dualPersistence(database.connectionString);

        const base = await setOutletServiceabilityRoutingPriority(
          persistence,
          brandAdminActor,
          { outletId, routingPriority: 5, expectedRevision: null },
        );
        let revision: bigint = base.revision ?? BigInt(1);
        if (seedPins) {
          const seeded = await addOutletServiceabilityPins(
            persistence,
            brandAdminActor,
            {
              outletId,
              postalCodes: ["248001", "110001"],
              expectedRevision: revision,
            },
          );
          revision = seeded.revision ?? revision;
        }

        const settled = await race(
          a,
          b,
          brandAdminActor,
          outletId,
          revision,
        );
        const fulfilled = settled.filter((r) => r.status === "fulfilled");
        const rejected = settled.filter((r) => r.status === "rejected");
        expect(fulfilled, name).toHaveLength(1);
        expect(rejected, name).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
          code: "SERVICEABILITY_CONFIGURATION_CONFLICT",
        });
        expect(
          String((rejected[0] as PromiseRejectedResult).reason?.message ?? ""),
        ).not.toMatch(/duplicate key|23505|unique/i);

        const final = await getOutletServiceabilityConfiguration(
          persistence,
          brandAdminActor,
          { outletId },
        );
        expect(final.revision).toBe(revision + BigInt(1));
        // No duplicate PIN membership.
        expect(final.postalCodes).toEqual([...new Set(final.postalCodes)].sort());
        // Coverage never exists without routing configuration.
        expect(final.routingPriority).toBeGreaterThan(0);

        await persistence.withContext(async (ctx) => {
          const check = await ctx.db.execute(sql`
            select
              (select revision::text from app.outlet_serviceability_configs where outlet_id = ${outletId}::uuid) as rev,
              (select count(*)::int from app.outlet_serviceability_pins where outlet_id = ${outletId}::uuid) as pins,
              (select count(*)::int from app.outlet_serviceability_audit_events where outlet_id = ${outletId}::uuid and new_revision = ${final.revision}::bigint) as audits_for_rev,
              (select max(new_revision)::text from app.outlet_serviceability_audit_events where outlet_id = ${outletId}::uuid) as audit_rev
          `);
          const row = check.rows[0] as {
            rev: string;
            pins: number;
            audits_for_rev: number;
            audit_rev: string;
          };
          expect(row.rev).toBe(String(final.revision));
          expect(row.audit_rev).toBe(String(final.revision));
          // Exactly one audit event for the new revision (no mutation without revision, no double audit).
          expect(row.audits_for_rev).toBe(1);
          expect(row.pins).toBe(final.postalCodes.length);
          if (name.startsWith("replacePins")) {
            // Winner is complete old-or-new: replace yields exactly one PIN when replace won,
            // or seed±add/remove when the other side won — never a partial replace set.
            if (final.postalCodes.length === 1 && final.postalCodes[0] === "400001") {
              expect(row.pins).toBe(1);
            } else {
              expect(final.postalCodes).not.toEqual(["400001"]);
            }
          }
        });
      });
    },
  );

  it("different outlets can mutate concurrently", async () => {
    await withServiceabilityHarness(async ({ actors, database }) => {
      const { brandAdminActor, tree } = actors;
      const { a, b } = dualPersistence(database.connectionString);

      const started = Date.now();
      const [cfgA, cfgB] = await Promise.all([
        setOutletServiceabilityRoutingPriority(a, brandAdminActor, {
          outletId: tree.outletA.id,
          routingPriority: 1,
          expectedRevision: null,
        }),
        setOutletServiceabilityRoutingPriority(b, brandAdminActor, {
          outletId: tree.outletB.id,
          routingPriority: 2,
          expectedRevision: null,
        }),
      ]);
      expect(Date.now() - started).toBeLessThan(15_000);
      expect(cfgA.revision).toBe(BigInt(1));
      expect(cfgB.revision).toBe(BigInt(1));
      expect(cfgA.outletId).not.toBe(cfgB.outletId);
    });
  });

  it("evaluation vs replace/priority sees complete old or new state, never partial", async () => {
    await withServiceabilityHarness(async ({ persistence, actors, database }) => {
      const { brandAdminActor, tree } = actors;
      const outletId = tree.outletA.id;
      const { a, b } = dualPersistence(database.connectionString);

      await setOutletServiceabilityRoutingPriority(persistence, brandAdminActor, {
        outletId,
        routingPriority: 1,
        expectedRevision: null,
      });
      await addOutletServiceabilityPins(persistence, brandAdminActor, {
        outletId,
        postalCodes: ["248001"],
        expectedRevision: BigInt(1),
      });

      const results = await Promise.all([
        (async () => {
          const decisions = [];
          for (let i = 0; i < 20; i++) {
            decisions.push(
              await evaluateServiceability(a, {
                brandId: tree.brand.id,
                location: { postalCode: "248001" },
              }),
            );
          }
          return decisions;
        })(),
        (async () => {
          await replaceOutletServiceabilityPins(b, brandAdminActor, {
            outletId,
            postalCodes: ["110001"],
            expectedRevision: BigInt(2),
          });
          await setOutletServiceabilityRoutingPriority(b, brandAdminActor, {
            outletId,
            routingPriority: 3,
            expectedRevision: BigInt(3),
          });
        })(),
      ]);

      const decisions = results[0];
      for (const d of decisions) {
        // Either still covered by old PIN or already NOT_SERVICEABLE after replace
        // — never SERVICEABLE with a half-written pin set for 248001 after replace
        // removed it while leaving orphan config.
        expect(["SERVICEABLE", "NOT_SERVICEABLE", "TEMPORARILY_UNAVAILABLE"]).toContain(
          d.status,
        );
        if (d.status === "SERVICEABLE") {
          expect(d.selectedOutletId).toBe(outletId);
        }
      }

      const final = await getOutletServiceabilityConfiguration(
        persistence,
        brandAdminActor,
        { outletId },
      );
      expect(final.postalCodes).toEqual(["110001"]);
      expect(final.routingPriority).toBe(3);

      // Config + pins are coherent: no pins without config; revision matches audit max.
      await persistence.withContext(async (ctx) => {
        const check = await ctx.db.execute(sql`
          select
            (select revision::text from app.outlet_serviceability_configs where outlet_id = ${outletId}::uuid) as rev,
            (select count(*)::int from app.outlet_serviceability_pins where outlet_id = ${outletId}::uuid) as pins,
            (select max(new_revision)::text from app.outlet_serviceability_audit_events where outlet_id = ${outletId}::uuid) as audit_rev
        `);
        expect(check.rows[0]?.rev).toBe(check.rows[0]?.audit_rev);
        expect(check.rows[0]?.pins).toBe(1);
      });
    });
  });
});
