/**
 * Drizzle schema for statutory Financial Document signing foundation (IMP-028 / D-367).
 *
 * AuthorisedSignerProfile: effective-dated signer authority separate from IssuerProfile.
 * SignatureArtifact: one durable authority slot per FinancialDocument.
 * No private keys, secrets, or provider-specific storage paths.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";
import { legalEntitiesTable } from "./organizations";
import { financialDocumentsTable } from "./financial-document";

export const authorisedSignerProfilesTable = appSchema.table(
  "authorised_signer_profiles",
  {
    id: uuid("id").primaryKey(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    signerDisplayName: text("signer_display_name").notNull(),
    authorisationReference: text("authorisation_reference").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    signingMethod: text("signing_method").notNull(),
    externalSignerIdentity: text("external_signer_identity"),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "authorised_signer_profiles_legal_entity_fk",
      columns: [table.legalEntityId],
      foreignColumns: [legalEntitiesTable.id],
    }).onDelete("restrict"),
    index("authorised_signer_profiles_legal_entity_effective_idx").on(
      table.legalEntityId,
      table.effectiveFrom,
    ),
    check(
      "authorised_signer_profiles_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    check(
      "authorised_signer_profiles_signing_method_check",
      sql`${table.signingMethod} in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')`,
    ),
    check(
      "authorised_signer_profiles_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    check(
      "authorised_signer_profiles_signer_display_name_nonempty_check",
      sql`length(trim(${table.signerDisplayName})) > 0`,
    ),
    check(
      "authorised_signer_profiles_authorisation_reference_nonempty_check",
      sql`length(trim(${table.authorisationReference})) > 0`,
    ),
  ],
);

export const signatureArtifactsTable = appSchema.table(
  "signature_artifacts",
  {
    id: uuid("id").primaryKey(),
    financialDocumentId: uuid("financial_document_id").notNull(),
    signatureRequirement: text("signature_requirement").notNull(),
    status: text("status").notNull(),
    artifactContentHashAlgorithm: text("artifact_content_hash_algorithm"),
    artifactContentHash: text("artifact_content_hash"),
    immutableObjectReference: text("immutable_object_reference"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signatureMethod: text("signature_method"),
    authorisedSignerProfileId: uuid("authorised_signer_profile_id"),
    sealedSignerDisplayName: text("sealed_signer_display_name"),
    sealedAuthorisationReference: text("sealed_authorisation_reference"),
    sealedSigningMethod: text("sealed_signing_method"),
    sealedExternalSignerIdentity: text("sealed_external_signer_identity"),
    signatureProfile: text("signature_profile"),
    operatorAttestedSignedArtifact: boolean("operator_attested_signed_artifact"),
    certificateSubject: text("certificate_subject"),
    certificateFingerprint: text("certificate_fingerprint"),
    certificateSerial: text("certificate_serial"),
    certificateIssuer: text("certificate_issuer"),
    providerTransactionReference: text("provider_transaction_reference"),
    verificationEvidenceReference: text("verification_evidence_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "signature_artifacts_financial_document_fk",
      columns: [table.financialDocumentId],
      foreignColumns: [financialDocumentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "signature_artifacts_authorised_signer_profile_fk",
      columns: [table.authorisedSignerProfileId],
      foreignColumns: [authorisedSignerProfilesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("signature_artifacts_financial_document_uidx").on(
      table.financialDocumentId,
    ),
    check(
      "signature_artifacts_signature_requirement_check",
      sql`${table.signatureRequirement} in ('REQUIRED', 'NOT_REQUIRED')`,
    ),
    check(
      "signature_artifacts_status_check",
      sql`${table.status} in ('PENDING', 'SIGNED', 'FAILED_RETRYABLE', 'REJECTED')`,
    ),
    check(
      "signature_artifacts_hash_algorithm_check",
      sql`${table.artifactContentHashAlgorithm} is null
        or ${table.artifactContentHashAlgorithm} = 'SHA-256'`,
    ),
    check(
      "signature_artifacts_artifact_content_hash_format_check",
      sql`${table.artifactContentHash} is null
        or ${table.artifactContentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "signature_artifacts_signed_success_completeness_check",
      sql`(${table.status} <> 'SIGNED')
        or (
          ${table.artifactContentHashAlgorithm} is not null
          and ${table.artifactContentHash} is not null
          and length(trim(${table.artifactContentHash})) > 0
          and ${table.immutableObjectReference} is not null
          and length(trim(${table.immutableObjectReference})) > 0
          and ${table.signedAt} is not null
          and ${table.signatureMethod} is not null
          and ${table.authorisedSignerProfileId} is not null
          and ${table.sealedSignerDisplayName} is not null
          and length(trim(${table.sealedSignerDisplayName})) > 0
          and ${table.sealedAuthorisationReference} is not null
          and length(trim(${table.sealedAuthorisationReference})) > 0
          and ${table.sealedSigningMethod} is not null
          and ${table.signatureProfile} is not null
          and length(trim(${table.signatureProfile})) > 0
        )`,
    ),
    check(
      "signature_artifacts_non_signed_success_fields_absent_check",
      sql`(${table.status} = 'SIGNED')
        or (
          ${table.artifactContentHashAlgorithm} is null
          and ${table.artifactContentHash} is null
          and ${table.immutableObjectReference} is null
          and ${table.signedAt} is null
          and ${table.signatureMethod} is null
          and ${table.authorisedSignerProfileId} is null
          and ${table.sealedSignerDisplayName} is null
          and ${table.sealedAuthorisationReference} is null
          and ${table.sealedSigningMethod} is null
          and ${table.sealedExternalSignerIdentity} is null
          and ${table.signatureProfile} is null
          and ${table.certificateSubject} is null
          and ${table.certificateFingerprint} is null
          and ${table.certificateSerial} is null
          and ${table.certificateIssuer} is null
          and ${table.providerTransactionReference} is null
          and ${table.verificationEvidenceReference} is null
        )`,
    ),
    check(
      "signature_artifacts_signature_method_check",
      sql`${table.signatureMethod} is null
        or ${table.signatureMethod} in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')`,
    ),
    check(
      "signature_artifacts_sealed_signing_method_check",
      sql`${table.sealedSigningMethod} is null
        or ${table.sealedSigningMethod} in ('DSC', 'ESIGN', 'REMOTE_KEY_STORAGE')`,
    ),
    check(
      "signature_artifacts_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "signature_artifacts_operator_attestation_true_when_present_check",
      sql`${table.operatorAttestedSignedArtifact} is null
        or ${table.operatorAttestedSignedArtifact} = true`,
    ),
    check(
      "signature_artifacts_operator_attestation_absent_unless_signed_check",
      sql`${table.status} = 'SIGNED'
        or ${table.operatorAttestedSignedArtifact} is null`,
    ),
  ],
);
