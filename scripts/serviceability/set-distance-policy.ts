#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Configure outlet Serviceability distance policy (IMP-036B).
 *
 * Requires routing priority to exist first. Uses an authorized workforce actor id.
 *
 * Usage:
 *   npm run serviceability:set-distance-policy -- \\
 *     --actor-id=<workforce-user-id> --outlet-id=<uuid> --revision=<bigint|null> \\
 *     (--clear | --origin-lat=<decimal> --origin-lng=<decimal> --max-distance-meters=<int>)
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  getOutletServiceabilityConfiguration,
  setOutletServiceabilityDistancePolicy,
} from "../../src/server/serviceability";
import { principalFor } from "../../tests/database/support/access-control-fixtures";

function usage(): never {
  process.stderr.write(`Usage:
  serviceability:set-distance-policy --actor-id <workforce-user-id> --outlet-id <uuid> --revision <bigint|null> \\
    (--clear | --origin-lat <decimal> --origin-lng <decimal> --max-distance-meters <int>)
`);
  process.exit(1);
}

function parseArgs(argv: readonly string[]): Readonly<{
  outletId: string;
  revision: bigint | null;
  clear: boolean;
  originLat?: string;
  originLng?: string;
  maxDistanceMeters?: number;
  actorId: string;
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
  const revisionRaw = map.get("revision");
  if (revisionRaw === undefined) usage();
  const clear = map.get("clear") === "true";
  const originLat = map.get("origin-lat");
  const originLng = map.get("origin-lng");
  const maxDistanceRaw = map.get("max-distance-meters");
  if (clear) {
    return Object.freeze({
      outletId,
      actorId,
      revision: revisionRaw === "null" ? null : BigInt(revisionRaw),
      clear: true,
    });
  }
  if (!originLat || !originLng || !maxDistanceRaw) usage();
  const maxDistanceMeters = Number.parseInt(maxDistanceRaw, 10);
  if (!Number.isInteger(maxDistanceMeters) || maxDistanceMeters <= 0) usage();
  return Object.freeze({
    outletId,
    actorId,
    revision: revisionRaw === "null" ? null : BigInt(revisionRaw),
    clear: false,
    originLat,
    originLng,
    maxDistanceMeters,
  });
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  const config = loadConfig({ processKind: "worker", source: process.env });
  const args = parseArgs(process.argv.slice(2));
  const persistence = getApplicationPersistence(config);
  const actor = principalFor(args.actorId);

  const before = await getOutletServiceabilityConfiguration(persistence, actor, {
    outletId: args.outletId,
  });
  const updated = await setOutletServiceabilityDistancePolicy(persistence, actor, {
    outletId: args.outletId,
    expectedRevision: args.revision,
    serviceOriginLatitude: args.clear ? null : args.originLat!,
    serviceOriginLongitude: args.clear ? null : args.originLng!,
    maxServiceDistanceMeters: args.clear ? null : args.maxDistanceMeters!,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        before: {
          revision: before.revision?.toString() ?? null,
          serviceOriginLatitude: before.serviceOriginLatitude,
          serviceOriginLongitude: before.serviceOriginLongitude,
          maxServiceDistanceMeters: before.maxServiceDistanceMeters,
        },
        after: {
          revision: updated.revision?.toString() ?? null,
          serviceOriginLatitude: updated.serviceOriginLatitude,
          serviceOriginLongitude: updated.serviceOriginLongitude,
          maxServiceDistanceMeters: updated.maxServiceDistanceMeters,
        },
      },
      null,
      2,
    )}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
