/**
 * Statutory Financial Document signing persistence (IMP-028 / D-367).
 *
 * AuthorisedSignerProfile + SignatureArtifact foundation only.
 * No provider calls, PDF generation, or storage writes.
 */
import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  authorisedSignerProfilesTable,
  signatureArtifactsTable,
} from "../../platform/database/schema/financial-document-signature";
import { financialDocumentsTable } from "../../platform/database/schema/financial-document";
import {
  assertAuthorisedSignerSigningMethod,
  assertEffectiveDateRange,
  assertSignatureArtifactHashAlgorithm,
  assertSignatureArtifactRejectedPolicyResolved,
  assertSignatureRequirement,
  assertSignatureRequirementMatchesDocumentTypePolicy,
  canonicalizeSha256HexDigest,
  persistableOperatorAttestedSignedArtifact,
  type AuthorisedSignerProfile,
  type AuthorisedSignerProfileLifecycleStatus,
  type AuthorisedSignerSigningMethod,
  type SealSignatureArtifactSignedInput,
  type SignatureArtifact,
  type SignatureArtifactStatus,
  type SignatureRequirement,
  SignatureFoundationError,
  type FinancialDocumentStatutoryType,
} from "../../shared/financial-document";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { extractPostgresDriverCode } from "./repository";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type AuthorisedSignerProfileRow =
  typeof authorisedSignerProfilesTable.$inferSelect;
export type SignatureArtifactRow = typeof signatureArtifactsTable.$inferSelect;

export function newAuthorisedSignerProfileId(): string {
  return randomUUID();
}

export function newSignatureArtifactId(): string {
  return randomUUID();
}

export function mapAuthorisedSignerProfileRow(
  row: AuthorisedSignerProfileRow,
): AuthorisedSignerProfile {
  return Object.freeze({
    id: row.id,
    legalEntityId: row.legalEntityId,
    signerDisplayName: row.signerDisplayName,
    authorisationReference: row.authorisationReference,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    signingMethod: assertAuthorisedSignerSigningMethod(row.signingMethod),
    externalSignerIdentity: row.externalSignerIdentity,
    lifecycleStatus:
      row.lifecycleStatus as AuthorisedSignerProfileLifecycleStatus,
    createdAt: row.createdAt,
  });
}

export function mapSignatureArtifactRow(row: SignatureArtifactRow): SignatureArtifact {
  return Object.freeze({
    id: row.id,
    financialDocumentId: row.financialDocumentId,
    signatureRequirement: assertSignatureRequirement(row.signatureRequirement),
    status: row.status as SignatureArtifactStatus,
    artifactContentHashAlgorithm:
      row.artifactContentHashAlgorithm as SignatureArtifact["artifactContentHashAlgorithm"],
    artifactContentHash: row.artifactContentHash,
    immutableObjectReference: row.immutableObjectReference,
    signedAt: row.signedAt,
    signatureMethod: row.signatureMethod
      ? assertAuthorisedSignerSigningMethod(row.signatureMethod)
      : null,
    authorisedSignerProfileId: row.authorisedSignerProfileId,
    sealedSignerDisplayName: row.sealedSignerDisplayName,
    sealedAuthorisationReference: row.sealedAuthorisationReference,
    sealedSigningMethod: row.sealedSigningMethod
      ? assertAuthorisedSignerSigningMethod(row.sealedSigningMethod)
      : null,
    sealedExternalSignerIdentity: row.sealedExternalSignerIdentity,
    signatureProfile: row.signatureProfile,
    operatorAttestedSignedArtifact:
      persistableOperatorAttestedSignedArtifact(
        row.operatorAttestedSignedArtifact,
      ),
    certificateSubject: row.certificateSubject,
    certificateFingerprint: row.certificateFingerprint,
    certificateSerial: row.certificateSerial,
    certificateIssuer: row.certificateIssuer,
    providerTransactionReference: row.providerTransactionReference,
    verificationEvidenceReference: row.verificationEvidenceReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function findAuthorisedSignerProfileById(
  context: PersistenceQueryContext,
  profileId: string,
): Promise<AuthorisedSignerProfileRow | null> {
  assertApplicationRole(context, "findAuthorisedSignerProfileById");
  const rows = await context.db
    .select()
    .from(authorisedSignerProfilesTable)
    .where(eq(authorisedSignerProfilesTable.id, profileId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAuthorisedSignerProfilesForLegalEntity(
  context: PersistenceQueryContext,
  legalEntityId: string,
): Promise<readonly AuthorisedSignerProfileRow[]> {
  assertApplicationRole(context, "listAuthorisedSignerProfilesForLegalEntity");
  return context.db
    .select()
    .from(authorisedSignerProfilesTable)
    .where(eq(authorisedSignerProfilesTable.legalEntityId, legalEntityId))
    .orderBy(asc(authorisedSignerProfilesTable.effectiveFrom));
}

/**
 * Load signer profiles effective at `at` for a legal entity.
 * Does not invent automatic signer-selection policy beyond effective dating.
 */
export async function listEffectiveAuthorisedSignerProfilesForLegalEntity(
  context: PersistenceQueryContext,
  input: {
    legalEntityId: string;
    at: Date;
  },
): Promise<readonly AuthorisedSignerProfileRow[]> {
  assertApplicationRole(context, "listEffectiveAuthorisedSignerProfilesForLegalEntity");
  return context.db
    .select()
    .from(authorisedSignerProfilesTable)
    .where(
      and(
        eq(authorisedSignerProfilesTable.legalEntityId, input.legalEntityId),
        lte(authorisedSignerProfilesTable.effectiveFrom, input.at),
        or(
          isNull(authorisedSignerProfilesTable.effectiveTo),
          gte(authorisedSignerProfilesTable.effectiveTo, input.at),
        ),
      ),
    )
    .orderBy(asc(authorisedSignerProfilesTable.effectiveFrom));
}

export async function insertAuthorisedSignerProfile(
  context: PersistenceTransactionContext,
  input: {
    legalEntityId: string;
    signerDisplayName: string;
    authorisationReference: string;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    signingMethod: AuthorisedSignerSigningMethod;
    externalSignerIdentity?: string | null;
    lifecycleStatus?: AuthorisedSignerProfileLifecycleStatus;
    now: Date;
  },
): Promise<AuthorisedSignerProfileRow> {
  assertTransactionContext(context, "insertAuthorisedSignerProfile");
  assertEffectiveDateRange({
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
  });
  assertAuthorisedSignerSigningMethod(input.signingMethod);

  const id = newAuthorisedSignerProfileId();
  const rows = await context.db
    .insert(authorisedSignerProfilesTable)
    .values({
      id,
      legalEntityId: input.legalEntityId,
      signerDisplayName: input.signerDisplayName,
      authorisationReference: input.authorisationReference,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      signingMethod: input.signingMethod,
      externalSignerIdentity: input.externalSignerIdentity ?? null,
      lifecycleStatus: input.lifecycleStatus ?? "draft",
      createdAt: input.now,
    })
    .returning();
  return rows[0]!;
}

export async function findSignatureArtifactByFinancialDocumentId(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<SignatureArtifactRow | null> {
  assertApplicationRole(context, "findSignatureArtifactByFinancialDocumentId");
  const rows = await context.db
    .select()
    .from(signatureArtifactsTable)
    .where(eq(signatureArtifactsTable.financialDocumentId, financialDocumentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadSignatureArtifactByFinancialDocumentId(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<SignatureArtifact | null> {
  const row = await findSignatureArtifactByFinancialDocumentId(
    context,
    financialDocumentId,
  );
  return row ? mapSignatureArtifactRow(row) : null;
}

/**
 * Create or return the one durable SignatureArtifact authority for a FinancialDocument.
 * Idempotent: repeated ensure converges on the same row.
 */
export async function ensureSignatureArtifactPending(
  context: PersistenceTransactionContext,
  input: {
    financialDocumentId: string;
    signatureRequirement: SignatureRequirement;
    now: Date;
  },
): Promise<SignatureArtifact> {
  assertTransactionContext(context, "ensureSignatureArtifactPending");
  assertSignatureRequirement(input.signatureRequirement);

  const document = await context.db
    .select({
      id: financialDocumentsTable.id,
      documentType: financialDocumentsTable.documentType,
    })
    .from(financialDocumentsTable)
    .where(eq(financialDocumentsTable.id, input.financialDocumentId))
    .limit(1);
  if (!document[0]) {
    throw new SignatureFoundationError(
      "FINANCIAL_DOCUMENT_NOT_FOUND",
      `FinancialDocument not found: ${input.financialDocumentId}`,
    );
  }

  assertSignatureRequirementMatchesDocumentTypePolicy({
    documentType: document[0].documentType as FinancialDocumentStatutoryType,
    signatureRequirement: input.signatureRequirement,
  });

  const existing = await findSignatureArtifactByFinancialDocumentId(
    context,
    input.financialDocumentId,
  );
  if (existing) {
    if (existing.status === "SIGNED") {
      return mapSignatureArtifactRow(existing);
    }
    assertSignatureArtifactRejectedPolicyResolved(
      existing.status as SignatureArtifactStatus,
    );
    if (existing.signatureRequirement !== input.signatureRequirement) {
      throw new SignatureFoundationError(
        "SIGNATURE_ARTIFACT_IDEMPOTENCY_CONFLICT",
        `SignatureArtifact requirement mismatch for FinancialDocument ${input.financialDocumentId}.`,
      );
    }
    return mapSignatureArtifactRow(existing);
  }

  const id = newSignatureArtifactId();
  try {
    const rows = await context.db
      .insert(signatureArtifactsTable)
      .values({
        id,
        financialDocumentId: input.financialDocumentId,
        signatureRequirement: input.signatureRequirement,
        status: "PENDING",
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    return mapSignatureArtifactRow(rows[0]!);
  } catch (error) {
    const driverCode = extractPostgresDriverCode(error);
    const message =
      error instanceof Error
        ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
        : String(error);
    const isUnique =
      driverCode === "23505" || /duplicate key value/i.test(message);
    if (
      isUnique &&
      (/signature_artifacts_financial_document_uidx/i.test(message) ||
        /Key \(financial_document_id\)/i.test(message))
    ) {
      const raced = await findSignatureArtifactByFinancialDocumentId(
        context,
        input.financialDocumentId,
      );
      if (!raced) {
        throw error;
      }
      if (raced.status === "SIGNED") {
        return mapSignatureArtifactRow(raced);
      }
      assertSignatureArtifactRejectedPolicyResolved(
        raced.status as SignatureArtifactStatus,
      );
      if (raced.signatureRequirement !== input.signatureRequirement) {
        throw new SignatureFoundationError(
          "SIGNATURE_ARTIFACT_IDEMPOTENCY_CONFLICT",
          `SignatureArtifact requirement mismatch for FinancialDocument ${input.financialDocumentId}.`,
        );
      }
      return mapSignatureArtifactRow(raced);
    }
    throw error;
  }
}

export async function transitionSignatureArtifactToFailedRetryable(
  context: PersistenceTransactionContext,
  input: {
    financialDocumentId: string;
    now: Date;
  },
): Promise<SignatureArtifact> {
  assertTransactionContext(context, "transitionSignatureArtifactToFailedRetryable");
  const locked = await lockSignatureArtifactForUpdate(context, input.financialDocumentId);
  if (!locked) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_NOT_FOUND",
      `SignatureArtifact not found for FinancialDocument ${input.financialDocumentId}.`,
    );
  }
  if (locked.status === "SIGNED") {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_IMMUTABLE",
      "Signed SignatureArtifact cannot transition to FAILED_RETRYABLE.",
    );
  }
  assertSignatureArtifactRejectedPolicyResolved(locked.status as SignatureArtifactStatus);
  if (locked.status === "FAILED_RETRYABLE") {
    const rows = await context.db
      .update(signatureArtifactsTable)
      .set({ updatedAt: input.now })
      .where(eq(signatureArtifactsTable.id, locked.id))
      .returning();
    return mapSignatureArtifactRow(rows[0]!);
  }

  const rows = await context.db
    .update(signatureArtifactsTable)
    .set({
      status: "FAILED_RETRYABLE",
      updatedAt: input.now,
    })
    .where(
      and(
        eq(signatureArtifactsTable.id, locked.id),
        eq(signatureArtifactsTable.status, "PENDING"),
      ),
    )
    .returning();
  if (rows[0]) {
    return mapSignatureArtifactRow(rows[0]);
  }
  const refreshed = await findSignatureArtifactByFinancialDocumentId(
    context,
    input.financialDocumentId,
  );
  if (!refreshed) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_NOT_FOUND",
      `SignatureArtifact not found for FinancialDocument ${input.financialDocumentId}.`,
    );
  }
  return mapSignatureArtifactRow(refreshed);
}

/**
 * Atomically seal successful signed-artifact authority.
 * At most one SIGNED success per FinancialDocument; idempotent on equivalent seal input.
 */
export async function sealSignatureArtifactSigned(
  context: PersistenceTransactionContext,
  input: SealSignatureArtifactSignedInput,
): Promise<SignatureArtifact> {
  assertTransactionContext(context, "sealSignatureArtifactSigned");
  const hashAlgorithm = assertSignatureArtifactHashAlgorithm(
    input.artifactContentHashAlgorithm ?? "SHA-256",
  );
  const artifactContentHash = canonicalizeSha256HexDigest(input.artifactContentHash);
  assertAuthorisedSignerSigningMethod(input.signatureMethod);
  assertAuthorisedSignerSigningMethod(input.sealedSigningMethod);

  if (
    !input.immutableObjectReference.trim() ||
    !input.sealedSignerDisplayName.trim() ||
    !input.sealedAuthorisationReference.trim() ||
    !input.signatureProfile.trim()
  ) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      "SIGNED transition requires complete mandatory success authority.",
    );
  }

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

  const locked = await lockSignatureArtifactForUpdate(
    context,
    input.financialDocumentId,
  );
  if (!locked) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_NOT_FOUND",
      `SignatureArtifact not found for FinancialDocument ${input.financialDocumentId}.`,
    );
  }

  const operatorAttestedSignedArtifact =
    persistableOperatorAttestedSignedArtifact(
      input.operatorAttestedSignedArtifact,
    );

  if (locked.status === "SIGNED") {
    const sameAuthority =
      locked.artifactContentHash === artifactContentHash &&
      locked.immutableObjectReference === input.immutableObjectReference &&
      locked.authorisedSignerProfileId === input.authorisedSignerProfileId &&
      locked.signedAt?.getTime() === input.signedAt.getTime() &&
      locked.signatureProfile === input.signatureProfile.trim() &&
      persistableOperatorAttestedSignedArtifact(
        locked.operatorAttestedSignedArtifact,
      ) === operatorAttestedSignedArtifact;
    if (sameAuthority) {
      return mapSignatureArtifactRow(locked);
    }
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_CONFLICT",
      "Conflicting SIGNED seal rejected — immutable authority already exists.",
    );
  }

  assertSignatureArtifactRejectedPolicyResolved(locked.status as SignatureArtifactStatus);

  const rows = await context.db
    .update(signatureArtifactsTable)
    .set({
      status: "SIGNED",
      artifactContentHashAlgorithm: hashAlgorithm,
      artifactContentHash,
      immutableObjectReference: input.immutableObjectReference,
      signedAt: input.signedAt,
      signatureMethod: input.signatureMethod,
      authorisedSignerProfileId: input.authorisedSignerProfileId,
      sealedSignerDisplayName: input.sealedSignerDisplayName,
      sealedAuthorisationReference: input.sealedAuthorisationReference,
      sealedSigningMethod: input.sealedSigningMethod,
      sealedExternalSignerIdentity: input.sealedExternalSignerIdentity ?? null,
      signatureProfile: input.signatureProfile,
      operatorAttestedSignedArtifact,
      certificateSubject: input.certificateSubject ?? null,
      certificateFingerprint: input.certificateFingerprint ?? null,
      certificateSerial: input.certificateSerial ?? null,
      certificateIssuer: input.certificateIssuer ?? null,
      providerTransactionReference: input.providerTransactionReference ?? null,
      verificationEvidenceReference: input.verificationEvidenceReference ?? null,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(signatureArtifactsTable.id, locked.id),
        sql`${signatureArtifactsTable.status} in ('PENDING', 'FAILED_RETRYABLE')`,
      ),
    )
    .returning();

  if (rows[0]) {
    return mapSignatureArtifactRow(rows[0]);
  }

  const raced = await findSignatureArtifactByFinancialDocumentId(
    context,
    input.financialDocumentId,
  );
  if (raced?.status === "SIGNED") {
    const sameAuthority =
      raced.artifactContentHash === artifactContentHash &&
      raced.immutableObjectReference === input.immutableObjectReference &&
      raced.authorisedSignerProfileId === input.authorisedSignerProfileId &&
      raced.signedAt?.getTime() === input.signedAt.getTime() &&
      raced.signatureProfile === input.signatureProfile.trim() &&
      persistableOperatorAttestedSignedArtifact(
        raced.operatorAttestedSignedArtifact,
      ) === operatorAttestedSignedArtifact;
    if (sameAuthority) {
      return mapSignatureArtifactRow(raced);
    }
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_CONFLICT",
      "Concurrent conflicting SIGNED seal rejected.",
    );
  }

  throw new SignatureFoundationError(
    "SIGNATURE_ARTIFACT_NOT_SIGNABLE",
    `SignatureArtifact is not signable for FinancialDocument ${input.financialDocumentId}.`,
  );
}

export async function lockSignatureArtifactForUpdate(
  context: PersistenceTransactionContext,
  financialDocumentId: string,
): Promise<SignatureArtifactRow | null> {
  assertTransactionContext(context, "lockSignatureArtifactForUpdate");
  await context.db.execute(sql`
    select id
    from app.signature_artifacts
    where financial_document_id = ${financialDocumentId}::uuid
    for update
  `);
  return findSignatureArtifactByFinancialDocumentId(context, financialDocumentId);
}
