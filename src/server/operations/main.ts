#!/usr/bin/env -S node --conditions=react-server --import tsx
/** Operations service process entry point (IMP-029). */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

import { loadConfig } from "../../platform/config/load-config";
import { ConfigurationError } from "../../platform/config/config-error";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import { loadOperationsConfig, OperationsConfigurationError } from "./config";
import { loadMetaWhatsAppProviderConfig } from "../notifications/provider/meta-whatsapp";
import { OperationsService } from "./service";

const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..", "..");
  loadEnvConfig(projectRoot, true);
  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const config = loadOperationsConfig(process.env, workerConfig.environment);
  const whatsappConfig = loadMetaWhatsAppProviderConfig(
    process.env,
    workerConfig.environment,
  );
  const service = new OperationsService({
    auth: config.auth,
    persistenceConfig: workerConfig,
    trustedOrigin: config.trustedOrigin,
    host: config.serviceHost,
    port: config.servicePort,
    metaWhatsApp:
      whatsappConfig.selector === "meta_cloud_api" ? whatsappConfig.meta : null,
  });
  await service.start();
  console.log(JSON.stringify({ operation: "service_start", safeOutcomeCode: "LISTENING", httpStatus: 0, durationMs: 0 }));
  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ operation: "service_shutdown", safeOutcomeCode: signal, httpStatus: 0, durationMs: 0 }));
    await service.close();
    process.exit(0);
  }
  for (const signal of SHUTDOWN_SIGNALS) process.on(signal, () => { void shutdown(signal); });
}

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError || error instanceof AuthFoundationConfigurationError || error instanceof OperationsConfigurationError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`operations: ${error.message}`);
  } else {
    console.error("operations: failed to start.");
  }
  process.exitCode = 1;
});
