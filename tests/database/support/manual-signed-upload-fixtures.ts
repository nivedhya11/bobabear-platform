/**
 * Shared helpers for manual signed PDF intake tests (D-367 Slice 2).
 */
import { createHash } from "node:crypto";

import {
  exportUnsignedFinancialDocumentPdf,
  insertAuthorisedSignerProfile,
  uploadManualSignedPdf,
} from "../../../src/server/financial-document";
import type { Persistence } from "../../../src/server/persistence/types";

export type SignableHarness = Readonly<{
  persistence: Persistence;
  legalEntityId: string;
  clock: { now: () => Date };
}>;

export function minimalValidPdfBytes(suffix = ""): Uint8Array {
  const body = `%PDF-1.4
1 0 obj<<>>endobj
trailer<<>>
%%EOF
${suffix}`;
  return new TextEncoder().encode(body);
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function insertActiveSignerForHarness(
  harness: SignableHarness,
) {
  return harness.persistence.transaction(async (tx) =>
    insertAuthorisedSignerProfile(tx, {
      legalEntityId: harness.legalEntityId,
      signerDisplayName: "Authorised Signatory One",
      authorisationReference: "BOARD-RES-2025-001",
      effectiveFrom: harness.clock.now(),
      signingMethod: "DSC",
      externalSignerIdentity: "cert-subject-ref-001",
      lifecycleStatus: "active",
      now: harness.clock.now(),
    }),
  );
}

export async function uploadSignedPdfForHarness(
  harness: SignableHarness,
  input: {
    financialDocumentId: string;
    signerProfileId: string;
    bytes?: Uint8Array;
    signedAt?: Date;
    signatureProfile?: string;
  },
) {
  const bytes = input.bytes ?? minimalValidPdfBytes(input.financialDocumentId);
  const now = harness.clock.now();
  return harness.persistence.transaction(async (tx) =>
    uploadManualSignedPdf(tx, {
      financialDocumentId: input.financialDocumentId,
      signedPdfBytes: bytes,
      authorisedSignerProfileId: input.signerProfileId,
      signedAt: input.signedAt ?? now,
      signatureProfile: input.signatureProfile ?? "OPERATOR_ATTESTED_EXTERNAL",
      attestSignedArtifact: true,
      now,
    }),
  );
}

/**
 * Operator workflow simulation for tests: export unsigned render, then seal those
 * exact bytes as the externally signed artifact for customer delivery.
 */
export async function signFinancialDocumentWithRenderedPdf(
  harness: SignableHarness,
  financialDocumentId: string,
) {
  const unsigned = await exportUnsignedFinancialDocumentPdf(
    harness.persistence,
    financialDocumentId,
  );
  const signer = await insertActiveSignerForHarness(harness);
  return uploadSignedPdfForHarness(harness, {
    financialDocumentId,
    signerProfileId: signer.id,
    bytes: unsigned.bytes,
  });
}
