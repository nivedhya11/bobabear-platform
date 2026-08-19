#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Manual signed PDF operator workflow (IMP-028 / D-367 Slice 2 MVP).
 *
 * Usage:
 *   npm run fd:signing -- pending
 *   npm run fd:signing -- export --financial-document-id <id> --out <path>
 *   npm run fd:signing -- upload --financial-document-id <id> --file <path> \
 *     --signer-profile-id <id> --signed-at <ISO> --signature-profile <value> \
 *     --attest-signed-artifact
 */
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { ConfigurationError } from "../../src/platform/config/config-error";
import {
  runSigningOperatorExport,
  runSigningOperatorPending,
  runSigningOperatorUpload,
} from "../../src/server/financial-document/signing-operator";
import { getApplicationPersistence } from "../../src/server/persistence";
import type { Persistence } from "../../src/server/persistence/types";

type ParsedArgs = Readonly<{
  command: "pending" | "export" | "upload" | "help" | "unknown";
  financialDocumentId?: string;
  outPath?: string;
  filePath?: string;
  signerProfileId?: string;
  signedAt?: Date;
  signatureProfile?: string;
  attestSignedArtifact: boolean;
  limit?: number;
}>;

function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const command = positional[0] ?? "help";
  let financialDocumentId: string | undefined;
  let outPath: string | undefined;
  let filePath: string | undefined;
  let signerProfileId: string | undefined;
  let signedAt: Date | undefined;
  let signatureProfile: string | undefined;
  let attestSignedArtifact = false;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg.startsWith("--financial-document-id=")) {
      financialDocumentId = arg.slice("--financial-document-id=".length);
      continue;
    }
    if (arg === "--financial-document-id") {
      financialDocumentId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      outPath = arg.slice("--out=".length);
      continue;
    }
    if (arg === "--out") {
      outPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      filePath = arg.slice("--file=".length);
      continue;
    }
    if (arg === "--file") {
      filePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--signer-profile-id=")) {
      signerProfileId = arg.slice("--signer-profile-id=".length);
      continue;
    }
    if (arg === "--signer-profile-id") {
      signerProfileId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--signed-at=")) {
      signedAt = new Date(arg.slice("--signed-at=".length));
      continue;
    }
    if (arg === "--signed-at") {
      signedAt = new Date(argv[i + 1]!);
      i += 1;
      continue;
    }
    if (arg.startsWith("--signature-profile=")) {
      signatureProfile = arg.slice("--signature-profile=".length);
      continue;
    }
    if (arg === "--signature-profile") {
      signatureProfile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--attest-signed-artifact") {
      attestSignedArtifact = true;
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

  if (command === "pending" || command === "export" || command === "upload") {
    return Object.freeze({
      command,
      financialDocumentId,
      outPath,
      filePath,
      signerProfileId,
      signedAt,
      signatureProfile,
      attestSignedArtifact,
      limit,
    });
  }
  if (command === "help" || command === "--help" || command === "-h") {
    return Object.freeze({ command: "help", attestSignedArtifact: false });
  }
  return Object.freeze({ command: "unknown", attestSignedArtifact: false });
}

function printSafeError(message: string): void {
  const safe = /password|secret|postgresql:\/\//i.test(message)
    ? "fd:signing failed."
    : message;
  console.error(JSON.stringify({ ok: false, error: safe }));
}

export async function executeSigningCli(input: {
  persistence: Persistence;
  argv: readonly string[];
  write?: (line: string) => void;
}): Promise<number> {
  const write = input.write ?? ((line: string) => console.log(line));
  const parsed = parseArgs(input.argv);

  try {
    if (parsed.command === "help") {
      write(
        JSON.stringify({
          ok: true,
          usage: [
            "pending [--limit=N]",
            "export --financial-document-id <id> --out <path>",
            "upload --financial-document-id <id> --file <path> --signer-profile-id <id> --signed-at <ISO> --signature-profile <value> --attest-signed-artifact",
          ],
        }),
      );
      return 0;
    }
    if (parsed.command === "unknown") {
      printSafeError("Unknown fd:signing command.");
      return 1;
    }
    if (parsed.command === "pending") {
      const result = await runSigningOperatorPending(input.persistence, {
        limit: parsed.limit,
      });
      write(JSON.stringify({ ok: true, ...result }));
      return 0;
    }
    if (parsed.command === "export") {
      if (!parsed.financialDocumentId || !parsed.outPath) {
        printSafeError("export requires --financial-document-id and --out.");
        return 1;
      }
      const result = await runSigningOperatorExport(input.persistence, {
        financialDocumentId: parsed.financialDocumentId,
        outPath: parsed.outPath,
      });
      write(JSON.stringify({ ok: true, ...result }));
      return 0;
    }
    if (!parsed.financialDocumentId || !parsed.filePath || !parsed.signerProfileId) {
      printSafeError(
        "upload requires --financial-document-id, --file, and --signer-profile-id.",
      );
      return 1;
    }
    if (!parsed.signedAt || Number.isNaN(parsed.signedAt.getTime())) {
      printSafeError("upload requires valid --signed-at.");
      return 1;
    }
    if (!parsed.signatureProfile?.trim()) {
      printSafeError("upload requires --signature-profile.");
      return 1;
    }
    const result = await runSigningOperatorUpload(input.persistence, {
      financialDocumentId: parsed.financialDocumentId,
      filePath: parsed.filePath,
      signerProfileId: parsed.signerProfileId,
      signedAt: parsed.signedAt,
      signatureProfile: parsed.signatureProfile,
      attestSignedArtifact: parsed.attestSignedArtifact,
    });
    write(JSON.stringify({ ok: true, ...result }));
    return 0;
  } catch (error) {
    printSafeError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot);
  let workerConfig;
  try {
    workerConfig = loadConfig({ processKind: "worker" });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      printSafeError(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const persistence = getApplicationPersistence(workerConfig);
  try {
    process.exitCode = await executeSigningCli({
      persistence,
      argv: process.argv.slice(2),
    });
  } finally {
    await persistence.close();
  }
}

const invokedDirectly =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    printSafeError(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
