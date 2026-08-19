#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Operational invocation of recoverMissingReceiptVouchersBatch
 * (IMP-028 Slice 8 / D-365; mirrors Order recovery D-362 model).
 *
 * Condition repaired:
 *   Payment.status = SUCCEEDED AND no ISSUED RECEIPT_VOUCHER
 *
 * Payment SUCCEEDED remains authoritative. This command scans for successful
 * Payments missing a Receipt Voucher and retries issuance. Safe/idempotent to
 * rerun. It is the operational catch-up path after a post-commit issuance
 * failure. Production issuer-profile (issuancePolicy=uninvoiced_advance,
 * enableReceiptVoucher) and RECEIPT_VOUCHER numbering-series configuration
 * must exist for successful issuance.
 *
 * Not scheduled automatically — operator/runbook invocation only.
 *
 * Usage:
 *   npm run financial-document:recover-missing-receipt-vouchers
 *   npm run financial-document:recover-missing-receipt-vouchers -- --cursor=<paymentId>
 *   npm run financial-document:recover-missing-receipt-vouchers -- --limit=25
 */
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { ConfigurationError } from "../../src/platform/config/config-error";
import {
  runRecoverMissingReceiptVouchersOperator,
  type RecoverMissingReceiptVouchersOperatorArgs,
} from "../../src/server/financial-document/recovery-operator";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";

function parseArgs(argv: readonly string[]): RecoverMissingReceiptVouchersOperatorArgs {
  let cursor: string | undefined;
  let limit: number | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg.startsWith("--cursor=")) {
      cursor = arg.slice("--cursor=".length);
      continue;
    }
    if (arg === "--cursor") {
      cursor = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (Number.isFinite(parsed) && parsed > 0) limit = Math.floor(parsed);
      continue;
    }
    if (arg === "--limit") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) limit = Math.floor(parsed);
      i += 1;
    }
  }
  return Object.freeze({
    ...(cursor ? { afterPaymentId: cursor } : {}),
    ...(limit !== undefined ? { limit } : {}),
  });
}

function printSafeError(message: string): void {
  const safe = /password|secret|postgresql:\/\//i.test(message)
    ? "financial-document:recover-missing-receipt-vouchers failed."
    : message;
  console.error(JSON.stringify({ ok: false, error: safe }));
}

/**
 * Production bootstrap + operator recovery boundary (testable without spawning
 * a full deployment process).
 */
export async function executeRecoverMissingReceiptVouchersCli(input: {
  persistence: Persistence;
  argv?: readonly string[];
  write?: (line: string) => void;
}): Promise<void> {
  const args = parseArgs(input.argv ?? []);
  const batch = await runRecoverMissingReceiptVouchersOperator(
    input.persistence,
    args,
  );
  const write = input.write ?? ((line: string) => console.log(line));
  write(
    JSON.stringify({
      ok: true,
      operation: "recover_missing_receipt_vouchers_batch",
      scanned: batch.scanned,
      issued: batch.issued,
      alreadyExists: batch.alreadyExists,
      skipped: batch.skipped,
      retryableFailure: batch.retryableFailure,
      configFailure: batch.configFailure,
      nextCursor: batch.nextCursor,
      issuedDocuments: batch.issuedDocuments,
      configFailurePayments: batch.configFailurePayments,
      retryableFailurePayments: batch.retryableFailurePayments,
    }),
  );
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const workerConfig = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(workerConfig);

  try {
    await executeRecoverMissingReceiptVouchersCli({
      persistence,
      argv: process.argv.slice(2),
    });
  } finally {
    await persistence.close();
  }
}

const isDirectCli =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectCli) {
  main().catch((error: unknown) => {
    if (error instanceof ConfigurationError) {
      printSafeError(error.message);
    } else if (error instanceof Error) {
      printSafeError(error.message);
    } else {
      printSafeError("financial-document:recover-missing-receipt-vouchers failed.");
    }
    process.exitCode = 1;
  });
}
