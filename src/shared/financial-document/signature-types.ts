/**
 * Statutory Financial Document signing foundation types (IMP-028 / D-367).
 */
import type {
  AuthorisedSignerProfileLifecycleStatus,
  AuthorisedSignerSigningMethod,
  SignatureArtifactHashAlgorithm,
  SignatureArtifactStatus,
  SignatureRequirement,
} from "./signature-constants";

export type AuthorisedSignerProfile = Readonly<{
  id: string;
  legalEntityId: string;
  signerDisplayName: string;
  authorisationReference: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  signingMethod: AuthorisedSignerSigningMethod;
  externalSignerIdentity: string | null;
  lifecycleStatus: AuthorisedSignerProfileLifecycleStatus;
  createdAt: Date;
}>;

export type SignatureArtifact = Readonly<{
  id: string;
  financialDocumentId: string;
  signatureRequirement: SignatureRequirement;
  status: SignatureArtifactStatus;
  artifactContentHashAlgorithm: SignatureArtifactHashAlgorithm | null;
  artifactContentHash: string | null;
  immutableObjectReference: string | null;
  signedAt: Date | null;
  signatureMethod: AuthorisedSignerSigningMethod | null;
  authorisedSignerProfileId: string | null;
  sealedSignerDisplayName: string | null;
  sealedAuthorisationReference: string | null;
  sealedSigningMethod: AuthorisedSignerSigningMethod | null;
  sealedExternalSignerIdentity: string | null;
  signatureProfile: string | null;
  operatorAttestedSignedArtifact: true | null;
  certificateSubject: string | null;
  certificateFingerprint: string | null;
  certificateSerial: string | null;
  certificateIssuer: string | null;
  providerTransactionReference: string | null;
  verificationEvidenceReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type SealSignatureArtifactSignedInput = Readonly<{
  financialDocumentId: string;
  artifactContentHash: string;
  artifactContentHashAlgorithm?: SignatureArtifactHashAlgorithm;
  immutableObjectReference: string;
  signedAt: Date;
  signatureMethod: AuthorisedSignerSigningMethod;
  authorisedSignerProfileId: string;
  sealedSignerDisplayName: string;
  sealedAuthorisationReference: string;
  sealedSigningMethod: AuthorisedSignerSigningMethod;
  sealedExternalSignerIdentity?: string | null;
  signatureProfile: string;
  operatorAttestedSignedArtifact?: true;
  certificateSubject?: string | null;
  certificateFingerprint?: string | null;
  certificateSerial?: string | null;
  certificateIssuer?: string | null;
  providerTransactionReference?: string | null;
  verificationEvidenceReference?: string | null;
  now: Date;
}>;
