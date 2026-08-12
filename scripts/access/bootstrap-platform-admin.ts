#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * One-time Platform Super Admin bootstrap (IMP-011).
 *
 * Accepts an existing MFA-enrolled workforce identity. No permanent
 * bootstrap secret. Never prints email, passwords, or connection strings.
 *
 * Usage:
 *   npm run access:bootstrap-platform-admin -- --user-id=<workforce-user-id>
 *   npm run access:bootstrap-platform-admin -- --email=ops@example.test
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import { workforceAuthUsers } from "../../src/platform/database/schema/workforce-auth";
import {
  BootstrapClosedError,
  BootstrapIneligibleError,
  bootstrapPlatformSuperAdmin,
} from "../../src/server/access-control";
import { getApplicationPersistence } from "../../src/server/persistence";
import { normalizeWorkforceEmail } from "../../src/shared/workforce-auth/email";

type CliArgs = Readonly<Record<string, string | undefined>>;

function parseArgs(argv: readonly string[]): CliArgs {
  const out: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eqIdx = arg.indexOf("=");
    if (eqIdx !== -1) {
      out[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return Object.freeze(out);
}

function printOk(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ok: true, ...payload })}\n`);
}

function printError(message: string): void {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
}

async function resolveWorkforceUserId(
  persistence: ReturnType<typeof getApplicationPersistence>,
  args: CliArgs,
): Promise<string> {
  const userId = args["user-id"];
  if (typeof userId === "string" && userId.length > 0) {
    return userId;
  }

  const emailRaw = args.email;
  if (typeof emailRaw !== "string" || emailRaw.length === 0) {
    throw new Error("Provide exactly one of --user-id or --email.");
  }
  const normalized = normalizeWorkforceEmail(emailRaw);
  if (!normalized.ok) {
    throw new Error("Invalid --email value.");
  }

  const rows = await persistence.withContext(async (ctx) =>
    ctx.db
      .select({ id: workforceAuthUsers.id })
      .from(workforceAuthUsers)
      .where(eq(workforceAuthUsers.email, normalized.email))
      .limit(1),
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Workforce user not found.");
  }
  return row.id;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const args = parseArgs(process.argv.slice(2));
  if (args["user-id"] && args.email) {
    throw new Error("Provide exactly one of --user-id or --email.");
  }

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(workerConfig);
  try {
    const workforceUserId = await resolveWorkforceUserId(persistence, args);
    const result = await bootstrapPlatformSuperAdmin({
      persistence,
      workforceUserId,
    });
    printOk({
      operation: "access_bootstrap_platform_admin",
      outcome: result.outcome,
      membershipId: result.membership.id,
      assignmentId: result.assignment.id,
      // Never print email. User id is an opaque Better Auth id.
      workforceUserId: result.membership.workforceUserId,
    });
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof BootstrapClosedError) {
    printError("BOOTSTRAP_CLOSED");
  } else if (error instanceof BootstrapIneligibleError) {
    printError(error.message);
  } else if (error instanceof ConfigurationError) {
    printError(error.message);
  } else if (error instanceof Error) {
    printError(error.message);
  } else {
    printError("access:bootstrap-platform-admin failed.");
  }
  process.exitCode = 1;
});
