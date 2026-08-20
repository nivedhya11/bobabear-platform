/**
 * Order FULFILLED → TAX_INVOICE automatic issuance
 * (IMP-028 Slice 9 / D-365 uninvoiced_advance policy).
 *
 * Invoked outside the Order fulfillment transaction. Never rewrites Order /
 * Payment / Checkout / Receipt Voucher. Idempotent on order:<orderId>:TAX_INVOICE.
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
import { findOrderById, mapOrderRow } from "../order/repository";
import type { Persistence } from "../persistence/types";
import { issueFinancialDocument, type IssueFinancialDocumentOptions } from "./issue";
import {
  listIssuerProfilesForLegalEntity,
  mapIssuerProfileRow,
  findFinancialDocumentByLogicalIssuanceKey,
  loadFinancialDocument,
  resolveNumberingSeriesForScope,
} from "./repository";

export const TAX_INVOICE_LOGICAL_ISSUANCE_KEY_PREFIX = "order:" as const;
export const TAX_INVOICE_LOGICAL_ISSUANCE_KEY_SUFFIX = ":TAX_INVOICE" as const;

export function taxInvoiceLogicalIssuanceKey(orderId: string): string {
  return `${TAX_INVOICE_LOGICAL_ISSUANCE_KEY_PREFIX}${orderId}${TAX_INVOICE_LOGICAL_ISSUANCE_KEY_SUFFIX}`;
}

export type IssueTaxInvoiceForOrderResult =
  | Readonly<{
      disposition: "ISSUED" | "ALREADY_EXISTS";
      document: FinancialDocument;
    }>
  | Readonly<{
      disposition: "SKIPPED";
      reason:
        | "ORDER_NOT_FULFILLED"
        | "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE"
        | "TAX_INVOICE_DISABLED";
    }>;

export type IssueTaxInvoiceForOrderOptions = IssueFinancialDocumentOptions &
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
 * Build TAX_INVOICE lines from sealed Checkout Snapshot commercial facts.
 * Does not read mutable menu/catalog/tax config or current customer profile.
 */
export function buildTaxInvoiceLinesFromSnapshot(
  snapshot: CheckoutSnapshot,
): IssueFinancialDocumentLineCommand[] {
  if (snapshot.taxablePaise < BigInt(0) || snapshot.taxPaise < BigInt(0)) {
    throw new FinancialDocumentError(
      "ARITHMETIC_INVALID",
      "Checkout Snapshot taxable/tax totals must be non-negative for Tax Invoice issuance.",
    );
  }
  if (snapshot.taxComponents.length === 0 && snapshot.taxPaise > BigInt(0)) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "Checkout Snapshot lacks sealed tax components required for Tax Invoice issuance.",
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
    "Tax invoice for fulfilled order";

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
      discountPaise: BigInt(0),
      chargePaise: BigInt(0),
      taxableValuePaise: snapshot.taxablePaise,
      historicalCatalogItemId: snapshot.id,
      taxComponents,
    },
  ];
}

/**
 * Issue (or idempotently return) a TAX_INVOICE for a FULFILLED Order.
 * Failures throw FinancialDocumentError — callers must not roll back Order.
 */
export async function issueTaxInvoiceForFulfilledOrder(
  persistence: Persistence,
  orderId: string,
  options: IssueTaxInvoiceForOrderOptions = {},
): Promise<IssueTaxInvoiceForOrderResult> {
  const orderRow = await persistence.withContext((ctx) =>
    findOrderById(ctx, orderId),
  );
  if (!orderRow) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Order not found: ${orderId}`,
    );
  }
  const order = mapOrderRow(orderRow);

  if (order.status !== "FULFILLED") {
    return Object.freeze({
      disposition: "SKIPPED",
      reason: "ORDER_NOT_FULFILLED",
    });
  }
  if (
    !(order.fulfilledAt instanceof Date) ||
    Number.isNaN(order.fulfilledAt.getTime())
  ) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "FULFILLED Order is missing durable fulfilledAt required for Tax Invoice issueAt.",
    );
  }

  const logicalIssuanceKey = taxInvoiceLogicalIssuanceKey(order.id);
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

  const snapshot = await persistence.withContext((ctx) =>
    loadActiveSnapshot(ctx, order.checkoutSnapshotId),
  );
  if (!snapshot) {
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `Checkout Snapshot not found: ${order.checkoutSnapshotId}`,
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

  const issueAt = order.fulfilledAt;
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
  if (!profile.enableTaxInvoice) {
    return Object.freeze({
      disposition: "SKIPPED",
      reason: "TAX_INVOICE_DISABLED",
    });
  }

  if (options.afterSoftProfileResolved) {
    await options.afterSoftProfileResolved(profile);
  }

  const series = await persistence.withContext((ctx) =>
    resolveNumberingSeriesForScope(ctx, {
      legalEntityId: outlet.legalEntityId,
      documentType: "TAX_INVOICE",
      financialYear,
    }),
  );

  const lines = buildTaxInvoiceLinesFromSnapshot(snapshot);
  const destination = snapshot.destination;

  // Place of supply must be a GST 2-digit state code. Checkout destination
  // stores ISO subdivision codes (e.g. IN-UT). Restaurant taxation uses
  // outlet performance location — seal from the effective issuer profile.
  const placeOfSupplyStateCode =
    typeof destination.stateCode === "string" &&
    /^[0-9]{2}$/.test(destination.stateCode)
      ? destination.stateCode
      : profile.stateCode;

  // Exact Order payment relationship only — never invent a Payment for
  // NO_PAYMENT_REQUIRED / zero-payable Orders.
  const paymentId =
    order.paymentProvenanceKind === "PAYMENT" && order.paymentId
      ? order.paymentId
      : null;

  const command: IssueFinancialDocumentCommand = {
    logicalIssuanceKey,
    documentType: "TAX_INVOICE",
    legalEntityId: outlet.legalEntityId,
    financialYear,
    numberingSeriesId: series.id,
    issueAt,
    lines,
    taxableTotalPaise: snapshot.taxablePaise,
    // tax/grand totals derived by Slice-2 seal; omit caller asserts that could
    // disagree solely due to header-vs-line charge/discount representation.
    placeOfSupplyStateCode,
    checkoutId: order.checkoutId,
    checkoutSnapshotId: order.checkoutSnapshotId,
    paymentId,
    orderId: order.id,
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
          reason: "TAX_INVOICE_DISABLED",
        });
      }
    }
    throw error;
  }
}
