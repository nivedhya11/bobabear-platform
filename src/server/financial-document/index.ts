/**
 * Financial Document persistence barrel (IMP-028 / D-365 foundation).
 */

export { issueFinancialDocument } from "./issue";
export type { IssueFinancialDocumentOptions } from "./issue";

export {
  generateCustomerFinancialDocumentArtifact,
  getCustomerFinancialDocument,
  listFinancialDocumentsForCustomerOrder,
  resolveCustomerFinancialDocumentOwnership,
} from "./customer-access";
export type { CustomerFinancialDocumentOwnershipResolution } from "./customer-access";

export {
  assertIssuerProfileCompleteForIssuance,
  resolveAndLockEffectiveIssuerProfileForIssuance,
  resolveEffectiveIssuerProfileForIssuance,
} from "./profile-resolution";

export {
  issueReceiptVoucherForSucceededPayment,
  receiptVoucherLogicalIssuanceKey,
  buildReceiptVoucherLinesFromSnapshot,
} from "./receipt-voucher-from-payment";
export type {
  IssueReceiptVoucherForPaymentOptions,
  IssueReceiptVoucherForPaymentResult,
} from "./receipt-voucher-from-payment";

export {
  issueTaxInvoiceForFulfilledOrder,
  taxInvoiceLogicalIssuanceKey,
  buildTaxInvoiceLinesFromSnapshot,
} from "./tax-invoice-from-order";
export type {
  IssueTaxInvoiceForOrderOptions,
  IssueTaxInvoiceForOrderResult,
} from "./tax-invoice-from-order";

export {
  recoverMissingReceiptVouchersBatch,
  recoverMissingTaxInvoicesBatch,
} from "./recovery";
export type {
  ReceiptVoucherRecoveryBatchResult,
  ReceiptVoucherRecoveryItemResult,
  RecoverMissingReceiptVouchersOptions,
  TaxInvoiceRecoveryBatchResult,
  TaxInvoiceRecoveryItemResult,
  RecoverMissingTaxInvoicesOptions,
} from "./recovery";

export {
  runRecoverMissingReceiptVouchersOperator,
  runRecoverMissingTaxInvoicesOperator,
} from "./recovery-operator";
export type {
  RecoverMissingReceiptVouchersOperatorArgs,
  RecoverMissingReceiptVouchersOperatorResult,
  RecoverMissingTaxInvoicesOperatorArgs,
  RecoverMissingTaxInvoicesOperatorResult,
} from "./recovery-operator";

export {
  allocateStatutoryNumber,
  extractPostgresDriverCode,
  findFinancialDocumentById,
  findFinancialDocumentByLogicalIssuanceKey,
  findFulfilledOrderIdsMissingTaxInvoice,
  findIssuerProfileById,
  findNumberingSeriesById,
  findSucceededPaymentIdsMissingReceiptVoucher,
  insertIssuedFinancialDocument,
  insertIssuerProfile,
  insertNumberingSeries,
  listFinancialDocumentsForOrder,
  listIssuerProfilesForLegalEntity,
  lockActiveIssuerProfilesForLegalEntityForShare,
  lockAllIssuerProfilesForLegalEntityForShare,
  lockLegalEntityForIssuerProfileSetStabilization,
  loadFinancialDocument,
  loadFinancialDocumentLines,
  mapFinancialDocumentRow,
  mapIssuerProfileRow,
  mapNumberingSeriesRow,
  newFinancialDocumentId,
  newFinancialDocumentIssuerProfileId,
  newFinancialDocumentLineId,
  newFinancialDocumentNumberingSeriesId,
  resolveNumberingSeriesForScope,
  updateIssuedFinancialDocument,
} from "./repository";

export {
  ensureSignatureArtifactPending,
  findAuthorisedSignerProfileById,
  findSignatureArtifactByFinancialDocumentId,
  insertAuthorisedSignerProfile,
  listAuthorisedSignerProfilesForLegalEntity,
  listEffectiveAuthorisedSignerProfilesForLegalEntity,
  loadSignatureArtifactByFinancialDocumentId,
  lockSignatureArtifactForUpdate,
  mapAuthorisedSignerProfileRow,
  mapSignatureArtifactRow,
  newAuthorisedSignerProfileId,
  newSignatureArtifactId,
  sealSignatureArtifactSigned,
  transitionSignatureArtifactToFailedRetryable,
} from "./signature-repository";

export {
  ensurePendingSignatureArtifactForFinancialDocument,
  exportUnsignedFinancialDocumentPdf,
  hasProductionAuthorisedSignerProfile,
  listOutstandingSignatureWork,
  loadSignedFinancialDocumentArtifactForCustomer,
  uploadManualSignedPdf,
} from "./manual-signed-upload";
export type {
  ManualSignedPdfUploadInput,
  ManualSignedPdfUploadResult,
  OutstandingSignatureWorkItem,
} from "./manual-signed-upload";

export {
  findSignedArtifactStoredObjectByReference,
  getExactSignedArtifactBytes,
  putImmutableSignedArtifactBytes,
  verifyExactSignedArtifactHash,
} from "./signed-artifact-store";
export type {
  SignedArtifactStoredObject,
  SignedArtifactStorePutResult,
} from "./signed-artifact-store";

export {
  runSigningOperatorExport,
  runSigningOperatorPending,
  runSigningOperatorUpload,
} from "./signing-operator";
export type {
  SigningOperatorExportArgs,
  SigningOperatorExportResult,
  SigningOperatorPendingArgs,
  SigningOperatorPendingResult,
  SigningOperatorUploadArgs,
  SigningOperatorUploadResult,
} from "./signing-operator";