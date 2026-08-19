/**
 * Production operator boundary for missing Receipt Voucher / Tax Invoice recovery
 * (IMP-028 Slice 8–9 / D-365; mirrors D-362 Order operator recovery).
 *
 * Invokes recoverMissingReceiptVouchersBatch / recoverMissingTaxInvoicesBatch.
 * Does not change Payment or Order truth.
 */
import type { Persistence } from "../persistence/types";
import {
  recoverMissingReceiptVouchersBatch,
  recoverMissingTaxInvoicesBatch,
  type RecoverMissingReceiptVouchersOptions,
  type RecoverMissingTaxInvoicesOptions,
  type ReceiptVoucherRecoveryBatchResult,
  type TaxInvoiceRecoveryBatchResult,
} from "./recovery";

export type RecoverMissingReceiptVouchersOperatorArgs =
  RecoverMissingReceiptVouchersOptions;

export type RecoverMissingReceiptVouchersOperatorResult = Readonly<{
  batch: ReceiptVoucherRecoveryBatchResult;
  scanned: number;
  issued: number;
  alreadyExists: number;
  skipped: number;
  retryableFailure: number;
  configFailure: number;
  nextCursor: string | null;
  issuedDocuments: readonly Readonly<{
    paymentId: string;
    financialDocumentId: string;
    statutoryDocumentNumber: string;
  }>[];
  configFailurePayments: readonly string[];
  retryableFailurePayments: readonly string[];
}>;

/**
 * Operator-facing wrapper around recoverMissingReceiptVouchersBatch with a
 * safe summary suitable for CLI / runbook output.
 */
export async function runRecoverMissingReceiptVouchersOperator(
  persistence: Persistence,
  args: RecoverMissingReceiptVouchersOperatorArgs = {},
): Promise<RecoverMissingReceiptVouchersOperatorResult> {
  const batch = await recoverMissingReceiptVouchersBatch(persistence, args);

  const issued = batch.results.filter((item) => item.disposition === "ISSUED");
  const alreadyExists = batch.results.filter(
    (item) => item.disposition === "ALREADY_EXISTS",
  );
  const skipped = batch.results.filter((item) => item.disposition === "SKIPPED");
  const retryableFailure = batch.results.filter(
    (item) => item.disposition === "RETRYABLE_FAILURE",
  );
  const configFailure = batch.results.filter(
    (item) => item.disposition === "CONFIG_FAILURE",
  );

  return Object.freeze({
    batch,
    scanned: batch.results.length,
    issued: issued.length,
    alreadyExists: alreadyExists.length,
    skipped: skipped.length,
    retryableFailure: retryableFailure.length,
    configFailure: configFailure.length,
    nextCursor: batch.nextCursor,
    issuedDocuments: Object.freeze(
      issued.map((item) =>
        Object.freeze({
          paymentId: item.paymentId,
          financialDocumentId: item.financialDocumentId!,
          statutoryDocumentNumber: item.statutoryDocumentNumber!,
        }),
      ),
    ),
    configFailurePayments: Object.freeze(
      configFailure.map((item) => item.paymentId),
    ),
    retryableFailurePayments: Object.freeze(
      retryableFailure.map((item) => item.paymentId),
    ),
  });
}

export type RecoverMissingTaxInvoicesOperatorArgs =
  RecoverMissingTaxInvoicesOptions;

export type RecoverMissingTaxInvoicesOperatorResult = Readonly<{
  batch: TaxInvoiceRecoveryBatchResult;
  scanned: number;
  issued: number;
  alreadyExists: number;
  skipped: number;
  retryableFailure: number;
  configFailure: number;
  nextCursor: string | null;
  issuedDocuments: readonly Readonly<{
    orderId: string;
    financialDocumentId: string;
    statutoryDocumentNumber: string;
  }>[];
  configFailureOrders: readonly string[];
  retryableFailureOrders: readonly string[];
}>;

/**
 * Operator-facing wrapper around recoverMissingTaxInvoicesBatch with a
 * safe summary suitable for CLI / runbook output.
 */
export async function runRecoverMissingTaxInvoicesOperator(
  persistence: Persistence,
  args: RecoverMissingTaxInvoicesOperatorArgs = {},
): Promise<RecoverMissingTaxInvoicesOperatorResult> {
  const batch = await recoverMissingTaxInvoicesBatch(persistence, args);

  const issued = batch.results.filter((item) => item.disposition === "ISSUED");
  const alreadyExists = batch.results.filter(
    (item) => item.disposition === "ALREADY_EXISTS",
  );
  const skipped = batch.results.filter((item) => item.disposition === "SKIPPED");
  const retryableFailure = batch.results.filter(
    (item) => item.disposition === "RETRYABLE_FAILURE",
  );
  const configFailure = batch.results.filter(
    (item) => item.disposition === "CONFIG_FAILURE",
  );

  return Object.freeze({
    batch,
    scanned: batch.results.length,
    issued: issued.length,
    alreadyExists: alreadyExists.length,
    skipped: skipped.length,
    retryableFailure: retryableFailure.length,
    configFailure: configFailure.length,
    nextCursor: batch.nextCursor,
    issuedDocuments: Object.freeze(
      issued.map((item) =>
        Object.freeze({
          orderId: item.orderId,
          financialDocumentId: item.financialDocumentId!,
          statutoryDocumentNumber: item.statutoryDocumentNumber!,
        }),
      ),
    ),
    configFailureOrders: Object.freeze(
      configFailure.map((item) => item.orderId),
    ),
    retryableFailureOrders: Object.freeze(
      retryableFailure.map((item) => item.orderId),
    ),
  });
}
