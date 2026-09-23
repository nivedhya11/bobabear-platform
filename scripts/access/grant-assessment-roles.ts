#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Staging-only: grant closed-catalog roles to temporary external-assessment
 * workforce identities using the existing Platform Super Admin principal and
 * Administration use-cases (no forged identity flags).
 *
 * Secrets are never printed. Not a second identity authority.
 *
 * Usage (host, with staging Postgres published on 5433):
 *   npm run access:grant-assessment-roles -- --actor-id=<platform-super-admin-id>
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { extractValues, parseEnvFile } from "../database/lib/env-file.mjs";
import {
  adminCreateMembership,
  adminGrantRole,
} from "../../src/server/administration/use-cases";
import { getApplicationPersistence } from "../../src/server/persistence";
import { resolveWorkforcePrincipalFromDatabase } from "./resolve-workforce-principal-from-db";

const BRAND_ID = "56ff7724-d511-5ef4-b5d5-d629cbfb2388";
const ORGANIZATION_ID = "b0e00acf-0180-434c-9081-4ed72718bde8";
const TERRITORY_ID = "64e3aac1-bf92-4f1b-bae9-17a1353e0471";
const OUTLET_ID = "36096e68-3ab8-4ee7-b369-afa5d1b4e2b2";

const GRANTS = [
  {
    email: "assessor.ops@bobabear.assessment.test",
    scopeType: "outlet" as const,
    roleKey: "outlet_manager" as const,
  },
  {
    email: "assessor.admin@bobabear.assessment.test",
    scopeType: "brand" as const,
    roleKey: "brand_admin" as const,
  },
  {
    email: "assessor.refund@bobabear.assessment.test",
    scopeType: "outlet" as const,
    roleKey: "support_refund_operator" as const,
  },
] as const;

function parseArgs(argv: readonly string[]): Readonly<{ actorId: string }> {
  let actorId: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const eq = token.indexOf("=");
    if (eq !== -1 && token.slice(2, eq) === "actor-id") {
      actorId = token.slice(eq + 1);
      continue;
    }
    if (token === "--actor-id") {
      actorId = argv[i + 1];
      i += 1;
    }
  }
  if (!actorId) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        error: "Usage: access:grant-assessment-roles --actor-id=<platform-super-admin-id>",
      })}\n`,
    );
    process.exit(1);
  }
  return Object.freeze({ actorId });
}

function applyStagingDatabaseUrlFromEnvFiles(projectRoot: string): void {
  if (process.env.BOBA_BEAR_DATABASE_URL) return;
  const runtimePath = path.join(projectRoot, ".env.staging", ".env.runtime.docker.local");
  const parsed = parseEnvFile(readFileSync(runtimePath, "utf8"));
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    throw new Error("Unable to parse .env.staging/.env.runtime.docker.local");
  }
  const url = String(extracted.values.BOBA_BEAR_DATABASE_URL ?? "").replace(
    "@postgres:5432",
    "@127.0.0.1:5433",
  );
  process.env.BOBA_BEAR_DATABASE_URL = url;
  process.env.BOBA_BEAR_DATABASE_SSL_MODE =
    extracted.values.BOBA_BEAR_DATABASE_SSL_MODE ?? "disable";
  process.env.BOBA_BEAR_ENV = extracted.values.BOBA_BEAR_ENV ?? "local";
  if (extracted.values.BOBA_BEAR_PUBLIC_ORIGIN) {
    process.env.BOBA_BEAR_PUBLIC_ORIGIN = extracted.values.BOBA_BEAR_PUBLIC_ORIGIN;
  }
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  applyStagingDatabaseUrlFromEnvFiles(projectRoot);
  loadEnvConfig(projectRoot, true);

  const { actorId } = parseArgs(process.argv.slice(2));
  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(workerConfig);
  try {
    const actor = await resolveWorkforcePrincipalFromDatabase(persistence, actorId);
    for (const grant of GRANTS) {
      const body: Record<string, unknown> = {
        workforceEmail: grant.email,
        scopeType: grant.scopeType,
        status: "active",
        brandId: BRAND_ID,
      };
      if (grant.scopeType === "outlet") {
        body.organizationId = ORGANIZATION_ID;
        body.territoryId = TERRITORY_ID;
        body.outletId = OUTLET_ID;
      }

      const membership = await adminCreateMembership(persistence, actor, body);
      const assignment = await adminGrantRole(persistence, actor, membership.id, {
        roleKey: grant.roleKey,
      });

      process.stdout.write(
        `${JSON.stringify({
          ok: true,
          email: grant.email,
          membershipId: membership.id,
          membershipStatus: membership.status,
          roleKey: assignment.roleKey,
          assignmentId: assignment.id,
        })}\n`,
      );
    }
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  const err = error as { code?: string; name?: string; message?: string };
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: err.code ?? err.name ?? "ERROR",
      message: err.message ?? "grant failed",
    })}\n`,
  );
  process.exit(1);
});
