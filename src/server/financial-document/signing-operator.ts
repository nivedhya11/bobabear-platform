/**
 * Operator CLI boundary for manual signed PDF workflow (D-367 Slice 2).
 */
import { writeFileSync } from "node:fs";

import type { Persistence } from "../persistence/types";
import {
  exportUnsignedFinancialDocumentPdf,
  listOutstandingSignatureWork,
  uploadManualSignedPdf,
  type ManualSignedPdfUploadResult,
  type OutstandingSignatureWorkItem,
} from "./manual-signed-upload";

export type SigningOperatorPendingArgs = Readonly<{
  limit?: number;
}>;

export type SigningOperatorPendingResult = Readonly<{
  operation: "pending";
  items: readonly OutstandingSignatureWorkItem[];
}>;

export type SigningOperatorExportArgs = Readonly<{
  financialDocumentId: string;
  outPath: string;
}>;

export type SigningOperatorExportResult = Readonly<{
  operation: "export";
  financialDocumentId: string;
  outPath: string;
  byteLength: number;
  sha256: string;
}>;

export type SigningOperatorUploadArgs = Readonly<{
  financialDocumentId: string;
  filePath: string;
  signerProfileId: string;
  signedAt: Date;
  signatureProfile: string;
  attestSignedArtifact: boolean;
}>;

export type SigningOperatorUploadResult = Readonly<{
  operation: "upload";
  financialDocumentId: string;
  signatureArtifactId: string;
  objectReference: string;
  contentHash: string;
  idempotentReplay: boolean;
}>;

export async function runSigningOperatorPending(
  persistence: Persistence,
  args: SigningOperatorPendingArgs = {},
): Promise<SigningOperatorPendingResult> {
  const items = await persistence.withContext(async (ctx) =>
    listOutstandingSignatureWork(ctx, { limit: args.limit }),
  );
  return Object.freeze({
    operation: "pending",
    items,
  });
}

export async function runSigningOperatorExport(
  persistence: Persistence,
  args: SigningOperatorExportArgs,
): Promise<SigningOperatorExportResult> {
  const artifact = await exportUnsignedFinancialDocumentPdf(
    persistence,
    args.financialDocumentId,
  );
  writeFileSync(args.outPath, artifact.bytes);
  return Object.freeze({
    operation: "export",
    financialDocumentId: args.financialDocumentId,
    outPath: args.outPath,
    byteLength: artifact.byteLength,
    sha256: artifact.sha256,
  });
}

export async function runSigningOperatorUpload(
  persistence: Persistence,
  args: SigningOperatorUploadArgs,
): Promise<SigningOperatorUploadResult> {
  const { readFileSync } = await import("node:fs");
  const bytes = new Uint8Array(readFileSync(args.filePath));
  const now = new Date();

  const result: ManualSignedPdfUploadResult = await persistence.transaction(
    async (tx) =>
      uploadManualSignedPdf(tx, {
        financialDocumentId: args.financialDocumentId,
        signedPdfBytes: bytes,
        authorisedSignerProfileId: args.signerProfileId,
        signedAt: args.signedAt,
        signatureProfile: args.signatureProfile,
        attestSignedArtifact: args.attestSignedArtifact,
        now,
      }),
  );

  return Object.freeze({
    operation: "upload",
    financialDocumentId: args.financialDocumentId,
    signatureArtifactId: result.signatureArtifact.id,
    objectReference: result.objectReference,
    contentHash: result.contentHash,
    idempotentReplay: result.idempotentReplay,
  });
}
