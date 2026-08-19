/**
 * Manual operator-attested signed PDF intake (IMP-028 / D-367 Slice 2 MVP).
 *
 * No cryptographic signing, provider APIs, or D-366 statutory reversal logic.
 */
import { eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import { authorisedSignerProfilesTable } from "../../platform/database/schema/financial-document-signature";
import {
  canonicalizeSha256HexDigest,
  generateFinancialDocumentArtifact,
  resolveSignatureRequirementForDocumentType,
  suggestFinancialDocumentArtifactFilename,
  validateSignedPdfContainer,
  type AuthorisedSignerSigningMethod,
  type FinancialDocument,
  type FinancialDocumentArtifact,
  type FinancialDocumentStatutoryType,
  SignatureFoundationError,
  type SignatureArtifact,
} from "../../shared/financial-document";
import type {
  Persistence,
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { loadFinancialDocument } from "./repository";
import {
  ensureSignatureArtifactPending,
  findAuthorisedSignerProfileById,
  loadSignatureArtifactByFinancialDocumentId,
  lockSignatureArtifactForUpdate,
  mapSignatureArtifactRow,
  sealSignatureArtifactSigned,
} from "./signature-repository";
import {
  putImmutableSignedArtifactBytes,
  verifyExactSignedArtifactHash,
} from "./signed-artifact-store";

export type OutstandingSignatureWorkItem = Readonly<{
  financialDocumentId: string;
  documentType: FinancialDocumentStatutoryType;
  statutoryDocumentNumber: string;
  issueAt: Date;
  signatureArtifactStatus: "ABSENT" | "PENDING" | "FAILED_RETRYABLE";
}>;

export type ManualSignedPdfUploadInput = Readonly<{
  financialDocumentId: string;
  signedPdfBytes: Uint8Array;
  authorisedSignerProfileId: string;
  signedAt: Date;
  signatureProfile: string;
  attestSignedArtifact: boolean;
  now: Date;
  maxPdfBytes?: number;
}>;

export type ManualSignedPdfUploadResult = Readonly<{
  signatureArtifact: SignatureArtifact;
  objectReference: string;
  contentHash: string;
  contentLength: bigint;
  idempotentReplay: boolean;
}>;

function hashBytes(bytes: Uint8Array): string {
  return canonicalizeSha256HexDigest(
    createHash("sha256").update(bytes).digest("hex"),
  );
}

function assertSignerProfileEligible(input: {
  signer: NonNullable<Awaited<ReturnType<typeof findAuthorisedSignerProfileById>>>;
  legalEntityId: string;
  signedAt: Date;
}): AuthorisedSignerSigningMethod {
  if (input.signer.legalEntityId !== input.legalEntityId) {
    throw new SignatureFoundationError(
      "AUTHORISED_SIGNER_LEGAL_ENTITY_MISMATCH",
      "AuthorisedSignerProfile legal entity does not match FinancialDocument legal entity.",
    );
  }
  if (input.signer.lifecycleStatus !== "active") {
    throw new SignatureFoundationError(
      "AUTHORISED_SIGNER_PROFILE_INELIGIBLE",
      "AuthorisedSignerProfile lifecycle status does not permit signing.",
    );
  }
  if (input.signedAt.getTime() < input.signer.effectiveFrom.getTime()) {
    throw new SignatureFoundationError(
      "AUTHORISED_SIGNER_EFFECTIVE_WINDOW_VIOLATION",
      "signedAt is before AuthorisedSignerProfile effectiveFrom.",
    );
  }
  if (
    input.signer.effectiveTo != null &&
    input.signedAt.getTime() > input.signer.effectiveTo.getTime()
  ) {
    throw new SignatureFoundationError(
      "AUTHORISED_SIGNER_EFFECTIVE_WINDOW_VIOLATION",
      "signedAt is after AuthorisedSignerProfile effectiveTo.",
    );
  }
  return input.signer.signingMethod as AuthorisedSignerSigningMethod;
}

async function loadIssuedFinancialDocument(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<FinancialDocument> {
  const document = await loadFinancialDocument(context, financialDocumentId);
  if (!document) {
    throw new SignatureFoundationError(
      "FINANCIAL_DOCUMENT_NOT_FOUND",
      `FinancialDocument not found: ${financialDocumentId}`,
    );
  }
  if (document.status !== "ISSUED") {
    throw new SignatureFoundationError(
      "FINANCIAL_DOCUMENT_NOT_FOUND",
      "FinancialDocument is not ISSUED.",
    );
  }
  return document;
}

/**
 * Operator-safe catch-up for pre-existing ISSUED documents missing SignatureArtifact.
 */
export async function ensurePendingSignatureArtifactForFinancialDocument(
  context: PersistenceTransactionContext,
  input: {
    financialDocumentId: string;
    now: Date;
  },
): Promise<SignatureArtifact> {
  const document = await loadIssuedFinancialDocument(
    context,
    input.financialDocumentId,
  );
  const signatureRequirement = resolveSignatureRequirementForDocumentType(
    document.documentType,
  );
  return ensureSignatureArtifactPending(context, {
    financialDocumentId: document.id,
    signatureRequirement,
    now: input.now,
  });
}

export async function listOutstandingSignatureWork(
  context: PersistenceQueryContext,
  input: { limit?: number } = {},
): Promise<readonly OutstandingSignatureWorkItem[]> {
  const limit = input.limit ?? 100;
  const result = await context.db.execute<{
    financial_document_id: string;
    document_type: FinancialDocumentStatutoryType;
    statutory_document_number: string;
    issue_at: Date;
    signature_artifact_status: "ABSENT" | "PENDING" | "FAILED_RETRYABLE";
  }>(sql`
    select
      fd.id as financial_document_id,
      fd.document_type,
      fd.statutory_document_number,
      fd.issue_at,
      case
        when sa.id is null then 'ABSENT'
        else sa.status::text
      end as signature_artifact_status
    from app.financial_documents fd
    left join app.signature_artifacts sa
      on sa.financial_document_id = fd.id
    where fd.status = 'ISSUED'
      and fd.document_type in (
        'TAX_INVOICE',
        'RECEIPT_VOUCHER',
        'REFUND_VOUCHER',
        'CREDIT_NOTE'
      )
      and (
        sa.id is null
        or sa.status in ('PENDING', 'FAILED_RETRYABLE')
      )
    order by fd.issue_at asc, fd.statutory_document_number asc, fd.id asc
    limit ${limit}
  `);

  return Object.freeze(
    result.rows.map((row) =>
      Object.freeze({
        financialDocumentId: row.financial_document_id,
        documentType: row.document_type,
        statutoryDocumentNumber: row.statutory_document_number,
        issueAt: row.issue_at,
        signatureArtifactStatus: row.signature_artifact_status,
      }),
    ),
  );
}

/**
 * Internal unsigned PDF export for operator signing workflow.
 * Does not mutate SignatureArtifact or persist signed bytes.
 */
export async function exportUnsignedFinancialDocumentPdf(
  persistence: Persistence,
  financialDocumentId: string,
): Promise<FinancialDocumentArtifact> {
  return persistence.withContext(async (ctx) => {
    const document = await loadIssuedFinancialDocument(ctx, financialDocumentId);
    resolveSignatureRequirementForDocumentType(document.documentType);

    let priorFinancialDocument: FinancialDocument | null = null;
    if (document.priorFinancialDocumentId) {
      priorFinancialDocument = await loadFinancialDocument(
        ctx,
        document.priorFinancialDocumentId,
      );
      if (!priorFinancialDocument) {
        throw new SignatureFoundationError(
          "UPSTREAM_REFERENCE_INVALID",
          "Sealed prior Financial Document could not be loaded for unsigned export.",
        );
      }
    }

    return generateFinancialDocumentArtifact(document, {
      ...(priorFinancialDocument ? { priorFinancialDocument } : {}),
    });
  });
}

export async function uploadManualSignedPdf(
  context: PersistenceTransactionContext,
  input: ManualSignedPdfUploadInput,
): Promise<ManualSignedPdfUploadResult> {
  if (!input.attestSignedArtifact) {
    throw new SignatureFoundationError(
      "MANUAL_UPLOAD_ATTESTATION_REQUIRED",
      "Manual signed PDF upload requires explicit operator attestation.",
    );
  }

  const signatureProfile = input.signatureProfile.trim();
  if (!signatureProfile) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      "signatureProfile is required for manual signed upload.",
    );
  }

  const document = await loadIssuedFinancialDocument(
    context,
    input.financialDocumentId,
  );
  const signatureRequirement = resolveSignatureRequirementForDocumentType(
    document.documentType,
  );

  validateSignedPdfContainer(input.signedPdfBytes, input.maxPdfBytes);
  const contentHash = hashBytes(input.signedPdfBytes);

  const signer = await findAuthorisedSignerProfileById(
    context,
    input.authorisedSignerProfileId,
  );
  if (!signer) {
    throw new SignatureFoundationError(
      "AUTHORISED_SIGNER_PROFILE_NOT_FOUND",
      `AuthorisedSignerProfile not found: ${input.authorisedSignerProfileId}`,
    );
  }
  const signingMethod = assertSignerProfileEligible({
    signer,
    legalEntityId: document.legalEntityId,
    signedAt: input.signedAt,
  });

  await context.db.execute(sql`
    select id
    from app.financial_documents
    where id = ${document.id}::uuid
    for update
  `);

  await ensureSignatureArtifactPending(context, {
    financialDocumentId: document.id,
    signatureRequirement,
    now: input.now,
  });

  const locked = await lockSignatureArtifactForUpdate(context, document.id);
  if (!locked) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_NOT_FOUND",
      `SignatureArtifact not found for FinancialDocument ${document.id}.`,
    );
  }

  if (locked.status === "SIGNED") {
    const mapped = mapSignatureArtifactRow(locked);
    const sameAuthority =
      mapped.artifactContentHash === contentHash &&
      mapped.authorisedSignerProfileId === signer.id &&
      mapped.signedAt?.getTime() === input.signedAt.getTime() &&
      mapped.signatureProfile === signatureProfile &&
      mapped.operatorAttestedSignedArtifact === true;
    if (sameAuthority && mapped.immutableObjectReference) {
      await verifyExactSignedArtifactHash(context, {
        objectReference: mapped.immutableObjectReference,
        expectedHash: contentHash,
      });
      return Object.freeze({
        signatureArtifact: mapped,
        objectReference: mapped.immutableObjectReference,
        contentHash,
        contentLength: BigInt(input.signedPdfBytes.byteLength),
        idempotentReplay: true,
      });
    }
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_CONFLICT",
      "Conflicting manual signed upload rejected — SIGNED authority already exists.",
    );
  }

  const stored = await putImmutableSignedArtifactBytes(context, {
    bytes: input.signedPdfBytes,
    now: input.now,
  });

  const sealed = await sealSignatureArtifactSigned(context, {
    financialDocumentId: document.id,
    artifactContentHash: stored.contentHash,
    immutableObjectReference: stored.objectReference,
    signedAt: input.signedAt,
    signatureMethod: signingMethod,
    authorisedSignerProfileId: signer.id,
    sealedSignerDisplayName: signer.signerDisplayName,
    sealedAuthorisationReference: signer.authorisationReference,
    sealedSigningMethod: signingMethod,
    sealedExternalSignerIdentity: signer.externalSignerIdentity,
    signatureProfile,
    operatorAttestedSignedArtifact: true,
    now: input.now,
  });

  if (sealed.operatorAttestedSignedArtifact !== true) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      "Manual signed PDF SIGNED authority requires durable operator attestation.",
    );
  }

  return Object.freeze({
    signatureArtifact: sealed,
    objectReference: stored.objectReference,
    contentHash: stored.contentHash,
    contentLength: stored.contentLength,
    idempotentReplay: false,
  });
}

export async function loadSignedFinancialDocumentArtifactForCustomer(
  context: PersistenceQueryContext,
  document: FinancialDocument,
): Promise<FinancialDocumentArtifact> {
  const signatureRequirement = resolveSignatureRequirementForDocumentType(
    document.documentType,
  );
  if (signatureRequirement !== "REQUIRED") {
    return generateFinancialDocumentArtifact(document);
  }

  const artifact = await loadSignatureArtifactByFinancialDocumentId(
    context,
    document.id,
  );
  if (!artifact || artifact.status !== "SIGNED") {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_NOT_FOUND",
      "Signed statutory PDF is not available.",
    );
  }
  if (!artifact.immutableObjectReference || !artifact.artifactContentHash) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      "Signed statutory PDF authority is incomplete.",
    );
  }

  const bytes = await verifyExactSignedArtifactHash(context, {
    objectReference: artifact.immutableObjectReference,
    expectedHash: artifact.artifactContentHash,
  });

  return Object.freeze({
    mediaType: "application/pdf",
    bytes,
    byteLength: bytes.byteLength,
    sha256: artifact.artifactContentHash,
    suggestedFilename: suggestFinancialDocumentArtifactFilename(document),
  });
}

export async function hasProductionAuthorisedSignerProfile(
  context: PersistenceQueryContext,
): Promise<boolean> {
  const rows = await context.db
    .select({ id: authorisedSignerProfilesTable.id })
    .from(authorisedSignerProfilesTable)
    .where(eq(authorisedSignerProfilesTable.lifecycleStatus, "active"))
    .limit(1);
  return rows.length > 0;
}
