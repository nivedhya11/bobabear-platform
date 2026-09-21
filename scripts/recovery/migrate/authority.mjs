/**
 * Existing repository migration authority adapter (IMP-037 §13).
 * Invokes `tsx scripts/database/migrate.ts` / `npm run db:migrate` only.
 * Does not invent a second migration mechanism. Never edits historical migrations.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redactText } from "../redact.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MIGRATE_SCRIPT = path.join(REPO_ROOT, "scripts/database/migrate.ts");

/**
 * @param {object} options
 * @param {string} options.databaseUrl
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.cwd]
 * @param {Function} [options.execFn]
 * @returns {() => Promise<{ ok: boolean, reason?: string }>}
 */
export function createExistingMigrationAuthority(options) {
  const databaseUrl = typeof options?.databaseUrl === "string" ? options.databaseUrl.trim() : "";
  if (!databaseUrl) {
    return async () => ({
      ok: false,
      reason: "migration authority requires databaseUrl bound to the fresh recovery target",
    });
  }

  return async () => {
    if (!existsSync(MIGRATE_SCRIPT)) {
      return {
        ok: false,
        reason: `existing migration authority missing at ${MIGRATE_SCRIPT}`,
      };
    }

    const cwd = options.cwd ?? REPO_ROOT;
    const env = {
      ...(options.env ?? process.env),
      // Canonical migration authority reads BOBA_BEAR_DATABASE_MIGRATION_URL
      // (scripts/database/migrate.ts → loadConfig processKind=migration).
      BOBA_BEAR_DATABASE_MIGRATION_URL: databaseUrl,
      // Compatibility alias only — not authoritative for migrate.ts.
      DATABASE_URL: databaseUrl,
      BOBA_BEAR_DATABASE_SSL_MODE:
        typeof (options.env ?? process.env).BOBA_BEAR_DATABASE_SSL_MODE === "string" &&
        String((options.env ?? process.env).BOBA_BEAR_DATABASE_SSL_MODE).trim()
          ? String((options.env ?? process.env).BOBA_BEAR_DATABASE_SSL_MODE).trim()
          : "disable",
    };
    // Never inherit application / prior migration URLs over the bound recovery target.
    delete env.BOBA_APP_DATABASE_URL;
    delete env.BOBA_BEAR_DATABASE_URL;

    const execFn =
      options.execFn ??
      ((command, args, opts) => {
        const result = spawnSync(command, args, {
          cwd: opts?.cwd,
          env: opts?.env,
          encoding: "utf8",
          timeout: opts?.timeout ?? 600_000,
        });
        return {
          status: typeof result.status === "number" ? result.status : 1,
          stdout: result.stdout ?? "",
          stderr: result.stderr ?? "",
          error: result.error,
        };
      });

    // Prefer direct tsx invocation of the canonical migrate script.
    const tsxBin = process.env.BOBA_RECOVERY_TSX_BIN ?? "npx";
    const result = execFn(
      tsxBin,
      tsxBin === "npx" ? ["tsx", MIGRATE_SCRIPT] : [MIGRATE_SCRIPT],
      { cwd, env, timeout: 600_000 },
    );

    if (result.error && /ENOENT/i.test(String(result.error.message ?? result.error))) {
      return {
        ok: false,
        reason: "migration executable/configuration unavailable (tsx/npx missing)",
      };
    }
    if (result.status !== 0) {
      return {
        ok: false,
        reason: redactText(result.stderr || result.stdout || `migration authority exited ${result.status}`),
      };
    }
    return { ok: true };
  };
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertMigrationAuthorityPresent() {
  if (!existsSync(MIGRATE_SCRIPT)) {
    return {
      ok: false,
      reason: `existing migration authority missing at ${MIGRATE_SCRIPT}`,
    };
  }
  return { ok: true };
}

export { MIGRATE_SCRIPT, REPO_ROOT };
