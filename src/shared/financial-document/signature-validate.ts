/**
 * Statutory Financial Document signing foundation validation (IMP-028 / D-367).
 */
import type { FinancialDocumentStatutoryType } from "./constants";
import {
  AUTHORISED_SIGNER_SIGNING_METHODS,
  SIGNATURE_ARTIFACT_HASH_ALGORITHMS,
  SIGNATURE_ARTIFACT_STATUSES,
  SIGNATURE_REQUIREMENTS,
  SIGNATURE_REQUIRED_DOCUMENT_TYPES,
  type AuthorisedSignerSigningMethod,
  type SignatureArtifactHashAlgorithm,
  type SignatureArtifactStatus,
  type SignatureRequirement,
} from "./signature-constants";
import { SignatureFoundationError } from "./signature-errors";

/** Canonical SHA-256 digest: exactly 64 lowercase hexadecimal characters. */
export const SHA256_HEX_DIGEST_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Validate and canonicalize a SHA-256 hex digest before persistence.
 * Accepts uppercase input deterministically normalized to lowercase.
 */
/**
 * Durable operator-attestation authority is write-once true or absent.
 * False is not a persistable historical fact.
 */
export function persistableOperatorAttestedSignedArtifact(
  value: boolean | null | undefined,
): true | null {
  return value === true ? true : null;
}

export function canonicalizeSha256HexDigest(value: string): string {
  const trimmed = value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      "Artifact content hash must be exactly 64 hexadecimal characters (SHA-256).",
    );
  }
  return trimmed.toLowerCase();
}

/**
 * Fail closed when an operation depends on REJECTED semantics not bound by D-367.
 */
export function assertSignatureArtifactRejectedPolicyResolved(
  status: SignatureArtifactStatus,
): void {
  if (status === "REJECTED") {
    throw new SignatureFoundationError(
      "SIGNATURE_REJECTED_POLICY_UNRESOLVED",
      "REJECTED SignatureArtifact policy is unresolved under D-367 foundation slice.",
    );
  }
}

export function assertAuthorisedSignerSigningMethod(
  value: string,
): AuthorisedSignerSigningMethod {
  if (
    !(AUTHORISED_SIGNER_SIGNING_METHODS as readonly string[]).includes(value)
  ) {
    throw new SignatureFoundationError(
      "INVALID_SIGNING_METHOD",
      `Unsupported signing method: ${value}`,
    );
  }
  return value as AuthorisedSignerSigningMethod;
}

export function assertSignatureRequirement(value: string): SignatureRequirement {
  if (!(SIGNATURE_REQUIREMENTS as readonly string[]).includes(value)) {
    throw new SignatureFoundationError(
      "INVALID_SIGNATURE_REQUIREMENT",
      `Unsupported signature requirement: ${value}`,
    );
  }
  return value as SignatureRequirement;
}

export function assertSignatureArtifactStatus(
  value: string,
): SignatureArtifactStatus {
  if (!(SIGNATURE_ARTIFACT_STATUSES as readonly string[]).includes(value)) {
    throw new SignatureFoundationError(
      "INVALID_SIGNATURE_ARTIFACT_STATUS",
      `Unsupported SignatureArtifact status: ${value}`,
    );
  }
  return value as SignatureArtifactStatus;
}

export function assertSignatureArtifactHashAlgorithm(
  value: string,
): SignatureArtifactHashAlgorithm {
  if (!(SIGNATURE_ARTIFACT_HASH_ALGORITHMS as readonly string[]).includes(value)) {
    throw new SignatureFoundationError(
      "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE",
      `Unsupported artifact content hash algorithm: ${value}`,
    );
  }
  return value as SignatureArtifactHashAlgorithm;
}

export function assertEffectiveDateRange(input: {
  effectiveFrom: Date;
  effectiveTo: Date | null | undefined;
}): void {
  if (
    input.effectiveTo != null &&
    input.effectiveTo.getTime() <= input.effectiveFrom.getTime()
  ) {
    throw new SignatureFoundationError(
      "INVALID_EFFECTIVE_DATE_RANGE",
      "effectiveTo must be strictly after effectiveFrom when present.",
    );
  }
}

/**
 * Resolve BOBA signature requirement for a statutory document type.
 * Does not create artifacts — exposes policy only.
 *
 * BILL_OF_SUPPLY is fail-closed: D-367 does not decide its policy.
 */
export function resolveSignatureRequirementForDocumentType(
  documentType: FinancialDocumentStatutoryType,
): SignatureRequirement {
  if (
    (SIGNATURE_REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(
      documentType,
    )
  ) {
    return "REQUIRED";
  }
  if (documentType === "BILL_OF_SUPPLY") {
    throw new SignatureFoundationError(
      "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED",
      "BILL_OF_SUPPLY signature requirement policy is unresolved under D-367.",
    );
  }
  throw new SignatureFoundationError(
    "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED",
    `Signature requirement policy unresolved for document type: ${documentType}.`,
  );
}

/**
 * Reject caller-supplied signatureRequirement when it conflicts with D-367 policy.
 */
export function assertSignatureRequirementMatchesDocumentTypePolicy(input: {
  documentType: FinancialDocumentStatutoryType;
  signatureRequirement: SignatureRequirement;
}): SignatureRequirement {
  const authoritative = resolveSignatureRequirementForDocumentType(
    input.documentType,
  );
  if (authoritative !== input.signatureRequirement) {
    throw new SignatureFoundationError(
      "SIGNATURE_REQUIREMENT_POLICY_CONFLICT",
      `Caller-supplied signatureRequirement ${input.signatureRequirement} conflicts with D-367 policy (${authoritative}) for ${input.documentType}.`,
    );
  }
  return authoritative;
}
