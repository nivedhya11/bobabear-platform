/**
 * Missing Receipt Voucher / Tax Invoice recovery
 * (IMP-028 Slice 8–9 / D-365).
 *
 * Mirrors Order missing-materialization recovery (D-362): discovers durable
 * upstream authority without the derived Financial Document and retries
 * issuance independently. No new queue/table. Never rewrites Payment or Order
 * truth.
 */
import { FinancialDocumentError } from "../../shared/financial-document";
import type { Persistence } from "../persistence/types";
import {
  issueReceiptVoucherForSucceededPayment,
  type IssueReceiptVoucherForPaymentResult,
} from "./receipt-voucher-from-payment";
import {
  issueTaxInvoiceForFulfilledOrder,
  type IssueTaxInvoiceForOrderResult,
} from "./tax-invoice-from-order";
import {
  findFulfilledOrderIdsMissingTaxInvoice,
  findSucceededPaymentIdsMissingReceiptVoucher,
} from "./repository";

export type ReceiptVoucherRecoveryItemResult = Readonly<{
  paymentId: string;
  disposition:
    | "ISSUED"
    | "ALREADY_EXISTS"
    | "SKIPPED"
    | "RETRYABLE_FAILURE"
    | "CONFIG_FAILURE";
  reason?: string;
  financialDocumentId?: string;
  statutoryDocumentNumber?: string;
}>;

export type ReceiptVoucherRecoveryBatchResult = Readonly<{
  results: readonly ReceiptVoucherRecoveryItemResult[];
  nextCursor: string | null;
}>;

export type RecoverMissingReceiptVouchersOptions = Readonly<{
  limit?: number;
  afterPaymentId?: string;
}>;

export type TaxInvoiceRecoveryItemResult = Readonly<{
  orderId: string;
  disposition:
    | "ISSUED"
    | "ALREADY_EXISTS"
    | "SKIPPED"
    | "RETRYABLE_FAILURE"
    | "CONFIG_FAILURE";
  reason?: string;
  financialDocumentId?: string;
  statutoryDocumentNumber?: string;
}>;

export type TaxInvoiceRecoveryBatchResult = Readonly<{
  results: readonly TaxInvoiceRecoveryItemResult[];
  nextCursor: string | null;
}>;

export type RecoverMissingTaxInvoicesOptions = Readonly<{
  limit?: number;
  afterOrderId?: string;
}>;

function classifyFailure(error: unknown): {
  disposition: "RETRYABLE_FAILURE" | "CONFIG_FAILURE";
  reason: string;
} {
  if (error instanceof FinancialDocumentError) {
    const configCodes = new Set([
      "ISSUER_PROFILE_NOT_FOUND",
      "ISSUER_PROFILE_AMBIGUOUS",
      "ISSUER_PROFILE_INCOMPLETE",
      "ISSUANCE_POLICY_MISMATCH",
      "DOCUMENT_TYPE_DISABLED",
      "NUMBERING_SERIES_NOT_FOUND",
      "NUMBERING_SERIES_AMBIGUOUS",
    ]);
    if (configCodes.has(error.code)) {
      return { disposition: "CONFIG_FAILURE", reason: error.code };
    }
    return { disposition: "RETRYABLE_FAILURE", reason: error.code };
  }
  return { disposition: "RETRYABLE_FAILURE", reason: "UNKNOWN" };
}

export async function recoverMissingReceiptVouchersBatch(
  persistence: Persistence,
  options: RecoverMissingReceiptVouchersOptions = {},
): Promise<ReceiptVoucherRecoveryBatchResult> {
  const limit = options.limit ?? 25;
  const candidates = await persistence.withContext((ctx) =>
    findSucceededPaymentIdsMissingReceiptVoucher(ctx, {
      limit,
      ...(options.afterPaymentId
        ? { afterPaymentId: options.afterPaymentId }
        : {}),
    }),
  );

  const results: ReceiptVoucherRecoveryItemResult[] = [];
  for (const paymentId of candidates) {
    try {
      const outcome: IssueReceiptVoucherForPaymentResult =
        await issueReceiptVoucherForSucceededPayment(persistence, paymentId);
      if (outcome.disposition === "SKIPPED") {
        results.push(
          Object.freeze({
            paymentId,
            disposition: "SKIPPED",
            reason: outcome.reason,
          }),
        );
      } else {
        results.push(
          Object.freeze({
            paymentId,
            disposition: outcome.disposition,
            financialDocumentId: outcome.document.id,
            statutoryDocumentNumber: outcome.document.statutoryDocumentNumber,
          }),
        );
      }
    } catch (error) {
      const classified = classifyFailure(error);
      results.push(
        Object.freeze({
          paymentId,
          disposition: classified.disposition,
          reason: classified.reason,
        }),
      );
    }
  }

  const last = candidates[candidates.length - 1];
  const nextCursor =
    candidates.length === limit && last ? last : null;

  return Object.freeze({
    results: Object.freeze(results),
    nextCursor,
  });
}

export async function recoverMissingTaxInvoicesBatch(
  persistence: Persistence,
  options: RecoverMissingTaxInvoicesOptions = {},
): Promise<TaxInvoiceRecoveryBatchResult> {
  const limit = options.limit ?? 25;
  const candidates = await persistence.withContext((ctx) =>
    findFulfilledOrderIdsMissingTaxInvoice(ctx, {
      limit,
      ...(options.afterOrderId ? { afterOrderId: options.afterOrderId } : {}),
    }),
  );

  const results: TaxInvoiceRecoveryItemResult[] = [];
  for (const orderId of candidates) {
    try {
      const outcome: IssueTaxInvoiceForOrderResult =
        await issueTaxInvoiceForFulfilledOrder(persistence, orderId);
      if (outcome.disposition === "SKIPPED") {
        results.push(
          Object.freeze({
            orderId,
            disposition: "SKIPPED",
            reason: outcome.reason,
          }),
        );
      } else {
        results.push(
          Object.freeze({
            orderId,
            disposition: outcome.disposition,
            financialDocumentId: outcome.document.id,
            statutoryDocumentNumber: outcome.document.statutoryDocumentNumber,
          }),
        );
      }
    } catch (error) {
      const classified = classifyFailure(error);
      results.push(
        Object.freeze({
          orderId,
          disposition: classified.disposition,
          reason: classified.reason,
        }),
      );
    }
  }

  const last = candidates[candidates.length - 1];
  const nextCursor =
    candidates.length === limit && last ? last : null;

  return Object.freeze({
    results: Object.freeze(results),
    nextCursor,
  });
}
