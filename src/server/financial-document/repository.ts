/**
 * Financial Document persistence primitives (IMP-028 / D-365).
 *
 * Insert-only for issued documents. No mutation of sealed snapshot fields.
 * Aggregate construction inserts lines/tax components before the ISSUED parent
 * (deferred FK + append-closed insert guards). NEW issuance profile-set
 * stabilization: legal_entities FOR UPDATE, then all issuer profiles FOR SHARE,
 * then numbering-series FOR UPDATE.
 */
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  financialDocumentIssuerProfilesTable,
  financialDocumentLineTaxComponentsTable,
  financialDocumentLinesTable,
  financialDocumentNumberingSeriesTable,
  financialDocumentsTable,
} from "../../platform/database/schema/financial-document";
import {
  FinancialDocumentError,
  assertCreditNotePriorLinkage,
  assertFinancialDocumentStatutoryType,
  assertFinancialYear,
  assertNumberingSeriesProducesValidStatutoryNumber,
  assertRefundVoucherPriorLinkage,
  formatStatutoryDocumentNumber,
  type AllocatedStatutoryNumber,
  type FinancialDocument,
  type FinancialDocumentIssuerProfile,
  type FinancialDocumentLine,
  type FinancialDocumentNumberingSeries,
  type FinancialDocumentStatutoryType,
  type FinancialDocumentStatus,
  type InsertFinancialDocumentInput,
} from "../../shared/financial-document";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type FinancialDocumentRow = typeof financialDocumentsTable.$inferSelect;
export type FinancialDocumentLineRow = typeof financialDocumentLinesTable.$inferSelect;
export type FinancialDocumentIssuerProfileRow =
  typeof financialDocumentIssuerProfilesTable.$inferSelect;
export type FinancialDocumentNumberingSeriesRow =
  typeof financialDocumentNumberingSeriesTable.$inferSelect;

export function extractPostgresDriverCode(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function newFinancialDocumentId(): string {
  return randomUUID();
}

export function newFinancialDocumentLineId(): string {
  return randomUUID();
}

export function newFinancialDocumentLineTaxComponentId(): string {
  return randomUUID();
}

export function newFinancialDocumentIssuerProfileId(): string {
  return randomUUID();
}

export function newFinancialDocumentNumberingSeriesId(): string {
  return randomUUID();
}

export function mapIssuerProfileRow(
  row: FinancialDocumentIssuerProfileRow,
): FinancialDocumentIssuerProfile {
  return Object.freeze({
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    legalEntityId: row.legalEntityId,
    legalEntityTaxProfileId: row.legalEntityTaxProfileId,
    profileVersion: row.profileVersion,
    gstLegalName: row.gstLegalName,
    gstin: row.gstin,
    registeredAddressLine1: row.registeredAddressLine1,
    registeredAddressLine2: row.registeredAddressLine2,
    registeredAddressCity: row.registeredAddressCity,
    registeredAddressPostalCode: row.registeredAddressPostalCode,
    stateCode: row.stateCode,
    registrationScheme: row.registrationScheme as FinancialDocumentIssuerProfile["registrationScheme"],
    registrationStatus: row.registrationStatus as FinancialDocumentIssuerProfile["registrationStatus"],
    defaultSacCode: row.defaultSacCode,
    defaultHsnCode: row.defaultHsnCode,
    defaultTaxRateBps: row.defaultTaxRateBps,
    itcAllowed: row.itcAllowed,
    placeOfSupplyPolicy: row.placeOfSupplyPolicy,
    reverseChargeApplicable: row.reverseChargeApplicable,
    enableTaxInvoice: row.enableTaxInvoice,
    enableBillOfSupply: row.enableBillOfSupply,
    enableReceiptVoucher: row.enableReceiptVoucher,
    enableRefundVoucher: row.enableRefundVoucher,
    enableCreditNote: row.enableCreditNote,
    dynamicQrApplicable: row.dynamicQrApplicable,
    issuancePolicy: row.issuancePolicy as FinancialDocumentIssuerProfile["issuancePolicy"],
    validFrom: row.validFrom,
    validTo: row.validTo,
    lifecycleStatus: row.lifecycleStatus as FinancialDocumentIssuerProfile["lifecycleStatus"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    retiredAt: row.retiredAt,
  });
}

export function mapNumberingSeriesRow(
  row: FinancialDocumentNumberingSeriesRow,
): FinancialDocumentNumberingSeries {
  return Object.freeze({
    id: row.id,
    legalEntityId: row.legalEntityId,
    documentType: row.documentType as FinancialDocumentStatutoryType,
    financialYear: row.financialYear,
    seriesCode: row.seriesCode,
    prefix: row.prefix,
    nextSequence: row.nextSequence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function mapLineRows(
  lines: readonly FinancialDocumentLineRow[],
  taxByLineId: Map<
    string,
    readonly {
      id: string;
      financialDocumentLineId: string;
      taxType: string;
      rateBps: number;
      taxableAmountPaise: bigint;
      taxAmountPaise: bigint;
    }[]
  >,
): readonly FinancialDocumentLine[] {
  return Object.freeze(
    lines.map((line) =>
      Object.freeze({
        id: line.id,
        financialDocumentId: line.financialDocumentId,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unitPaise: line.unitPaise,
        discountPaise: line.discountPaise,
        chargePaise: line.chargePaise,
        taxableValuePaise: line.taxableValuePaise,
        lineTotalPaise: line.lineTotalPaise,
        sacCode: line.sacCode,
        hsnCode: line.hsnCode,
        historicalCatalogItemId: line.historicalCatalogItemId,
        taxComponents: Object.freeze(
          (taxByLineId.get(line.id) ?? []).map((tax) =>
            Object.freeze({
              id: tax.id,
              financialDocumentLineId: tax.financialDocumentLineId,
              taxType: tax.taxType as FinancialDocumentLine["taxComponents"][number]["taxType"],
              rateBps: tax.rateBps,
              taxableAmountPaise: tax.taxableAmountPaise,
              taxAmountPaise: tax.taxAmountPaise,
            }),
          ),
        ),
      }),
    ),
  );
}

export function mapFinancialDocumentRow(
  row: FinancialDocumentRow,
  lines: readonly FinancialDocumentLine[] = [],
): FinancialDocument {
  return Object.freeze({
    id: row.id,
    documentType: row.documentType as FinancialDocumentStatutoryType,
    status: row.status as FinancialDocumentStatus,
    statutoryDocumentNumber: row.statutoryDocumentNumber,
    issueAt: row.issueAt,
    financialYear: row.financialYear,
    currency: "INR",
    logicalIssuanceKey: row.logicalIssuanceKey,
    numberingSeriesId: row.numberingSeriesId,
    sequenceNumber: row.sequenceNumber,
    legalEntityId: row.legalEntityId,
    issuerProfileId: row.issuerProfileId,
    issuerProfileVersion: row.issuerProfileVersion,
    supplierGstLegalName: row.supplierGstLegalName,
    supplierGstin: row.supplierGstin,
    supplierRegisteredAddress: row.supplierRegisteredAddress,
    supplierStateCode: row.supplierStateCode,
    supplierRegistrationScheme:
      row.supplierRegistrationScheme as FinancialDocument["supplierRegistrationScheme"],
    recipientDisplayName: row.recipientDisplayName,
    recipientPhoneE164: row.recipientPhoneE164,
    recipientAddress: row.recipientAddress,
    taxableTotalPaise: row.taxableTotalPaise,
    taxTotalPaise: row.taxTotalPaise,
    discountTotalPaise: row.discountTotalPaise,
    chargeTotalPaise: row.chargeTotalPaise,
    grandTotalPaise: row.grandTotalPaise,
    placeOfSupplyStateCode: row.placeOfSupplyStateCode,
    reverseChargeApplicable: row.reverseChargeApplicable,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    paymentId: row.paymentId,
    refundId: row.refundId,
    orderId: row.orderId,
    priorFinancialDocumentId: row.priorFinancialDocumentId,
    priorDocumentType: row.priorDocumentType as FinancialDocument["priorDocumentType"],
    createdAt: row.createdAt,
    lines,
  });
}

export async function findIssuerProfileById(
  context: PersistenceQueryContext,
  issuerProfileId: string,
): Promise<FinancialDocumentIssuerProfileRow | null> {
  assertApplicationRole(context, "findIssuerProfileById");
  const rows = await context.db
    .select()
    .from(financialDocumentIssuerProfilesTable)
    .where(eq(financialDocumentIssuerProfilesTable.id, issuerProfileId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listIssuerProfilesForLegalEntity(
  context: PersistenceQueryContext,
  legalEntityId: string,
): Promise<readonly FinancialDocumentIssuerProfileRow[]> {
  assertApplicationRole(context, "listIssuerProfilesForLegalEntity");
  return context.db
    .select()
    .from(financialDocumentIssuerProfilesTable)
    .where(eq(financialDocumentIssuerProfilesTable.legalEntityId, legalEntityId))
    .orderBy(asc(financialDocumentIssuerProfilesTable.profileVersion));
}

/**
 * Stabilize the issuer-profile set for NEW Financial Document issuance.
 *
 * PostgreSQL FK INSERT into `financial_document_issuer_profiles` acquires
 * `FOR KEY SHARE` on the referenced `legal_entities` row. That mode conflicts
 * only with `FOR UPDATE` (not `FOR SHARE` / `FOR NO KEY UPDATE`). Therefore
 * NEW issuance must take `FOR UPDATE` on the legal entity so a concurrent
 * overlapping profile INSERT cannot commit mid-issuance under READ COMMITTED.
 *
 * Lock order (issuance): legal entity → all issuer profiles → numbering series.
 */
export async function lockLegalEntityForIssuerProfileSetStabilization(
  context: PersistenceTransactionContext,
  legalEntityId: string,
): Promise<void> {
  assertTransactionContext(
    context,
    "lockLegalEntityForIssuerProfileSetStabilization",
  );
  const locked = await context.db.execute<{ id: string }>(sql`
    select id
    from app.legal_entities
    where id = ${legalEntityId}::uuid
    for update
  `);
  if (locked.rows.length === 0) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Legal entity not found: ${legalEntityId}`,
    );
  }
}

/**
 * Lock every issuer profile row for a legal entity (FOR SHARE), including
 * draft / active / retired. Prevents an unlocked existing row from becoming
 * newly eligible (e.g. draft→active) while NEW issuance is open.
 *
 * Eligibility filtering still happens after the set is stabilized.
 */
export async function lockAllIssuerProfilesForLegalEntityForShare(
  context: PersistenceTransactionContext,
  legalEntityId: string,
): Promise<readonly FinancialDocumentIssuerProfileRow[]> {
  assertTransactionContext(context, "lockAllIssuerProfilesForLegalEntityForShare");
  await context.db.execute<{ id: string }>(sql`
    select id
    from app.financial_document_issuer_profiles
    where legal_entity_id = ${legalEntityId}::uuid
    order by id
    for share
  `);
  return context.db
    .select()
    .from(financialDocumentIssuerProfilesTable)
    .where(eq(financialDocumentIssuerProfilesTable.legalEntityId, legalEntityId))
    .orderBy(asc(financialDocumentIssuerProfilesTable.profileVersion));
}

/**
 * @deprecated Prefer lockAllIssuerProfilesForLegalEntityForShare after legal-entity
 * FOR UPDATE. Retained as a thin alias for callers that already import this name.
 */
export async function lockActiveIssuerProfilesForLegalEntityForShare(
  context: PersistenceTransactionContext,
  legalEntityId: string,
): Promise<readonly FinancialDocumentIssuerProfileRow[]> {
  const rows = await lockAllIssuerProfilesForLegalEntityForShare(
    context,
    legalEntityId,
  );
  return rows.filter((row) => row.lifecycleStatus === "active");
}

export async function findNumberingSeriesById(
  context: PersistenceQueryContext,
  numberingSeriesId: string,
): Promise<FinancialDocumentNumberingSeriesRow | null> {
  assertApplicationRole(context, "findNumberingSeriesById");
  const rows = await context.db
    .select()
    .from(financialDocumentNumberingSeriesTable)
    .where(eq(financialDocumentNumberingSeriesTable.id, numberingSeriesId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertIssuerProfile(
  context: PersistenceTransactionContext,
  input: {
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    legalEntityTaxProfileId?: string | null;
    profileVersion: number;
    gstLegalName?: string | null;
    gstin?: string | null;
    registeredAddressLine1?: string | null;
    registeredAddressLine2?: string | null;
    registeredAddressCity?: string | null;
    registeredAddressPostalCode?: string | null;
    stateCode?: string | null;
    registrationScheme?: FinancialDocumentIssuerProfile["registrationScheme"];
    registrationStatus?: FinancialDocumentIssuerProfile["registrationStatus"];
    defaultSacCode?: string | null;
    defaultHsnCode?: string | null;
    defaultTaxRateBps?: number | null;
    itcAllowed?: boolean | null;
    placeOfSupplyPolicy?: string | null;
    reverseChargeApplicable?: boolean | null;
    enableTaxInvoice?: boolean;
    enableBillOfSupply?: boolean;
    enableReceiptVoucher?: boolean;
    enableRefundVoucher?: boolean;
    enableCreditNote?: boolean;
    dynamicQrApplicable?: boolean | null;
    issuancePolicy?: FinancialDocumentIssuerProfile["issuancePolicy"];
    validFrom: Date;
    validTo?: Date | null;
    lifecycleStatus?: FinancialDocumentIssuerProfile["lifecycleStatus"];
    now: Date;
  },
): Promise<FinancialDocumentIssuerProfileRow> {
  assertTransactionContext(context, "insertIssuerProfile");
  const id = newFinancialDocumentIssuerProfileId();
  const rows = await context.db
    .insert(financialDocumentIssuerProfilesTable)
    .values({
      id,
      brandId: input.brandId,
      organizationId: input.organizationId,
      legalEntityId: input.legalEntityId,
      legalEntityTaxProfileId: input.legalEntityTaxProfileId ?? null,
      profileVersion: input.profileVersion,
      gstLegalName: input.gstLegalName ?? null,
      gstin: input.gstin ?? null,
      registeredAddressLine1: input.registeredAddressLine1 ?? null,
      registeredAddressLine2: input.registeredAddressLine2 ?? null,
      registeredAddressCity: input.registeredAddressCity ?? null,
      registeredAddressPostalCode: input.registeredAddressPostalCode ?? null,
      stateCode: input.stateCode ?? null,
      registrationScheme: input.registrationScheme ?? null,
      registrationStatus: input.registrationStatus ?? null,
      defaultSacCode: input.defaultSacCode ?? null,
      defaultHsnCode: input.defaultHsnCode ?? null,
      defaultTaxRateBps: input.defaultTaxRateBps ?? null,
      itcAllowed: input.itcAllowed ?? null,
      placeOfSupplyPolicy: input.placeOfSupplyPolicy ?? null,
      reverseChargeApplicable:
        input.reverseChargeApplicable === undefined
          ? null
          : input.reverseChargeApplicable,
      enableTaxInvoice: input.enableTaxInvoice ?? false,
      enableBillOfSupply: input.enableBillOfSupply ?? false,
      enableReceiptVoucher: input.enableReceiptVoucher ?? false,
      enableRefundVoucher: input.enableRefundVoucher ?? false,
      enableCreditNote: input.enableCreditNote ?? false,
      dynamicQrApplicable: input.dynamicQrApplicable ?? null,
      issuancePolicy: input.issuancePolicy ?? null,
      validFrom: input.validFrom,
      validTo: input.validTo ?? null,
      lifecycleStatus: input.lifecycleStatus ?? "draft",
      createdAt: input.now,
      updatedAt: input.now,
      retiredAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function insertNumberingSeries(
  context: PersistenceTransactionContext,
  input: {
    legalEntityId: string;
    documentType: FinancialDocumentStatutoryType;
    financialYear: string;
    seriesCode: string;
    prefix: string;
    nextSequence?: bigint;
    now: Date;
  },
): Promise<FinancialDocumentNumberingSeriesRow> {
  assertTransactionContext(context, "insertNumberingSeries");
  assertFinancialDocumentStatutoryType(input.documentType);
  assertFinancialYear(input.financialYear);
  if (input.prefix.startsWith("ORD-")) {
    throw new FinancialDocumentError(
      "INVALID_STATUTORY_TYPE",
      "Numbering series prefix must not use ORD-* order numbers as statutory document numbers.",
    );
  }
  const nextSequence = input.nextSequence ?? BigInt(1);
  // Fail closed at series configuration when the next candidate number already
  // exceeds the statutory length budget (prefix + padded/grown sequence).
  assertNumberingSeriesProducesValidStatutoryNumber(input.prefix, nextSequence);
  const id = newFinancialDocumentNumberingSeriesId();
  const rows = await context.db
    .insert(financialDocumentNumberingSeriesTable)
    .values({
      id,
      legalEntityId: input.legalEntityId,
      documentType: input.documentType,
      financialYear: input.financialYear,
      seriesCode: input.seriesCode,
      prefix: input.prefix,
      nextSequence,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  return rows[0]!;
}

/**
 * Concurrency-safe statutory number allocation.
 * Locks the series row, returns the current sequence, then advances next_sequence.
 */
export async function allocateStatutoryNumber(
  context: PersistenceTransactionContext,
  numberingSeriesId: string,
  now: Date,
): Promise<AllocatedStatutoryNumber> {
  assertTransactionContext(context, "allocateStatutoryNumber");
  const locked = await context.db.execute<{
    id: string;
    document_type: string;
    financial_year: string;
    prefix: string;
    next_sequence: string;
  }>(sql`
    select id, document_type, financial_year, prefix, next_sequence::text as next_sequence
    from app.financial_document_numbering_series
    where id = ${numberingSeriesId}::uuid
    for update
  `);
  const row = locked.rows[0];
  if (!row) {
    throw new FinancialDocumentError(
      "NUMBERING_SERIES_NOT_FOUND",
      `Numbering series not found: ${numberingSeriesId}`,
    );
  }
  const sequenceNumber = BigInt(row.next_sequence);
  const documentType = assertFinancialDocumentStatutoryType(row.document_type);
  // Validate the candidate formatted number BEFORE advancing next_sequence so
  // compliance failure never consumes a sequence value.
  const statutoryDocumentNumber = formatStatutoryDocumentNumber(
    row.prefix,
    sequenceNumber,
  );

  await context.db
    .update(financialDocumentNumberingSeriesTable)
    .set({
      nextSequence: sequenceNumber + BigInt(1),
      updatedAt: now,
    })
    .where(eq(financialDocumentNumberingSeriesTable.id, numberingSeriesId));

  return Object.freeze({
    numberingSeriesId,
    sequenceNumber,
    statutoryDocumentNumber,
    financialYear: row.financial_year,
    documentType,
  });
}

export async function findFinancialDocumentById(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<FinancialDocumentRow | null> {
  assertApplicationRole(context, "findFinancialDocumentById");
  const rows = await context.db
    .select()
    .from(financialDocumentsTable)
    .where(eq(financialDocumentsTable.id, financialDocumentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findFinancialDocumentByLogicalIssuanceKey(
  context: PersistenceQueryContext,
  logicalIssuanceKey: string,
): Promise<FinancialDocumentRow | null> {
  assertApplicationRole(context, "findFinancialDocumentByLogicalIssuanceKey");
  const rows = await context.db
    .select()
    .from(financialDocumentsTable)
    .where(eq(financialDocumentsTable.logicalIssuanceKey, logicalIssuanceKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadFinancialDocumentLines(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<readonly FinancialDocumentLine[]> {
  assertApplicationRole(context, "loadFinancialDocumentLines");
  const lines = await context.db
    .select()
    .from(financialDocumentLinesTable)
    .where(eq(financialDocumentLinesTable.financialDocumentId, financialDocumentId))
    .orderBy(asc(financialDocumentLinesTable.lineNumber));

  const lineIds = lines.map((line) => line.id);
  const taxByLineId = new Map<
    string,
    {
      id: string;
      financialDocumentLineId: string;
      taxType: string;
      rateBps: number;
      taxableAmountPaise: bigint;
      taxAmountPaise: bigint;
    }[]
  >();
  if (lineIds.length > 0) {
    for (const lineId of lineIds) {
      const taxes = await context.db
        .select()
        .from(financialDocumentLineTaxComponentsTable)
        .where(eq(financialDocumentLineTaxComponentsTable.financialDocumentLineId, lineId));
      taxByLineId.set(lineId, taxes);
    }
  }
  return mapLineRows(lines, taxByLineId);
}

export async function loadFinancialDocument(
  context: PersistenceQueryContext,
  financialDocumentId: string,
): Promise<FinancialDocument | null> {
  const row = await findFinancialDocumentById(context, financialDocumentId);
  if (!row) return null;
  const lines = await loadFinancialDocumentLines(context, financialDocumentId);
  return mapFinancialDocumentRow(row, lines);
}

/**
 * List issued Financial Documents for an authorized Order commercial graph.
 *
 * Includes:
 * - documents sealed with orderId = Order.id
 * - payment-time documents sealed with checkoutId = Order.checkoutId and
 *   orderId IS NULL (Receipt Voucher before Order materialization)
 *
 * Does not accept caller-supplied checkoutId — callers must pass the
 * immutable Order.checkoutId after Order ownership authorization.
 * Ordering: issue_at ASC, statutory_document_number ASC, id ASC.
 */
export async function listFinancialDocumentsForOrder(
  context: PersistenceQueryContext,
  input: {
    orderId: string;
    checkoutId: string;
  },
): Promise<readonly FinancialDocument[]> {
  assertApplicationRole(context, "listFinancialDocumentsForOrder");
  const rows = await context.db
    .select()
    .from(financialDocumentsTable)
    .where(
      or(
        eq(financialDocumentsTable.orderId, input.orderId),
        and(
          eq(financialDocumentsTable.checkoutId, input.checkoutId),
          isNull(financialDocumentsTable.orderId),
        ),
      ),
    )
    .orderBy(
      asc(financialDocumentsTable.issueAt),
      asc(financialDocumentsTable.statutoryDocumentNumber),
      asc(financialDocumentsTable.id),
    );
  const documents: FinancialDocument[] = [];
  for (const row of rows) {
    const lines = await loadFinancialDocumentLines(context, row.id);
    documents.push(mapFinancialDocumentRow(row, lines));
  }
  return Object.freeze(documents);
}

/**
 * Resolve the unique numbering series for legal entity + document type + FY.
 * Fail closed: 0 → NOT_FOUND; >1 → AMBIGUOUS.
 */
export async function resolveNumberingSeriesForScope(
  context: PersistenceQueryContext,
  input: {
    legalEntityId: string;
    documentType: FinancialDocumentStatutoryType;
    financialYear: string;
  },
): Promise<FinancialDocumentNumberingSeries> {
  assertApplicationRole(context, "resolveNumberingSeriesForScope");
  assertFinancialYear(input.financialYear);
  const documentType = assertFinancialDocumentStatutoryType(input.documentType);
  const rows = await context.db
    .select()
    .from(financialDocumentNumberingSeriesTable)
    .where(
      and(
        eq(financialDocumentNumberingSeriesTable.legalEntityId, input.legalEntityId),
        eq(financialDocumentNumberingSeriesTable.documentType, documentType),
        eq(financialDocumentNumberingSeriesTable.financialYear, input.financialYear),
      ),
    );
  if (rows.length === 0) {
    throw new FinancialDocumentError(
      "NUMBERING_SERIES_NOT_FOUND",
      `No numbering series configured for ${documentType} / ${input.financialYear} on legal entity ${input.legalEntityId}.`,
    );
  }
  if (rows.length > 1) {
    throw new FinancialDocumentError(
      "NUMBERING_SERIES_AMBIGUOUS",
      `Multiple numbering series configured for ${documentType} / ${input.financialYear} on legal entity ${input.legalEntityId}.`,
    );
  }
  return mapNumberingSeriesRow(rows[0]!);
}

/**
 * Find SUCCEEDED payment ids that lack an ISSUED RECEIPT_VOUCHER for catch-up.
 */
export async function findSucceededPaymentIdsMissingReceiptVoucher(
  context: PersistenceQueryContext,
  input: { limit: number; afterPaymentId?: string },
): Promise<readonly string[]> {
  assertApplicationRole(context, "findSucceededPaymentIdsMissingReceiptVoucher");
  const limit = Math.max(1, Math.min(input.limit, 100));
  const afterClause = input.afterPaymentId
    ? sql`AND p.id > ${input.afterPaymentId}::uuid`
    : sql``;
  const rows = await context.db.execute<{ id: string }>(sql`
    SELECT p.id
    FROM app.payments p
    WHERE p.status = 'SUCCEEDED'
      ${afterClause}
      AND NOT EXISTS (
        SELECT 1
        FROM app.financial_documents fd
        WHERE fd.payment_id = p.id
          AND fd.document_type = 'RECEIPT_VOUCHER'
          AND fd.status = 'ISSUED'
      )
    ORDER BY p.id ASC
    LIMIT ${limit}
  `);
  return Object.freeze(rows.rows.map((row) => row.id));
}

/**
 * Find FULFILLED order ids that lack an ISSUED TAX_INVOICE for catch-up.
 */
export async function findFulfilledOrderIdsMissingTaxInvoice(
  context: PersistenceQueryContext,
  input: { limit: number; afterOrderId?: string },
): Promise<readonly string[]> {
  assertApplicationRole(context, "findFulfilledOrderIdsMissingTaxInvoice");
  const limit = Math.max(1, Math.min(input.limit, 100));
  const afterClause = input.afterOrderId
    ? sql`AND o.id > ${input.afterOrderId}::uuid`
    : sql``;
  const rows = await context.db.execute<{ id: string }>(sql`
    SELECT o.id
    FROM app.orders o
    WHERE o.status = 'FULFILLED'
      ${afterClause}
      AND NOT EXISTS (
        SELECT 1
        FROM app.financial_documents fd
        WHERE fd.order_id = o.id
          AND fd.document_type = 'TAX_INVOICE'
          AND fd.status = 'ISSUED'
      )
    ORDER BY o.id ASC
    LIMIT ${limit}
  `);
  return Object.freeze(rows.rows.map((row) => row.id));
}

export async function insertIssuedFinancialDocument(
  context: PersistenceTransactionContext,
  input: InsertFinancialDocumentInput,
): Promise<FinancialDocument> {
  assertTransactionContext(context, "insertIssuedFinancialDocument");
  const documentType = assertFinancialDocumentStatutoryType(input.documentType);
  assertFinancialYear(input.financialYear);
  assertCreditNotePriorLinkage({
    documentType,
    priorFinancialDocumentId: input.priorFinancialDocumentId,
    priorDocumentType: input.priorDocumentType,
  });
  assertRefundVoucherPriorLinkage({
    documentType,
    priorFinancialDocumentId: input.priorFinancialDocumentId,
    priorDocumentType: input.priorDocumentType,
  });

  if (input.statutoryDocumentNumber.startsWith("ORD-")) {
    throw new FinancialDocumentError(
      "STATUTORY_NUMBER_CONFLICT",
      "ORD-* order numbers must not be used as statutory Financial Document numbers.",
    );
  }

  const existing = await findFinancialDocumentByLogicalIssuanceKey(
    context,
    input.logicalIssuanceKey,
  );
  if (existing) {
    throw new FinancialDocumentError(
      "ISSUANCE_IDEMPOTENCY_CONFLICT",
      `Logical issuance key already issued: ${input.logicalIssuanceKey}`,
    );
  }

  const issuer = await findIssuerProfileById(context, input.issuerProfileId);
  if (!issuer) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_NOT_FOUND",
      `Issuer profile not found: ${input.issuerProfileId}`,
    );
  }

  const id = newFinancialDocumentId();
  // Aggregate construction (ARCH-G16 / ARCH-G14): insert children before the
  // issued parent. Lines→document FK is DEFERRABLE INITIALLY DEFERRED; insert
  // guards reject child append once the parent row exists. No committed
  // partially-issued document is exposed.
  try {
    for (const line of input.lines) {
      const lineId = newFinancialDocumentLineId();
      await context.db.insert(financialDocumentLinesTable).values({
        id: lineId,
        financialDocumentId: id,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unitPaise: line.unitPaise,
        discountPaise: line.discountPaise,
        chargePaise: line.chargePaise,
        taxableValuePaise: line.taxableValuePaise,
        lineTotalPaise: line.lineTotalPaise,
        sacCode: line.sacCode ?? null,
        hsnCode: line.hsnCode ?? null,
        historicalCatalogItemId: line.historicalCatalogItemId ?? null,
      });
      for (const tax of line.taxComponents ?? []) {
        await context.db.insert(financialDocumentLineTaxComponentsTable).values({
          id: newFinancialDocumentLineTaxComponentId(),
          financialDocumentLineId: lineId,
          taxType: tax.taxType,
          rateBps: tax.rateBps,
          taxableAmountPaise: tax.taxableAmountPaise,
          taxAmountPaise: tax.taxAmountPaise,
        });
      }
    }

    await context.db.insert(financialDocumentsTable).values({
      id,
      documentType,
      status: "ISSUED",
      statutoryDocumentNumber: input.statutoryDocumentNumber,
      issueAt: input.issueAt,
      financialYear: input.financialYear,
      currency: "INR",
      logicalIssuanceKey: input.logicalIssuanceKey,
      numberingSeriesId: input.numberingSeriesId,
      sequenceNumber: input.sequenceNumber,
      legalEntityId: input.legalEntityId,
      issuerProfileId: input.issuerProfileId,
      issuerProfileVersion: input.issuerProfileVersion,
      supplierGstLegalName: input.supplierGstLegalName ?? null,
      supplierGstin: input.supplierGstin ?? null,
      supplierRegisteredAddress: input.supplierRegisteredAddress ?? null,
      supplierStateCode: input.supplierStateCode ?? null,
      supplierRegistrationScheme: input.supplierRegistrationScheme ?? null,
      recipientDisplayName: input.recipientDisplayName ?? null,
      recipientPhoneE164: input.recipientPhoneE164 ?? null,
      recipientAddress: input.recipientAddress ?? null,
      taxableTotalPaise: input.taxableTotalPaise,
      taxTotalPaise: input.taxTotalPaise,
      discountTotalPaise: input.discountTotalPaise,
      chargeTotalPaise: input.chargeTotalPaise,
      grandTotalPaise: input.grandTotalPaise,
      placeOfSupplyStateCode: input.placeOfSupplyStateCode ?? null,
      reverseChargeApplicable:
        input.reverseChargeApplicable === undefined
          ? null
          : input.reverseChargeApplicable,
      checkoutId: input.checkoutId ?? null,
      checkoutSnapshotId: input.checkoutSnapshotId ?? null,
      paymentId: input.paymentId ?? null,
      refundId: input.refundId ?? null,
      orderId: input.orderId ?? null,
      priorFinancialDocumentId: input.priorFinancialDocumentId ?? null,
      priorDocumentType: input.priorDocumentType ?? null,
      createdAt: input.now,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
        : String(error);
    const driverCode = extractPostgresDriverCode(error);
    const isUnique =
      driverCode === "23505" || /duplicate key value/i.test(message);
    if (
      isUnique &&
      (/financial_documents_logical_issuance_key_uidx/i.test(message) ||
        /Key \(logical_issuance_key\)/i.test(message))
    ) {
      throw new FinancialDocumentError(
        "ISSUANCE_IDEMPOTENCY_CONFLICT",
        `Logical issuance key already issued: ${input.logicalIssuanceKey}`,
      );
    }
    if (
      isUnique &&
      (/series_sequence|series_number|statutory_document_number/i.test(message) ||
        /Key \(statutory_document_number\)/i.test(message))
    ) {
      throw new FinancialDocumentError(
        "STATUTORY_NUMBER_CONFLICT",
        `Statutory document number conflict: ${input.statutoryDocumentNumber}`,
      );
    }
    if (/foreign key|violates foreign key|append-closed/i.test(message)) {
      throw new FinancialDocumentError(
        "UPSTREAM_REFERENCE_INVALID",
        "Financial Document upstream authority reference is invalid.",
      );
    }
    throw error;
  }

  const loaded = await loadFinancialDocument(context, id);
  if (!loaded) {
    throw new FinancialDocumentError(
      "DOCUMENT_NOT_FOUND",
      `Failed to load inserted Financial Document ${id}`,
    );
  }
  return loaded;
}

/** Explicitly forbidden — issued documents are immutable (ARCH-G16). */
export async function updateIssuedFinancialDocument(): Promise<never> {
  throw new FinancialDocumentError(
    "IMMUTABLE_DOCUMENT_MUTATION_FORBIDDEN",
    "Issued Financial Documents cannot be updated; seal is immutable historical truth.",
  );
}

export async function lockNumberingSeriesForUpdate(
  context: PersistenceTransactionContext,
  numberingSeriesId: string,
): Promise<FinancialDocumentNumberingSeriesRow | null> {
  assertTransactionContext(context, "lockNumberingSeriesForUpdate");
  await context.db.execute(sql`
    select id
    from app.financial_document_numbering_series
    where id = ${numberingSeriesId}::uuid
    for update
  `);
  const found = await context.db
    .select()
    .from(financialDocumentNumberingSeriesTable)
    .where(eq(financialDocumentNumberingSeriesTable.id, numberingSeriesId))
    .limit(1);
  return found[0] ?? null;
}
