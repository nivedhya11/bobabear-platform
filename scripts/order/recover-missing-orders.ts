#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Operational invocation of recoverMissingOrdersBatch (IMP-026A / D-362).
 *
 * Uses existing recovery algorithm only. Safe summary output — no secrets.
 * Repeated invocation is idempotent.
 *
 * Usage:
 *   npm run order:recover-missing
 *   npm run order:recover-missing -- --cursor=<checkoutId>
 */
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { ConfigurationError } from "../../src/platform/config/config-error";
import { recoverMissingOrdersBatch } from "../../src/server/order";
import { getApplicationPersistence } from "../../src/server/persistence";

const DEFAULT_ORDER_POLICY = Object.freeze({
  orderNumberMaxAttempts: 8,
  recoveryBatchSize: 25,
});

function parseArgs(argv: readonly string[]): Readonly<{ cursor?: string }> {
  let cursor: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg.startsWith("--cursor=")) {
      cursor = arg.slice("--cursor=".length);
      continue;
    }
    if (arg === "--cursor") {
      cursor = argv[i + 1];
      i += 1;
    }
  }
  return cursor ? Object.freeze({ cursor }) : Object.freeze({});
}

function printSafeError(message: string): void {
  const safe = /password|secret|postgresql:\/\//i.test(message)
    ? "order:recover-missing failed."
    : message;
  console.error(JSON.stringify({ ok: false, error: safe }));
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(workerConfig);
  const args = parseArgs(process.argv.slice(2));

  try {
    const batch = await recoverMissingOrdersBatch(persistence, args, {
      policy: DEFAULT_ORDER_POLICY,
    });
    const created = batch.results.filter((item) => item.disposition === "CREATED");
    const alreadyExists = batch.results.filter((item) => item.disposition === "ALREADY_EXISTS");
    const anomaly = batch.results.filter((item) => item.disposition === "ANOMALY");
    console.log(
      JSON.stringify({
        ok: true,
        operation: "recover_missing_orders_batch",
        scanned: batch.results.length,
        created: created.length,
        alreadyExists: alreadyExists.length,
        anomaly: anomaly.length,
        nextCursor: batch.nextCursor,
        createdOrders: created.map((item) =>
          Object.freeze({
            checkoutId: item.checkoutId,
            orderId: item.orderId,
            orderNumber: item.orderNumber,
          }),
        ),
        anomalyCheckouts: anomaly.map((item) => item.checkoutId),
      }),
    );
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    printSafeError(error.message);
  } else if (error instanceof Error) {
    printSafeError(error.message);
  } else {
    printSafeError("order:recover-missing failed.");
  }
  process.exitCode = 1;
});
