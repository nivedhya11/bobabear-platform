#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Customer-auth HTTP service process entry point (IMP-009).
 *
 * This is the one executable boundary for this service, analogous to
 * `src/instrumentation.ts` for the Next.js web process: it is the only
 * module under `src/server/customer-auth/**` allowed to read `process.env`
 * directly (see the matching, narrowly-scoped exceptions added to
 * `eslint.config.mjs` and `scripts/audit-config-boundary.mjs`). Every other
 * module in this service accepts an explicit configuration object instead.
 *
 * `--conditions=react-server` is required because this process imports
 * `src/server/persistence` and `src/server/auth/customer`, both carrying
 * the `server-only` marker — same requirement as
 * `scripts/database/check.ts` (see AGENTS.md's IMP-006 section).
 *
 * Registers `SIGTERM`/`SIGINT` here only — `CustomerAuthService` itself
 * never registers a process signal handler.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// `@next/env`'s published bundle defines its named exports dynamically
// (webpack-style getters), which Node's static CJS/ESM interop can't see —
// only a default-import + destructure round-trips correctly under both
// `tsx` (dev) and a plain compiled ESM `node` process (this service's
// Docker runtime, see `scripts/customer-auth/build.mjs`).
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

import { loadConfig } from "../../platform/config/load-config";
import { ConfigurationError } from "../../platform/config/config-error";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import { loadCustomerAuthServiceConfig } from "./config";
import { CustomerAuthConfigurationError, CustomerOtpProviderError } from "./errors";
import { createCustomerOtpProvider } from "./provider";
import { CustomerAuthService } from "./service";

const DEFAULT_SERVICE_HOST = "0.0.0.0";
const DEFAULT_SERVICE_PORT = 8081;
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..", "..");

  loadEnvConfig(projectRoot, true);

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const serviceConfig = loadCustomerAuthServiceConfig(process.env, workerConfig.environment);

  const otpProvider = createCustomerOtpProvider({
    kind: serviceConfig.phone.otpProviderKind,
    environmentType: serviceConfig.environmentType,
    fixedCode: serviceConfig.phone.localFixedCode,
  });

  const service = new CustomerAuthService({
    auth: serviceConfig.auth,
    persistenceConfig: workerConfig,
    otpProvider,
    identityDeriver: serviceConfig.phone.identityDeriver,
    piiHashSecret: serviceConfig.phone.piiHashSecret,
    trustedOrigin: serviceConfig.phone.trustedOrigin,
    trustProxyHops: serviceConfig.phone.trustProxyHops,
    host: serviceConfig.phone.serviceHost || DEFAULT_SERVICE_HOST,
    port: serviceConfig.phone.servicePort || DEFAULT_SERVICE_PORT,
  });

  await service.start();
  console.log(
    JSON.stringify({
      operation: "service_start",
      safeOutcomeCode: "LISTENING",
      httpStatus: 0,
      durationMs: 0,
    }),
  );

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(
      JSON.stringify({ operation: "service_shutdown", safeOutcomeCode: signal, httpStatus: 0, durationMs: 0 }),
    );
    await service.close();
    process.exit(0);
  }

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}

main().catch((error: unknown) => {
  if (
    error instanceof ConfigurationError ||
    error instanceof AuthFoundationConfigurationError ||
    error instanceof CustomerAuthConfigurationError
  ) {
    console.error(error.message);
  } else if (error instanceof CustomerOtpProviderError) {
    console.error(`customer-auth: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`customer-auth: ${error.message}`);
  } else {
    console.error("customer-auth: failed to start.");
  }
  process.exitCode = 1;
});
