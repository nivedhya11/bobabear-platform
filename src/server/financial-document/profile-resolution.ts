/**
 * Effective issuer/tax profile resolution for Financial Document issuance
 * (IMP-028 Slice 2 / D-365).
 *
 * Eligibility is fail-closed:
 * - lifecycle must be active (draft is never auto-activated)
 * - issueAt within [validFrom, validTo)
 * - requested document type enabled on the profile
 * - 0 eligible → fail; 1 → use; >1 → ambiguous fail
 */
import {
  FinancialDocumentError,
  type FinancialDocumentIssuerProfile,
  type FinancialDocumentStatutoryType,
} from "../../shared/financial-document";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import {
  listIssuerProfilesForLegalEntity,
  lockAllIssuerProfilesForLegalEntityForShare,
  lockLegalEntityForIssuerProfileSetStabilization,
  mapIssuerProfileRow,
} from "./repository";

function isProfileEffectiveAt(
  profile: FinancialDocumentIssuerProfile,
  issueAt: Date,
): boolean {
  if (profile.lifecycleStatus !== "active") {
    return false;
  }
  if (profile.validFrom.getTime() > issueAt.getTime()) {
    return false;
  }
  if (profile.validTo !== null && profile.validTo.getTime() <= issueAt.getTime()) {
    return false;
  }
  return true;
}

function profileEnablesDocumentType(
  profile: FinancialDocumentIssuerProfile,
  documentType: FinancialDocumentStatutoryType,
): boolean {
  switch (documentType) {
    case "TAX_INVOICE":
      return profile.enableTaxInvoice;
    case "BILL_OF_SUPPLY":
      return profile.enableBillOfSupply;
    case "RECEIPT_VOUCHER":
      return profile.enableReceiptVoucher;
    case "REFUND_VOUCHER":
      return profile.enableRefundVoucher;
    case "CREDIT_NOTE":
      return profile.enableCreditNote;
    default: {
      const _exhaustive: never = documentType;
      return _exhaustive;
    }
  }
}

/**
 * Fail closed when registered statutory issuance lacks sealed supplier facts.
 * Does not invent GSTIN / address / scheme defaults.
 */
export function assertIssuerProfileCompleteForIssuance(
  profile: FinancialDocumentIssuerProfile,
  documentType: FinancialDocumentStatutoryType,
  lines: readonly Readonly<{
    sacCode: string | null;
    hsnCode: string | null;
  }>[],
): void {
  if (profile.registrationStatus === "registered") {
    if (!profile.gstin || !profile.gstLegalName || !profile.stateCode) {
      throw new FinancialDocumentError(
        "ISSUER_PROFILE_INCOMPLETE",
        "Registered issuer profile is missing GSTIN, legal name, or state code required for issuance.",
      );
    }
    if (!profile.registrationScheme) {
      throw new FinancialDocumentError(
        "ISSUER_PROFILE_INCOMPLETE",
        "Registered issuer profile is missing registration scheme required for issuance.",
      );
    }
    if (!profile.registeredAddressLine1) {
      throw new FinancialDocumentError(
        "ISSUER_PROFILE_INCOMPLETE",
        "Registered issuer profile is missing registered address required for issuance.",
      );
    }
  }

  if (
    documentType === "TAX_INVOICE" ||
    documentType === "CREDIT_NOTE" ||
    documentType === "BILL_OF_SUPPLY"
  ) {
    if (profile.registrationStatus == null) {
      throw new FinancialDocumentError(
        "ISSUER_PROFILE_INCOMPLETE",
        `${documentType} issuance requires issuer registration_status to be configured.`,
      );
    }
  }

  for (const line of lines) {
    const sac = line.sacCode ?? profile.defaultSacCode;
    const hsn = line.hsnCode ?? profile.defaultHsnCode;
    if (!sac && !hsn) {
      throw new FinancialDocumentError(
        "ISSUER_PROFILE_INCOMPLETE",
        "Issuance requires SAC or HSN on each line (or a profile default).",
      );
    }
  }
}

export function formatSupplierRegisteredAddress(
  profile: FinancialDocumentIssuerProfile,
): string | null {
  const parts = [
    profile.registeredAddressLine1,
    profile.registeredAddressLine2,
    profile.registeredAddressCity,
    profile.registeredAddressPostalCode,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export async function resolveEffectiveIssuerProfileForIssuance(
  context: PersistenceQueryContext,
  input: {
    legalEntityId: string;
    documentType: FinancialDocumentStatutoryType;
    issueAt: Date;
  },
): Promise<FinancialDocumentIssuerProfile> {
  const rows = await listIssuerProfilesForLegalEntity(
    context,
    input.legalEntityId,
  );
  return selectEffectiveIssuerProfile(rows.map(mapIssuerProfileRow), input);
}

function selectEffectiveIssuerProfile(
  profiles: readonly FinancialDocumentIssuerProfile[],
  input: {
    legalEntityId: string;
    documentType: FinancialDocumentStatutoryType;
    issueAt: Date;
  },
): FinancialDocumentIssuerProfile {
  const effective = profiles.filter((profile) =>
    isProfileEffectiveAt(profile, input.issueAt),
  );

  if (effective.length === 0) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_NOT_FOUND",
      `No active issuer profile is effective for legal entity ${input.legalEntityId} at issuance time.`,
    );
  }

  if (effective.length > 1) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_AMBIGUOUS",
      `Multiple active issuer profiles are simultaneously eligible for legal entity ${input.legalEntityId}; configuration is ambiguous.`,
    );
  }

  const profile = effective[0]!;
  if (profile.legalEntityId !== input.legalEntityId) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_NOT_ELIGIBLE",
      "Issuer profile legal entity does not match issuance legal entity.",
    );
  }
  if (!profileEnablesDocumentType(profile, input.documentType)) {
    throw new FinancialDocumentError(
      "DOCUMENT_TYPE_DISABLED",
      `${input.documentType} is not enabled on the effective issuer profile.`,
    );
  }

  return profile;
}

/**
 * Resolve the effective issuer profile under a transactionally stable set.
 *
 * Lock order:
 * 1. legal_entities FOR UPDATE — blocks concurrent profile INSERT (FK KEY SHARE)
 * 2. all issuer profiles FOR SHARE — blocks eligibility-changing UPDATEs
 * 3. resolve exactly-one eligible profile from that frozen set
 *
 * Historical idempotent return must not call this path.
 */
export async function resolveAndLockEffectiveIssuerProfileForIssuance(
  context: PersistenceTransactionContext,
  input: {
    legalEntityId: string;
    documentType: FinancialDocumentStatutoryType;
    issueAt: Date;
  },
): Promise<FinancialDocumentIssuerProfile> {
  assertTransactionContext(context, "resolveAndLockEffectiveIssuerProfileForIssuance");
  await lockLegalEntityForIssuerProfileSetStabilization(
    context,
    input.legalEntityId,
  );
  const lockedRows = await lockAllIssuerProfilesForLegalEntityForShare(
    context,
    input.legalEntityId,
  );
  const profiles = lockedRows.map(mapIssuerProfileRow);
  return selectEffectiveIssuerProfile(profiles, input);
}
