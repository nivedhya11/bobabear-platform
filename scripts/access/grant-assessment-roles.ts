#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Staging-only: grant closed-catalog roles to temporary external-assessment
 * workforce identities using the existing Platform Super Admin principal and
 * Administration use-cases (no forged identity flags).
 *
 * Hierarchy is resolved by stable Dehradun bootstrap codes — never hard-coded
 * staging row UUIDs. Provisioning is idempotent / resumable.
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
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  ASSESSMENT_GRANTS,
  ensureAssessmentGrant,
  resolveAssessmentHierarchy,
} from "./assessment-role-provisioning";
import { resolveWorkforcePrincipalFromDatabase } from "./resolve-workforce-principal-from-db";

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

/**
 * Build a config `source` from staging env files with Compose hostname rewritten
 * for host-side execution. Pass the object to `loadConfig` — never mutate
 * `process.env.BOBA_BEAR_DATABASE_*` (database audit boundary).
 */
function buildStagingWorkerConfigSource(
  projectRoot: string,
): Record<string, string | undefined> {
  const runtimePath = path.join(projectRoot, ".env.staging", ".env.runtime.docker.local");
  const parsed = parseEnvFile(readFileSync(runtimePath, "utf8"));
  const extracted = extractValues(parsed);
  if (!extracted.ok || extracted.values === undefined) {
    throw new Error("Unable to parse .env.staging/.env.runtime.docker.local");
  }
  const values = extracted.values;
  const databaseUrl = String(values.BOBA_BEAR_DATABASE_URL ?? "").replace(
    "@postgres:5432",
    "@127.0.0.1:5433",
  );
  return {
    ...process.env,
    BOBA_BEAR_DATABASE_URL: databaseUrl,
    BOBA_BEAR_DATABASE_SSL_MODE: values.BOBA_BEAR_DATABASE_SSL_MODE ?? "disable",
    BOBA_BEAR_ENV: values.BOBA_BEAR_ENV ?? "local",
    BOBA_BEAR_PUBLIC_ORIGIN: values.BOBA_BEAR_PUBLIC_ORIGIN,
    NODE_ENV: values.NODE_ENV ?? process.env.NODE_ENV ?? "production",
  };
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const { actorId } = parseArgs(process.argv.slice(2));
  const source = buildStagingWorkerConfigSource(projectRoot);
  const workerConfig = loadConfig({ processKind: "worker", source });
  const persistence = getApplicationPersistence(workerConfig);
  try {
    const actor = await resolveWorkforcePrincipalFromDatabase(persistence, actorId);
    const hierarchy = await resolveAssessmentHierarchy(persistence, actor);
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        hierarchyResolved: true,
        brandId: hierarchy.brandId,
        organizationId: hierarchy.organizationId,
        territoryId: hierarchy.territoryId,
        outletId: hierarchy.outletId,
      })}\n`,
    );

    for (const grant of ASSESSMENT_GRANTS) {
      const result = await ensureAssessmentGrant(persistence, actor, hierarchy, grant);
      process.stdout.write(
        `${JSON.stringify({
          ok: true,
          email: result.email,
          membershipId: result.membershipId,
          membershipStatus: result.membershipStatus,
          membershipReused: result.membershipReused,
          roleKey: result.roleKey,
          assignmentId: result.assignmentId,
          assignmentReused: result.assignmentReused,
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
