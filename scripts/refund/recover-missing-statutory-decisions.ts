#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Operational invocation of recoverMissingRefundStatutoryDecisionsBatch
 * (IMP-028 / D-366; mirrors Order recovery D-362 model).
 *
 * Condition repaired:
 *   Refund.status = PROCESSED AND no RefundStatutoryDecision
 *
 * Refund PROCESSED remains authoritative money/provider truth. This command
 * scans for PROCESSED Refunds missing a RefundStatutoryDecision and retries
 * PENDING ensure. Safe/idempotent to rerun. It is the operational catch-up
 * path after a post-commit ensure failure. It does not infer RFV/CN/NSD and
 * does not issue a Financial Document.
 *
 * Not scheduled automatically — operator/runbook invocation only.
 *
 * Usage:
 *   npm run refund:recover-missing-statutory-decisions
 *   npm run refund:recover-missing-statutory-decisions -- --cursor=<refundId>
 *   npm run refund:recover-missing-statutory-decisions -- --limit=25
 */
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { ConfigurationError } from "../../src/platform/config/config-error";
import {
  recoverMissingRefundStatutoryDecisionsBatch,
  type RecoverMissingRefundStatutoryDecisionsOptions,
} from "../../src/server/refund-statutory-decision/from-processed-refund";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";

function parseArgs(
  argv: readonly string[],
): RecoverMissingRefundStatutoryDecisionsOptions {
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
    ...(cursor ? { afterRefundId: cursor } : {}),
    ...(limit !== undefined ? { limit } : {}),
  });
}

function printSafeError(message: string): void {
  const safe = /password|secret|postgresql:\/\//i.test(message)
    ? "refund:recover-missing-statutory-decisions failed."
    : message;
  console.error(JSON.stringify({ ok: false, error: safe }));
}

/**
 * Production bootstrap + operator recovery boundary (testable without spawning
 * a full deployment process).
 */
export async function executeRecoverMissingRefundStatutoryDecisionsCli(input: {
  persistence: Persistence;
  argv?: readonly string[];
  write?: (line: string) => void;
}): Promise<void> {
  const args = parseArgs(input.argv ?? []);
  const batch = await recoverMissingRefundStatutoryDecisionsBatch(
    input.persistence,
    args,
  );
  const write = input.write ?? ((line: string) => console.log(line));
  const ensured = batch.results.filter((item) => item.disposition === "ENSURED");
  const alreadyExists = batch.results.filter(
    (item) => item.disposition === "ALREADY_EXISTS",
  );
  const skipped = batch.results.filter((item) => item.disposition === "SKIPPED");
  const retryableFailure = batch.results.filter(
    (item) => item.disposition === "RETRYABLE_FAILURE",
  );
  write(
    JSON.stringify({
      ok: true,
      operation: "recover_missing_refund_statutory_decisions_batch",
      scanned: batch.results.length,
      ensured: ensured.length,
      alreadyExists: alreadyExists.length,
      skipped: skipped.length,
      retryableFailure: retryableFailure.length,
      nextCursor: batch.nextCursor,
      ensuredDecisions: ensured.map((item) =>
        Object.freeze({
          refundId: item.refundId,
          decisionId: item.decisionId,
        }),
      ),
      retryableFailureRefunds: retryableFailure.map((item) => item.refundId),
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
    await executeRecoverMissingRefundStatutoryDecisionsCli({
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
      printSafeError("refund:recover-missing-statutory-decisions failed.");
    }
    process.exitCode = 1;
  });
}
