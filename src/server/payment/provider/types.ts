/**
 * Payment provider port (IMP-022).
 *
 * Provider-neutral — no gateway SDK. Outcomes normalize into
 * {@link NormalizedProviderEvidence}; core Payment/Attempt statuses are
 * owned by the Payment domain, not the adapter.
 */

import type { NormalizedProviderEvidence } from "../../../shared/payment";
import type { NormalizedRefundEvidence } from "../../../shared/refund";

export type PaymentProviderCreateExecutionInput = Readonly<{
  executionIdentity: string;
  amountPaise: bigint;
  currency: "INR";
  methodIntent: string;
  paymentId: string;
  attemptId: string;
}>;

export type PaymentProviderQueryExecutionInput = Readonly<{
  executionIdentity: string;
  provider: string;
}>;

export type PaymentProviderCancelExecutionInput = Readonly<{
  executionIdentity: string;
  provider: string;
}>;

export type PaymentProviderVerifyWebhookInput = Readonly<{
  rawBody: Uint8Array;
  headers: Readonly<Record<string, string>>;
}>;

export type PaymentProviderVerifyClientEvidenceInput = Readonly<{
  paymentId: string;
  attemptId: string;
  providerExecutionIdentity: string;
  kind: string;
  payload: Readonly<Record<string, string>>;
  /** Server-stored provider references — never browser-supplied Order IDs. */
  providerReferences?: ReadonlyArray<Readonly<{ kind: string; value: string }>>;
}>;

export type PaymentProviderCreateRefundInput = Readonly<{
  refundId: string;
  providerPaymentId: string;
  amountPaise: bigint;
  currency: "INR";
  idempotencyKey: string;
}>;

export type PaymentProviderQueryRefundInput = Readonly<{
  providerRefundId?: string;
  providerPaymentId?: string;
  amountPaise?: bigint;
  idempotencyKey?: string;
}>;

export type PaymentProviderWebhookEvidence =
  | NormalizedProviderEvidence
  | NormalizedRefundEvidence;

export type PaymentProvider = Readonly<{
  readonly name: string;
  createExecution(
    input: PaymentProviderCreateExecutionInput,
  ): Promise<NormalizedProviderEvidence>;
  queryExecution(
    input: PaymentProviderQueryExecutionInput,
  ): Promise<NormalizedProviderEvidence>;
  cancelExecution?(
    input: PaymentProviderCancelExecutionInput,
  ): Promise<NormalizedProviderEvidence>;
  verifyWebhook(
    input: PaymentProviderVerifyWebhookInput,
  ): Promise<PaymentProviderWebhookEvidence>;
  verifyClientEvidence?(
    input: PaymentProviderVerifyClientEvidenceInput,
  ): Promise<NormalizedProviderEvidence>;
  createRefund?(
    input: PaymentProviderCreateRefundInput,
  ): Promise<NormalizedRefundEvidence>;
  queryRefund?(
    input: PaymentProviderQueryRefundInput,
  ): Promise<NormalizedRefundEvidence>;
}>;
