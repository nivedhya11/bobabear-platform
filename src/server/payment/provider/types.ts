/**
 * Payment provider port (IMP-022).
 *
 * Provider-neutral — no gateway SDK. Outcomes normalize into
 * {@link NormalizedProviderEvidence}; core Payment/Attempt statuses are
 * owned by the Payment domain, not the adapter.
 */

import type { NormalizedProviderEvidence } from "../../../shared/payment";

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
  ): Promise<NormalizedProviderEvidence>;
}>;
