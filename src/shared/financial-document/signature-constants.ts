/**
 * Statutory Financial Document signing foundation constants (IMP-028 / D-367).
 */

import type { FinancialDocumentStatutoryType } from "./constants";

export const AUTHORISED_SIGNER_PROFILE_LIFECYCLE_STATUSES = [
  "draft",
  "active",
  "retired",
] as const;

export type AuthorisedSignerProfileLifecycleStatus =
  (typeof AUTHORISED_SIGNER_PROFILE_LIFECYCLE_STATUSES)[number];

/** Permitted signing mechanisms (D-367 custody boundaries). */
export const AUTHORISED_SIGNER_SIGNING_METHODS = [
  "DSC",
  "ESIGN",
  "REMOTE_KEY_STORAGE",
] as const;

export type AuthorisedSignerSigningMethod =
  (typeof AUTHORISED_SIGNER_SIGNING_METHODS)[number];

export const SIGNATURE_REQUIREMENTS = ["REQUIRED", "NOT_REQUIRED"] as const;

export type SignatureRequirement = (typeof SIGNATURE_REQUIREMENTS)[number];

export const SIGNATURE_ARTIFACT_STATUSES = [
  "PENDING",
  "SIGNED",
  "FAILED_RETRYABLE",
  "REJECTED",
] as const;

export type SignatureArtifactStatus =
  (typeof SIGNATURE_ARTIFACT_STATUSES)[number];

/** Constrained content-hash authority for sealed signed bytes. */
export const SIGNATURE_ARTIFACT_HASH_ALGORITHMS = ["SHA-256"] as const;

export type SignatureArtifactHashAlgorithm =
  (typeof SIGNATURE_ARTIFACT_HASH_ALGORITHMS)[number];

/** Signable states that may transition to SIGNED. */
export const SIGNATURE_ARTIFACT_SIGNABLE_STATUSES = [
  "PENDING",
  "FAILED_RETRYABLE",
] as const satisfies readonly SignatureArtifactStatus[];

/**
 * BOBA product policy (D-367): statutory types requiring SignatureArtifact signing.
 *
 * Manual/attended signing at launch does not relax signatureRequirement — it defers
 * signing automation only. TAX_INVOICE is REQUIRED_BY_BOBA_PRODUCT_POLICY (not a
 * universal GST mandate claim). BILL_OF_SUPPLY is intentionally absent — D-367 does
 * not decide its signing policy.
 */
export const SIGNATURE_REQUIRED_DOCUMENT_TYPES = [
  "TAX_INVOICE",
  "RECEIPT_VOUCHER",
  "REFUND_VOUCHER",
  "CREDIT_NOTE",
] as const satisfies readonly FinancialDocumentStatutoryType[];
