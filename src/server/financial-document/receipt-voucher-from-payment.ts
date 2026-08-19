/**
 * Payment SUCCEEDED → RECEIPT_VOUCHER automatic issuance
 * (IMP-028 Slice 8 / D-365 uninvoiced_advance policy).
 *
 * Invoked outside the Payment success transaction. Never rewrites Payment /
 * Checkout / provider evidence. Idempotent on payment:<paymentId>:RECEIPT_VOUCHER.
 */
import type { CheckoutSnapshot } from "../../shared/checkout";
import {
  FinancialDocumentError,
  deriveIndianFinancialYear,
  type FinancialDocument,
  type FinancialDocumentIssuerProfile,
  type FinancialDocumentTaxType,
  type IssueFinancialDocumentCommand,
  type IssueFinancialDocumentLineCommand,
} from "../../shared/financial-document";
import { loadActiveSnapshot } from "../checkout/repository";
import { findOutletById } from "../organization/outlets";
import {
  findCheckoutAndSnapshotForPayment,
  findPaymentById,
} from "../payment/repository";
import type { Persistence } from "../persistence/types";
import { issueFinancialDocument, type IssueFinancialDocumentOptions } from "./issue";
import {
  listIssuerProfilesForLegalEntity,
  mapIssuerProfileRow,
  findFinancialDocumentByLogicalIssuanceKey,
  loadFinancialDocument,
  resolveNumberingSeriesForScope,
} from "./repository";

export const RECEIPT_VOUCHER_LOGICAL_ISSUANCE_KEY_PREFIX = "payment:" as const;
export const RECEIPT_VOUCHER_LOGICAL_ISSUANCE_KEY_SUFFIX =
  ":RECEIPT_VOUCHER" as const;

export function receiptVoucherLogicalIssuanceKey(paymentId: string): string {
  return `${RECEIPT_VOUCHER_LOGICAL_ISSUANCE_KEY_PREFIX}${paymentId}${RECEIPT_VOUCHER_LOGICAL_ISSUANCE_KEY_SUFFIX}`;
}

export type IssueReceiptVoucherForPaymentResult =
  | Readonly<{
      disposition: "ISSUED" | "ALREADY_EXISTS";
      document: FinancialDocument;
    }>
  | Readonly<{
      disposition: "SKIPPED";
      reason:
        | "PAYMENT_NOT_SUCCEEDED"
        | "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE"
        | "RECEIPT_VOUCHER_DISABLED";
    }>;

export type IssueReceiptVoucherForPaymentOptions = IssueFinancialDocumentOptions &
  Readonly<{
    /**
     * Test-only seam: after the non-authoritative soft profile lookup / early
     * skip checks, before issueFinancialDocument locks the effective profile.
     */
    afterSoftProfileResolved?: (
      profile: FinancialDocumentIssuerProfile,
    ) => Promise<void> | void;
  }>;


function formatRecipientAddress(destination: CheckoutSnapshot["destination"]): string {
  const parts = [
    destination.addressLine1,
    destination.addressLine2,
    destination.landmark,
    destination.locality,
    destination.city,
    destination.stateCode,
    destination.postalCode,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.join(", ");
}

function isProfileEffectiveAt(
  profile: FinancialDocumentIssuerProfile,
  issueAt: Date,
): boolean {
  if (profile.lifecycleStatus !== "active") return false;
  if (profile.validFrom.getTime() > issueAt.getTime()) return false;
  if (profile.validTo !== null && profile.validTo.getTime() <= issueAt.getTime()) {
    return false;
  }
  return true;
}

/**
 * Resolve the single active issuer profile for a legal entity at issueAt,
 * without document-type enablement gating (policy decisions happen next).
 */
async function resolveActiveIssuerProfileForLegalEntity(
  persistence: Persistence,
  legalEntityId: string,
  issueAt: Date,
): Promise<FinancialDocumentIssuerProfile> {
  const profiles = await persistence.withContext(async (ctx) => {
    const rows = await listIssuerProfilesForLegalEntity(ctx, legalEntityId);
    return rows.map(mapIssuerProfileRow);
  });
  const effective = profiles.filter((profile) =>
    isProfileEffectiveAt(profile, issueAt),
  );
  if (effective.length === 0) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_NOT_FOUND",
      `No active issuer profile is effective for legal entity ${legalEntityId} at issuance time.`,
    );
  }
  if (effective.length > 1) {
    throw new FinancialDocumentError(
      "ISSUER_PROFILE_AMBIGUOUS",
      `Multiple active issuer profiles are simultaneously eligible for legal entity ${legalEntityId}; configuration is ambiguous.`,
    );
  }
  return effective[0]!;
}

/**
 * Build RECEIPT_VOUCHER lines from sealed Checkout Snapshot commercial facts.
 * Uses order-level sealed tax components applied to the sealed taxable total
 * (advance-receipt representation). Does not read mutable menu/catalog/tax config.
 */
export function buildReceiptVoucherLinesFromSnapshot(
  snapshot: CheckoutSnapshot,
): IssueFinancialDocumentLineCommand[] {
  if (snapshot.taxablePaise < 0n || snapshot.taxPaise < 0n) {
    throw new FinancialDocumentError(
      "ARITHMETIC_INVALID",
      "Checkout Snapshot taxable/tax totals must be non-negative for Receipt Voucher issuance.",
    );
  }
  if (snapshot.taxComponents.length === 0 && snapshot.taxPaise > 0n) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "Checkout Snapshot lacks sealed tax components required for Receipt Voucher issuance.",
    );
  }

  const descriptionParts = snapshot.lines.map((line) => {
    const name = [line.productName, line.variantName]
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .join(" / ");
    return `${name} × ${line.quantity}`;
  });
  const chargeParts = snapshot.charges.map(
    (charge) => `${charge.name} (${charge.chargeCode})`,
  );
  const description =
    [...descriptionParts, ...chargeParts].join("; ").trim() ||
    "Advance payment receipt";

  const taxComponents = snapshot.taxComponents.map((tax) => ({
    taxType: tax.taxType as FinancialDocumentTaxType,
    rateBps: tax.rateBps,
    taxableAmountPaise: snapshot.taxablePaise,
    // Omit taxAmountPaise — Slice-2 derives canonical exclusive GST amounts.
  }));

  return [
    {
      lineNumber: 1,
      description,
      quantity: 1,
      unitPaise: snapshot.taxablePaise,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: snapshot.taxablePaise,
      historicalCatalogItemId: snapshot.id,
      taxComponents,
    },
  ];
}

/**
 * Issue (or idempotently return) a RECEIPT_VOUCHER for a SUCCEEDED Payment.
 * Failures throw FinancialDocumentError — callers must not roll back Payment.
 */
export async function issueReceiptVoucherForSucceededPayment(
  persistence: Persistence,
  paymentId: string,
  options: IssueReceiptVoucherForPaymentOptions = {},
): Promise<IssueReceiptVoucherForPaymentResult> {
  const payment = await persistence.withContext((ctx) =>
    findPaymentById(ctx, paymentId),
  );
  if (!payment) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Payment not found: ${paymentId}`,
    );
  }
  if (payment.status !== "SUCCEEDED") {
    return Object.freeze({
      disposition: "SKIPPED",
      reason: "PAYMENT_NOT_SUCCEEDED",
    });
  }
  if (
    !(payment.succeededAt instanceof Date) ||
    Number.isNaN(payment.succeededAt.getTime())
  ) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "SUCCEEDED Payment is missing durable succeededAt required for Receipt Voucher issueAt.",
    );
  }

  const logicalIssuanceKey = receiptVoucherLogicalIssuanceKey(payment.id);
  const existing = await persistence.withContext(async (ctx) => {
    const row = await findFinancialDocumentByLogicalIssuanceKey(
      ctx,
      logicalIssuanceKey,
    );
    if (!row) return null;
    return loadFinancialDocument(ctx, row.id);
  });
  if (existing) {
    return Object.freeze({
      disposition: "ALREADY_EXISTS",
      document: existing,
    });
  }

  const linked = await persistence.withContext((ctx) =>
    findCheckoutAndSnapshotForPayment(ctx, payment),
  );
  if (!linked) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      "Payment is not linked to a consistent Checkout / Checkout Snapshot.",
    );
  }

  const snapshot = await persistence.withContext((ctx) =>
    loadActiveSnapshot(ctx, payment.checkoutSnapshotId),
  );
  if (!snapshot) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Checkout Snapshot not found: ${payment.checkoutSnapshotId}`,
    );
  }

  const outlet = await persistence.withContext((ctx) =>
    findOutletById(ctx, snapshot.selectedOutletId),
  );
  if (!outlet) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Outlet not found for sealed Checkout Snapshot: ${snapshot.selectedOutletId}`,
    );
  }

  const issueAt = payment.succeededAt;
  const financialYear = deriveIndianFinancialYear(issueAt);

  // Soft early skip only — NOT issuance authority. Final policy/enablement is
  // evaluated against the locked effective profile inside issueFinancialDocument.
  const profile = await resolveActiveIssuerProfileForLegalEntity(
    persistence,
    outlet.legalEntityId,
    issueAt,
  );

  if (profile.issuancePolicy === "invoice_at_payment") {
    return Object.freeze({
      disposition: "SKIPPED",
      reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
    });
  }
  if (!profile.enableReceiptVoucher) {
    return Object.freeze({
      disposition: "SKIPPED",
      reason: "RECEIPT_VOUCHER_DISABLED",
    });
  }

  if (options.afterSoftProfileResolved) {
    await options.afterSoftProfileResolved(profile);
  }

  const series = await persistence.withContext((ctx) =>
    resolveNumberingSeriesForScope(ctx, {
      legalEntityId: outlet.legalEntityId,
      documentType: "RECEIPT_VOUCHER",
      financialYear,
    }),
  );

  const lines = buildReceiptVoucherLinesFromSnapshot(snapshot);
  const destination = snapshot.destination;

  // Place of supply must be a GST 2-digit state code. Checkout destination
  // stores ISO subdivision codes (e.g. IN-UT). Restaurant taxation uses
  // outlet performance location — seal from the effective issuer profile.
  const placeOfSupplyStateCode =
    typeof destination.stateCode === "string" &&
    /^[0-9]{2}$/.test(destination.stateCode)
      ? destination.stateCode
      : profile.stateCode;

  const command: IssueFinancialDocumentCommand = {
    logicalIssuanceKey,
    documentType: "RECEIPT_VOUCHER",
    legalEntityId: outlet.legalEntityId,
    financialYear,
    numberingSeriesId: series.id,
    issueAt,
    lines,
    taxableTotalPaise: snapshot.taxablePaise,
    // tax/grand totals derived by Slice-2 seal; omit caller asserts that could
    // disagree solely due to header-vs-line charge/discount representation.
    placeOfSupplyStateCode,
    checkoutId: payment.checkoutId,
    checkoutSnapshotId: payment.checkoutSnapshotId,
    paymentId: payment.id,
    orderId: null,
    refundId: null,
    priorFinancialDocumentId: null,
    recipientDisplayName: destination.recipientName,
    recipientPhoneE164: destination.recipientPhone,
    recipientAddress: formatRecipientAddress(destination),
  };

  try {
    const { afterSoftProfileResolved: _softSeam, ...issueOptions } = options;
    const document = await issueFinancialDocument(persistence, command, {
      ...issueOptions,
      requiredIssuancePolicy: "uninvoiced_advance",
    });

    return Object.freeze({
      disposition: "ISSUED",
      document,
    });
  } catch (error) {
    // Locked-path policy/enablement failures map to the same SKIPPED outcomes
    // as the soft early skip (e.g. concurrent profile transition after soft check).
    if (error instanceof FinancialDocumentError) {
      if (error.code === "ISSUANCE_POLICY_MISMATCH") {
        return Object.freeze({
          disposition: "SKIPPED",
          reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
        });
      }
      if (error.code === "DOCUMENT_TYPE_DISABLED") {
        return Object.freeze({
          disposition: "SKIPPED",
          reason: "RECEIPT_VOUCHER_DISABLED",
        });
      }
    }
    throw error;
  }
}
