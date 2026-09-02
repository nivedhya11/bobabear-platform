#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * LOCAL UAT ONLY — configure outlet operating profile + 24x7 schedule via
 * canonical assortment use-cases. Not a production bootstrap path.
 *
 * Usage:
 *   npm run assortment:configure-outlet-operating-uat -- \\
 *     --actor-id=<workforce-user-id> --outlet-id=<uuid> [--dry-run]
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import {
  configureOutletOperatingProfile,
  findOutletOperatingProfile,
  listOutletOperatingIntervals,
  replaceOutletOperatingSchedule,
} from "../../src/server/assortment/operating";
import { resolveOutletOperatingState } from "../../src/server/assortment/resolve-operating";
import { getApplicationPersistence } from "../../src/server/persistence";
import { principalFor } from "../../tests/database/support/access-control-fixtures";

function usage(): never {
  process.stderr.write(`Usage:
  assortment:configure-outlet-operating-uat --actor-id <workforce-user-id> --outlet-id <uuid> [--dry-run]
`);
  process.exit(1);
}

function parseArgs(argv: readonly string[]): Readonly<{
  outletId: string;
  actorId: string;
  dryRun: boolean;
}> {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      map.set(key, next);
      i += 1;
    } else {
      map.set(key, "true");
    }
  }
  const outletId = map.get("outlet-id");
  const actorId = map.get("actor-id");
  if (!outletId || !actorId) usage();
  return Object.freeze({
    outletId,
    actorId,
    dryRun: map.get("dry-run") === "true",
  });
}

const FULL_WEEK_INTERVALS = ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 0,
  endMinute: 1440,
}));

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  const config = loadConfig({ processKind: "worker", source: process.env });
  const args = parseArgs(process.argv.slice(2));
  const persistence = getApplicationPersistence(config);
  const actor = principalFor(args.actorId);

  try {
    const existingProfile = await persistence.withContext((ctx) =>
      findOutletOperatingProfile(ctx, args.outletId),
    );
    const existingIntervals = existingProfile
      ? await persistence.withContext((ctx) => listOutletOperatingIntervals(ctx, args.outletId))
      : [];

    if (existingProfile && existingIntervals.length > 0) {
      const resolver = await persistence.withContext((ctx) =>
        resolveOutletOperatingState(ctx, {
          outletId: args.outletId,
          context: { now: new Date() },
        }),
      );
      process.stdout.write(
        `${JSON.stringify(
          {
            action: "SKIP",
            reason: "existing_schedule_present",
            profile: existingProfile,
            intervalCount: existingIntervals.length,
            intervals: existingIntervals,
            resolver,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    if (args.dryRun) {
      process.stdout.write(
        `${JSON.stringify(
          {
            action: "DRY_RUN",
            wouldConfigure: {
              timezone: "Asia/Kolkata",
              intervals: FULL_WEEK_INTERVALS,
            },
            existingProfile,
            existingIntervalCount: existingIntervals.length,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    let profile;
    let intervals: Awaited<ReturnType<typeof replaceOutletOperatingSchedule>> = [];
    await persistence.transaction(async (tx) => {
      profile = await configureOutletOperatingProfile(tx, {
        actor,
        outletId: args.outletId,
        timezone: "Asia/Kolkata",
      });
      intervals = await replaceOutletOperatingSchedule(tx, {
        actor,
        outletId: args.outletId,
        intervals: FULL_WEEK_INTERVALS,
      });
    });

    const resolver = await persistence.withContext((ctx) =>
      resolveOutletOperatingState(ctx, {
        outletId: args.outletId,
        context: { now: new Date() },
      }),
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          action: "CONFIGURED",
          profile,
          intervalCount: intervals?.length ?? 0,
          resolver,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await persistence.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
