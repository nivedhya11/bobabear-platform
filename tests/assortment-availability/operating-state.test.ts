/**
 * Outlet operating-state domain tests (IMP-014).
 */
import { describe, expect, it } from "vitest";

import {
  AssortmentInvalidStateError,
  AssortmentValidationError,
  configureOutletOperatingProfile,
  pauseOutlet,
  replaceOutletOperatingSchedule,
  resolveOutletOperatingState,
  resumeOutlet,
  suspendOutlet,
  unsuspendOutlet,
  validateOperatingSchedule,
} from "../../src/server/assortment";
import { updateOutlet } from "../../src/server/organization";
import {
  configureAlwaysAcceptingOutlet,
  findInstantForLocalWallClock,
  withAssortmentDomain,
} from "./support";

describe("outlet operating state", () => {
  it("inactive outlet → OUTLET_INACTIVE; missing profile/schedule → OPERATING_CONFIGURATION_MISSING", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      await persistence.transaction((tx) =>
        updateOutlet(tx, {
          outletId: tree.outletA.id,
          status: "inactive",
        }),
      );
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: new Date() },
          }),
        ),
      ).toMatchObject({ code: "OUTLET_INACTIVE", effectiveState: "suspended" });

      await persistence.transaction((tx) =>
        updateOutlet(tx, {
          outletId: tree.outletA.id,
          status: "active",
        }),
      );

      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: new Date() },
          }),
        ),
      ).toMatchObject({ code: "OPERATING_CONFIGURATION_MISSING" });

      await persistence.transaction((tx) =>
        configureOutletOperatingProfile(tx, {
          actor: outletManagerActor,
          outletId: tree.outletA.id,
          timezone: "Asia/Kolkata",
        }),
      );
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: new Date() },
          }),
        ),
      ).toMatchObject({ code: "OPERATING_CONFIGURATION_MISSING" });

      // unused brandAdminActor keeps lint quiet via authorize path elsewhere
      void brandAdminActor;
    });
  });

  it("accepting inside interval; closed_by_schedule outside; Asia/Kolkata wall clock", async () => {
    await withAssortmentDomain(async (persistence, { tree, outletManagerActor }) => {
      await persistence.transaction(async (tx) => {
        await configureOutletOperatingProfile(tx, {
          actor: outletManagerActor,
          outletId: tree.outletA.id,
          timezone: "Asia/Kolkata",
        });
        await replaceOutletOperatingSchedule(tx, {
          actor: outletManagerActor,
          outletId: tree.outletA.id,
          intervals: [{ dayOfWeek: 1, startMinute: 600, endMinute: 900 }],
        });
      });

      const inside = findInstantForLocalWallClock("Asia/Kolkata", 1, 700);
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: inside },
          }),
        ),
      ).toMatchObject({ code: "AVAILABLE", effectiveState: "accepting" });

      const outside = findInstantForLocalWallClock("Asia/Kolkata", 1, 1000);
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: outside },
          }),
        ),
      ).toMatchObject({
        code: "OUTLET_CLOSED_BY_SCHEDULE",
        effectiveState: "closed_by_schedule",
      });
    });
  });

  it("paused indefinite / before expiry / expired falls through; suspended overrides", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, outletManagerActor, brandAdminActor }) => {
        await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
        const now = new Date();

        await persistence.transaction((tx) =>
          pauseOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletOperatingState(ctx, {
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_PAUSED", effectiveState: "paused" });

        const future = new Date(now.getTime() + 60 * 60 * 1000);
        await persistence.transaction((tx) =>
          pauseOutlet(tx, {
            actor: outletManagerActor,
            outletId: tree.outletA.id,
            pausedUntil: future,
          }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletOperatingState(ctx, {
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_PAUSED" });
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletOperatingState(ctx, {
              outletId: tree.outletA.id,
              context: { now: new Date(future.getTime() + 1) },
            }),
          ),
        ).toMatchObject({ code: "AVAILABLE", effectiveState: "accepting" });

        await persistence.transaction((tx) =>
          suspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletOperatingState(ctx, {
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "OUTLET_SUSPENDED", effectiveState: "suspended" });

        await expect(
          persistence.transaction((tx) =>
            pauseOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
          ),
        ).rejects.toBeInstanceOf(AssortmentInvalidStateError);

        await expect(
          persistence.transaction((tx) =>
            resumeOutlet(tx, { actor: outletManagerActor, outletId: tree.outletA.id }),
          ),
        ).rejects.toBeInstanceOf(AssortmentInvalidStateError);

        await persistence.transaction((tx) =>
          unsuspendOutlet(tx, { actor: brandAdminActor, outletId: tree.outletA.id }),
        );
        expect(
          await persistence.withContext((ctx) =>
            resolveOutletOperatingState(ctx, {
              outletId: tree.outletA.id,
              context: { now },
            }),
          ),
        ).toMatchObject({ code: "AVAILABLE" });
      },
    );
  });

  it("schedule validation: overlap, cross-midnight, split overnight, invalid timezone", async () => {
    await withAssortmentDomain(async (persistence, { tree, outletManagerActor }) => {
      expect(() =>
        validateOperatingSchedule([
          { dayOfWeek: 1, startMinute: 600, endMinute: 800 },
          { dayOfWeek: 1, startMinute: 700, endMinute: 900 },
        ]),
      ).toThrow(AssortmentValidationError);

      expect(() =>
        validateOperatingSchedule([{ dayOfWeek: 1, startMinute: 1320, endMinute: 120 }]),
      ).toThrow(AssortmentValidationError);

      // Split overnight: late + early next day — accepted when days differ.
      expect(() =>
        validateOperatingSchedule([
          { dayOfWeek: 1, startMinute: 1320, endMinute: 1440 },
          { dayOfWeek: 2, startMinute: 0, endMinute: 120 },
        ]),
      ).not.toThrow();

      await expect(
        persistence.transaction((tx) =>
          configureOutletOperatingProfile(tx, {
            actor: outletManagerActor,
            outletId: tree.outletA.id,
            timezone: "Not/A_Zone",
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);

      await persistence.transaction(async (tx) => {
        await configureOutletOperatingProfile(tx, {
          actor: outletManagerActor,
          outletId: tree.outletA.id,
          timezone: "Asia/Kolkata",
        });
        await replaceOutletOperatingSchedule(tx, {
          actor: outletManagerActor,
          outletId: tree.outletA.id,
          intervals: [
            { dayOfWeek: 3, startMinute: 0, endMinute: 600 },
            { dayOfWeek: 3, startMinute: 720, endMinute: 1440 },
          ],
        });
      });

      const midMorning = findInstantForLocalWallClock("Asia/Kolkata", 3, 300);
      const middayGap = findInstantForLocalWallClock("Asia/Kolkata", 3, 650);
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: midMorning },
          }),
        ),
      ).toMatchObject({ code: "AVAILABLE" });
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletOperatingState(ctx, {
            outletId: tree.outletA.id,
            context: { now: middayGap },
          }),
        ),
      ).toMatchObject({ code: "OUTLET_CLOSED_BY_SCHEDULE" });
    });
  });
});
