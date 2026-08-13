#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Customer-commerce HTTP service process entry point (IMP-024).
 *
 * Production process entry. The only other module in this tree allowed to
 * read `process.env` directly is `e2e-fake-main.ts` (E2E fake Payment).
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

import { loadConfig } from "../../platform/config/load-config";
import { ConfigurationError } from "../../platform/config/config-error";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import { loadCustomerCommerceServiceConfig } from "./config";
import { CustomerCommerceConfigurationError } from "./errors";
import { CustomerCommerceService } from "./service";

const DEFAULT_SERVICE_HOST = "0.0.0.0";
const DEFAULT_SERVICE_PORT = 8083;
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..", "..");

  loadEnvConfig(projectRoot, true);

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const serviceConfig = loadCustomerCommerceServiceConfig(
    process.env,
    workerConfig.environment,
  );

  const service = new CustomerCommerceService({
    auth: serviceConfig.auth,
    persistenceConfig: workerConfig,
    identityDeriver: serviceConfig.identityDeriver,
    host: serviceConfig.serviceHost || DEFAULT_SERVICE_HOST,
    port: serviceConfig.servicePort || DEFAULT_SERVICE_PORT,
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
      JSON.stringify({
        operation: "service_shutdown",
        safeOutcomeCode: signal,
        httpStatus: 0,
        durationMs: 0,
      }),
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
    error instanceof CustomerCommerceConfigurationError
  ) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`customer-commerce: ${error.message}`);
  } else {
    console.error("customer-commerce: failed to start.");
  }
  process.exitCode = 1;
});
