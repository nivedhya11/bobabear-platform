/**
 * Shared bootstrap for workforce operator CLIs (IMP-010).
 *
 * Loads env + worker config + workforce auth service config. Credential
 * create/reset use the ephemeral operator Better Auth runtime; other CLIs
 * (disable/enable/reset-mfa) still use the public workforce runtime for
 * non-credential lifecycle operations.
 *
 * Callers must `close()` any returned runtime. Never prints secrets.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { getWorkforceAuthRuntime } from "../../src/server/auth/workforce";
import {
  createWorkforceOperatorAuthRuntime,
  type WorkforceOperatorAuthRuntime,
  type WorkforceOperatorSendResetPassword,
} from "../../src/server/auth/workforce/operator";
import { loadWorkforceAuthServiceConfig } from "../../src/server/workforce-auth/config";
import { normalizeWorkforceEmail } from "../../src/shared/workforce-auth/email";
import { validateWorkforcePassword } from "../../src/server/workforce-auth/password-policy";
import type { WorkerConfig } from "../../src/platform/config";
import type { WorkforceAuthServiceConfig } from "../../src/server/workforce-auth/config";

export type WorkforceCliArgs = Readonly<Record<string, string | undefined>>;

export function parseWorkforceCliArgs(argv: readonly string[]): WorkforceCliArgs {
  const out: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
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

export function requireArg(args: WorkforceCliArgs, key: string): string {
  const value = args[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required --${key} argument.`);
  }
  return value;
}

export function requireNormalizedEmail(raw: string): string {
  const normalized = normalizeWorkforceEmail(raw);
  if (!normalized.ok) {
    throw new Error("Invalid --email value.");
  }
  return normalized.email;
}

export function requireValidPassword(raw: string): string {
  const result = validateWorkforcePassword(raw);
  if (!result.ok) {
    throw new Error("Invalid --password value (must be 15–128 characters).");
  }
  return raw;
}

function loadWorkforceCliEnvironment(): {
  workerConfig: WorkerConfig;
  serviceConfig: WorkforceAuthServiceConfig;
} {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const serviceConfig = loadWorkforceAuthServiceConfig(process.env, workerConfig.environment);
  return { workerConfig, serviceConfig };
}

/**
 * Public workforce Better Auth runtime (disableSignUp: true). Used by
 * disable / enable / reset-mfa CLIs for non-credential lifecycle work.
 */
export async function openWorkforceOperatorRuntime() {
  const { workerConfig, serviceConfig } = loadWorkforceCliEnvironment();

  const runtime = getWorkforceAuthRuntime({
    auth: serviceConfig.auth,
    persistence: workerConfig,
  });

  return { runtime, workerConfig, serviceConfig };
}

/**
 * Ephemeral operator credential runtime (disableSignUp: false, autoSignIn:
 * false). Used only by create-user / reset-password. Never binds HTTP.
 */
export function openWorkforceOperatorCredentialRuntime(options?: {
  sendResetPassword?: WorkforceOperatorSendResetPassword;
}): {
  runtime: WorkforceOperatorAuthRuntime;
  workerConfig: WorkerConfig;
  serviceConfig: WorkforceAuthServiceConfig;
} {
  const { workerConfig, serviceConfig } = loadWorkforceCliEnvironment();

  const runtime = createWorkforceOperatorAuthRuntime({
    auth: serviceConfig.auth,
    persistence: workerConfig,
    sendResetPassword: options?.sendResetPassword,
  });

  return { runtime, workerConfig, serviceConfig };
}

export type WorkforceAuthContext = {
  password: { hash: (password: string) => Promise<string> };
  internalAdapter: {
    createUser: (user: Record<string, unknown>) => Promise<{ id: string; email: string }>;
    findUserByEmail: (
      email: string,
    ) => Promise<{ user: { id: string; email: string } } | null>;
    updateUser: (userId: string, data: Record<string, unknown>) => Promise<unknown>;
    updatePassword: (userId: string, password: string) => Promise<void>;
    deleteUserSessions: (userId: string) => Promise<void>;
    linkAccount: (account: Record<string, unknown>) => Promise<unknown>;
  };
  adapter: {
    deleteMany: (input: {
      model: string;
      where: Array<{ field: string; value: string }>;
    }) => Promise<unknown>;
  };
};

export async function getWorkforceAuthContext(
  runtime: Awaited<ReturnType<typeof openWorkforceOperatorRuntime>>["runtime"],
): Promise<WorkforceAuthContext> {
  const auth = await runtime.getAuth();
  return (await auth.$context) as unknown as WorkforceAuthContext;
}

export function printSafeOk(payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ ok: true, ...payload }));
}

export function printSafeError(message: string): void {
  // Never echo driver/query text — Better Auth / Drizzle failures can include
  // SQL, params, or connection details that must not reach operator stdout.
  const safe =
    /failed query|password|secret|postgresql:\/\//i.test(message)
      ? "workforce operator command failed."
      : message;
  console.error(JSON.stringify({ ok: false, error: safe }));
}
