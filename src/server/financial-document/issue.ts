/**
 * Atomic Financial Document issuance operation (IMP-028 Slice 2 / D-365).
 *
 * Control flow (Slice 2 correction):
 *   validate command → seal arithmetic → lookup logical key
 *   → if existing: compare request intent (historical) → return / conflict
 *   → else NEW issuance: upstream → prior → TX{ lock profile → allocate → insert }
 *
 * Historical retry does not require current issuer-profile resolution.
 */
import {
  FinancialDocumentError,
  assertCallerTotalsMatchDerived,
  assertCreditNotePriorLinkage,
  assertFinancialDocumentStatutoryType,
  assertFinancialYear,
  assertRecipientParticularsForIssuance,
  assertRefundVoucherPriorLinkage,
  assertReverseChargeAuthorityForIssuance,
  assertSupportedPlaceOfSupplyPath,
  logicalIssuanceRequestMatches,
  sealIssuanceArithmetic,
  type FinancialDocument,
  type FinancialDocumentIssuancePolicy,
  type IssueFinancialDocumentCommand,
} from "../../shared/financial-document";
import type {
  Persistence,
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import {
  assertIssuerProfileCompleteForIssuance,
  formatSupplierRegisteredAddress,
  resolveAndLockEffectiveIssuerProfileForIssuance,
} from "./profile-resolution";
import {
  allocateStatutoryNumber,
  extractPostgresDriverCode,
  findFinancialDocumentByLogicalIssuanceKey,
  findNumberingSeriesById,
  insertIssuedFinancialDocument,
  loadFinancialDocument,
} from "./repository";
import { resolveUpstreamAuthoritiesForIssuance } from "./upstream";

export type IssueFinancialDocumentOptions = Readonly<{
  /**
   * Test-only seam: invoked after statutory number allocation and before
   * durable parent insert, inside the same transaction.
   */
  afterNumberAllocated?: () => Promise<void> | void;
  /**
   * Test-only seam: invoked after issuer profiles are locked and the
   * effective profile is selected, before number allocation.
   */
  afterIssuerProfileLocked?: () => Promise<void> | void;
  /**
   * Test-only seam: invoked inside the issuance transaction immediately
   * before resolveAndLockEffectiveIssuerProfileForIssuance.
   */
  beforeIssuerProfileLock?: () => Promise<void> | void;
  /**
   * Optional caller precondition: the locked effective issuer profile must
   * carry this issuancePolicy before statutory numbering. Historical exact
   * idempotent returns skip profile resolution and this gate.
   */
  requiredIssuancePolicy?: FinancialDocumentIssuancePolicy;
  /**
   * Optional existing Persistence transaction. When provided, issuance
   * participates in that transaction instead of starting a nested one.
   * Nested Persistence.transaction() remains unsupported.
   */
  transactionContext?: PersistenceTransactionContext;
}>;

function isLogicalIssuanceUniqueConflict(error: unknown): boolean {
  if (error instanceof FinancialDocumentError) {
    return error.code === "ISSUANCE_IDEMPOTENCY_CONFLICT";
  }
  if (!(error instanceof Error)) return false;
  const message = `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`;
  const driverCode = extractPostgresDriverCode(error);
  return (
    (driverCode === "23505" || /duplicate key value/i.test(message)) &&
    (/financial_documents_logical_issuance_key_uidx/i.test(message) ||
      /Key \(logical_issuance_key\)/i.test(message))
  );
}

function assertRequiredIssuancePolicy(
  profile: Readonly<{ issuancePolicy: FinancialDocumentIssuancePolicy | null }>,
  required: FinancialDocumentIssuancePolicy,
): void {
  if (profile.issuancePolicy !== required) {
    throw new FinancialDocumentError(
      "ISSUANCE_POLICY_MISMATCH",
      `Effective issuer profile issuancePolicy must be ${required} for this issuance (locked profile has ${profile.issuancePolicy ?? "null"}).`,
    );
  }
}

async function withIssuanceQuery<T>(
  persistence: Persistence,
  transactionContext: PersistenceTransactionContext | undefined,
  fn: (ctx: PersistenceQueryContext) => Promise<T>,
): Promise<T> {
  if (transactionContext) {
    return fn(transactionContext);
  }
  return persistence.withContext(fn);
}

async function loadExistingIssuedDocument(
  ctx: PersistenceQueryContext,
  logicalIssuanceKey: string,
): Promise<FinancialDocument | null> {
  const row = await findFinancialDocumentByLogicalIssuanceKey(
    ctx,
    logicalIssuanceKey,
  );
  if (!row) return null;
  return loadFinancialDocument(ctx, row.id);
}

function resolveHistoricalIdempotentReturn(
  existing: FinancialDocument,
  command: IssueFinancialDocumentCommand,
  sealed: ReturnType<typeof sealIssuanceArithmetic>,
): FinancialDocument {
  if (!logicalIssuanceRequestMatches(command, sealed, existing)) {
    throw new FinancialDocumentError(
      "ISSUANCE_IDEMPOTENCY_CONFLICT",
      `Logical issuance key ${existing.logicalIssuanceKey} was already used for a different immutable issuance intent.`,
    );
  }
  return existing;
}

async function validatePriorDocument(
  ctx: PersistenceQueryContext,
  input: {
    documentType: string;
    legalEntityId: string;
    priorFinancialDocumentId: string | null;
    checkoutId: string | null;
    paymentId: string | null;
    orderId: string | null;
  },
): Promise<{
  priorFinancialDocumentId: string | null;
  priorDocumentType: FinancialDocument["priorDocumentType"];
}> {
  if (!input.priorFinancialDocumentId) {
    assertCreditNotePriorLinkage({
      documentType: assertFinancialDocumentStatutoryType(input.documentType),
      priorFinancialDocumentId: null,
      priorDocumentType: null,
    });
    assertRefundVoucherPriorLinkage({
      documentType: assertFinancialDocumentStatutoryType(input.documentType),
      priorFinancialDocumentId: null,
      priorDocumentType: null,
    });
    return { priorFinancialDocumentId: null, priorDocumentType: null };
  }

  const prior = await loadFinancialDocument(ctx, input.priorFinancialDocumentId);
  if (!prior) {
    throw new FinancialDocumentError(
      "PRIOR_DOCUMENT_INVALID",
      `Prior Financial Document not found: ${input.priorFinancialDocumentId}`,
    );
  }
  if (prior.legalEntityId !== input.legalEntityId) {
    throw new FinancialDocumentError(
      "PRIOR_DOCUMENT_INVALID",
      "Prior Financial Document belongs to a different legal entity.",
    );
  }
  if (input.checkoutId && prior.checkoutId && prior.checkoutId !== input.checkoutId) {
    throw new FinancialDocumentError(
      "PRIOR_DOCUMENT_INVALID",
      "Prior Financial Document is not related to the same Checkout.",
    );
  }
  if (input.paymentId && prior.paymentId && prior.paymentId !== input.paymentId) {
    throw new FinancialDocumentError(
      "PRIOR_DOCUMENT_INVALID",
      "Prior Financial Document is not related to the same Payment.",
    );
  }
  if (input.orderId && prior.orderId && prior.orderId !== input.orderId) {
    throw new FinancialDocumentError(
      "PRIOR_DOCUMENT_INVALID",
      "Prior Financial Document is not related to the same Order.",
    );
  }

  assertCreditNotePriorLinkage({
    documentType: assertFinancialDocumentStatutoryType(input.documentType),
    priorFinancialDocumentId: prior.id,
    priorDocumentType: prior.documentType,
  });
  assertRefundVoucherPriorLinkage({
    documentType: assertFinancialDocumentStatutoryType(input.documentType),
    priorFinancialDocumentId: prior.id,
    priorDocumentType: prior.documentType,
  });

  return {
    priorFinancialDocumentId: prior.id,
    priorDocumentType: prior.documentType,
  };
}

/**
 * Issue an immutable Financial Document aggregate atomically with statutory
 * number allocation. Idempotent on logicalIssuanceKey + immutable request intent.
 */
export async function issueFinancialDocument(
  persistence: Persistence,
  command: IssueFinancialDocumentCommand,
  options: IssueFinancialDocumentOptions = {},
): Promise<FinancialDocument> {
  if (
    typeof command.logicalIssuanceKey !== "string" ||
    command.logicalIssuanceKey.trim().length === 0
  ) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "logicalIssuanceKey must be a non-empty string.",
    );
  }
  const logicalIssuanceKey = command.logicalIssuanceKey.trim();
  const documentType = assertFinancialDocumentStatutoryType(command.documentType);
  assertFinancialYear(command.financialYear);

  if (!(command.issueAt instanceof Date) || Number.isNaN(command.issueAt.getTime())) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "issueAt must be a valid Date.",
    );
  }

  const sealed = sealIssuanceArithmetic(command.lines);
  assertCallerTotalsMatchDerived(sealed, {
    taxableTotalPaise: command.taxableTotalPaise,
    taxTotalPaise: command.taxTotalPaise,
    discountTotalPaise: command.discountTotalPaise,
    chargeTotalPaise: command.chargeTotalPaise,
    grandTotalPaise: command.grandTotalPaise,
  });

  const transactionContext = options.transactionContext;
  if (transactionContext) {
    assertTransactionContext(transactionContext, "issueFinancialDocument");
  }

  // Historical idempotency: resolve existing issuance BEFORE current profile
  // selection / upstream revalidation for NEW issuance.
  const existingBefore = await withIssuanceQuery(
    persistence,
    transactionContext,
    (ctx) => loadExistingIssuedDocument(ctx, logicalIssuanceKey),
  );
  if (existingBefore) {
    return resolveHistoricalIdempotentReturn(existingBefore, command, sealed);
  }

  const upstream = await withIssuanceQuery(
    persistence,
    transactionContext,
    (ctx) =>
      resolveUpstreamAuthoritiesForIssuance(ctx, {
        checkoutId: command.checkoutId,
        checkoutSnapshotId: command.checkoutSnapshotId,
        paymentId: command.paymentId,
        refundId: command.refundId,
        orderId: command.orderId,
        documentType,
      }),
  );

  const series = await withIssuanceQuery(
    persistence,
    transactionContext,
    (ctx) => findNumberingSeriesById(ctx, command.numberingSeriesId),
  );
  if (!series) {
    throw new FinancialDocumentError(
      "NUMBERING_SERIES_NOT_FOUND",
      `Numbering series not found: ${command.numberingSeriesId}`,
    );
  }
  if (
    series.legalEntityId !== command.legalEntityId ||
    series.documentType !== documentType ||
    series.financialYear !== command.financialYear
  ) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      "Numbering series scope does not match legal entity / document type / financial year.",
    );
  }

  const prior = await withIssuanceQuery(
    persistence,
    transactionContext,
    (ctx) =>
      validatePriorDocument(ctx, {
        documentType,
        legalEntityId: command.legalEntityId,
        priorFinancialDocumentId: command.priorFinancialDocumentId ?? null,
        checkoutId: upstream.checkoutId,
        paymentId: upstream.paymentId,
        orderId: upstream.orderId,
      }),
  );

  const runIssuance = async (tx: PersistenceTransactionContext) => {
    const existingInTx = await findFinancialDocumentByLogicalIssuanceKey(
      tx,
      logicalIssuanceKey,
    );
    if (existingInTx) {
      const loaded = await loadFinancialDocument(tx, existingInTx.id);
      if (!loaded) {
        throw new FinancialDocumentError(
          "DOCUMENT_NOT_FOUND",
          `Failed to load existing Financial Document ${existingInTx.id}`,
        );
      }
      return resolveHistoricalIdempotentReturn(loaded, command, sealed);
    }

    if (options.beforeIssuerProfileLock) {
      await options.beforeIssuerProfileLock();
    }

    const profile = await resolveAndLockEffectiveIssuerProfileForIssuance(tx, {
      legalEntityId: command.legalEntityId,
      documentType,
      issueAt: command.issueAt,
    });

    if (options.requiredIssuancePolicy !== undefined) {
      assertRequiredIssuancePolicy(profile, options.requiredIssuancePolicy);
    }

    assertIssuerProfileCompleteForIssuance(profile, documentType, sealed.lines);

    const linesForPersist = sealed.lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unitPaise: line.unitPaise,
      discountPaise: line.discountPaise,
      chargePaise: line.chargePaise,
      taxableValuePaise: line.taxableValuePaise,
      lineTotalPaise: line.lineTotalPaise,
      sacCode: line.sacCode ?? profile.defaultSacCode,
      hsnCode: line.hsnCode ?? profile.defaultHsnCode,
      historicalCatalogItemId: line.historicalCatalogItemId,
      taxComponents: line.taxComponents,
    }));

    assertIssuerProfileCompleteForIssuance(
      profile,
      documentType,
      linesForPersist.map((l) => ({
        sacCode: l.sacCode ?? null,
        hsnCode: l.hsnCode ?? null,
      })),
    );

    // Non-signature statutory particulars — fail closed BEFORE consuming a
    // statutory number (ARCH-G16 immutability / numbering integrity).
    assertReverseChargeAuthorityForIssuance({
      documentType,
      reverseChargeApplicable: profile.reverseChargeApplicable,
    });
    assertRecipientParticularsForIssuance({
      documentType,
      recipientDisplayName: command.recipientDisplayName,
      recipientAddress: command.recipientAddress,
    });
    assertSupportedPlaceOfSupplyPath({
      documentType,
      supplierStateCode: profile.stateCode,
      placeOfSupplyStateCode: command.placeOfSupplyStateCode ?? null,
      lineTaxTypes: linesForPersist.flatMap((line) =>
        line.taxComponents.map((t) => t.taxType),
      ),
    });

    if (options.afterIssuerProfileLocked) {
      await options.afterIssuerProfileLocked();
    }

    const allocated = await allocateStatutoryNumber(
      tx,
      command.numberingSeriesId,
      command.issueAt,
    );

    if (options.afterNumberAllocated) {
      await options.afterNumberAllocated();
    }

    return insertIssuedFinancialDocument(tx, {
      documentType,
      statutoryDocumentNumber: allocated.statutoryDocumentNumber,
      issueAt: command.issueAt,
      financialYear: command.financialYear,
      logicalIssuanceKey,
      numberingSeriesId: command.numberingSeriesId,
      sequenceNumber: allocated.sequenceNumber,
      legalEntityId: command.legalEntityId,
      issuerProfileId: profile.id,
      issuerProfileVersion: profile.profileVersion,
      supplierGstLegalName: profile.gstLegalName,
      supplierGstin: profile.gstin,
      supplierRegisteredAddress: formatSupplierRegisteredAddress(profile),
      supplierStateCode: profile.stateCode,
      supplierRegistrationScheme: profile.registrationScheme,
      recipientDisplayName: command.recipientDisplayName ?? null,
      recipientPhoneE164: command.recipientPhoneE164 ?? null,
      recipientAddress: command.recipientAddress ?? null,
      taxableTotalPaise: sealed.taxableTotalPaise,
      taxTotalPaise: sealed.taxTotalPaise,
      discountTotalPaise: sealed.discountTotalPaise,
      chargeTotalPaise: sealed.chargeTotalPaise,
      grandTotalPaise: sealed.grandTotalPaise,
      placeOfSupplyStateCode: command.placeOfSupplyStateCode ?? null,
      reverseChargeApplicable:
        typeof profile.reverseChargeApplicable === "boolean"
          ? profile.reverseChargeApplicable
          : null,
      checkoutId: upstream.checkoutId,
      checkoutSnapshotId: upstream.checkoutSnapshotId,
      paymentId: upstream.paymentId,
      refundId: upstream.refundId,
      orderId: upstream.orderId,
      priorFinancialDocumentId: prior.priorFinancialDocumentId,
      priorDocumentType: prior.priorDocumentType,
      lines: linesForPersist,
      now: command.issueAt,
    });
  };

  if (transactionContext) {
    return runIssuance(transactionContext);
  }

  try {
    return await persistence.transaction(runIssuance);
  } catch (error) {
    if (!isLogicalIssuanceUniqueConflict(error)) {
      throw error;
    }
    const existingAfter = await loadExistingIssuedDocumentFromPersistence(
      persistence,
      logicalIssuanceKey,
    );
    if (!existingAfter) {
      throw error;
    }
    return resolveHistoricalIdempotentReturn(existingAfter, command, sealed);
  }
}

async function loadExistingIssuedDocumentFromPersistence(
  persistence: Persistence,
  logicalIssuanceKey: string,
): Promise<FinancialDocument | null> {
  return persistence.withContext((ctx) =>
    loadExistingIssuedDocument(ctx, logicalIssuanceKey),
  );
}
