#!/usr/bin/env -S node --conditions=react-server
/**
 * E2E-only customer-commerce process with the accepted fake Payment provider.
 *
 * Not a production entrypoint. Production remains `main.ts` with Razorpay or
 * the disabled provider fail-closed. Used by the customer-ordering Playwright
 * harness so checkout can complete without real Razorpay. Fake outcomes,
 * including `razorpay_standard_checkout`, cannot activate in production.
 */
import process from "node:process";

import { loadConfig } from "../../platform/config/load-config";
import { ConfigurationError } from "../../platform/config/config-error";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import { createFakePaymentProvider, type FakePaymentOutcome } from "../payment/provider";
import { loadCustomerCommerceServiceConfig } from "./config";
import { CustomerCommerceConfigurationError } from "./errors";
import { CustomerCommerceService } from "./service";

const DEFAULT_SERVICE_HOST = "127.0.0.1";
const DEFAULT_SERVICE_PORT = 8083;
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;
const FAKE_OUTCOMES: readonly FakePaymentOutcome[] = [
  "succeed",
  "fail",
  "pending",
  "indeterminate",
  "client_action",
  "razorpay_standard_checkout",
  "cancelled",
];

function fakeOutcomeFromEnv(): FakePaymentOutcome {
  const raw = process.env.CUSTOMER_COMMERCE_FAKE_PAYMENT_OUTCOME ?? "succeed";
  if ((FAKE_OUTCOMES as readonly string[]).includes(raw)) {
    return raw as FakePaymentOutcome;
  }
  throw new Error(
    `CUSTOMER_COMMERCE_FAKE_PAYMENT_OUTCOME must be one of ${FAKE_OUTCOMES.join(", ")}.`,
  );
}

async function main(): Promise<void> {
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
    paymentProvider: createFakePaymentProvider({ defaultOutcome: fakeOutcomeFromEnv() }),
  });

  await service.start();
  console.log(
    JSON.stringify({
      operation: "service_start",
      safeOutcomeCode: "LISTENING",
      httpStatus: 0,
      durationMs: 0,
      fakePayment: true,
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
    console.error(`customer-commerce-fake: ${error.message}`);
  } else {
    console.error("customer-commerce-fake: failed to start.");
  }
  process.exitCode = 1;
});
