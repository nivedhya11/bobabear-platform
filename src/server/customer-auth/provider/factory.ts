/**
 * Customer OTP provider factory (IMP-009).
 *
 * Staging/production always fail closed — no approved production SMS
 * adapter exists in this slice. DLT configuration keys are recognized as
 * future requirements but never invented or populated here.
 */
import type { AppEnvironment } from "../../../platform/config";
import { CustomerOtpProviderError } from "../errors";
import { createLocalCustomerOtpProvider } from "./local";
import type { CustomerOtpProvider } from "./types";

export type CustomerOtpProviderKind = "local" | "disabled";

export type CreateCustomerOtpProviderInput = Readonly<{
  kind: CustomerOtpProviderKind;
  environmentType: AppEnvironment;
  fixedCode?: string | null;
  /** Reserved for a future approved production adapter. Never populated. */
  dlt?: Readonly<{
    principalEntityId?: string;
    header?: string;
    templateId?: string;
  }>;
}>;

/**
 * Future production-provider gate. Always throws until an approved SMS
 * adapter is selected in a later slice. Requires DLT values to be present
 * when that adapter is introduced.
 */
export function assertProductionCustomerOtpProviderReady(
  dlt: CreateCustomerOtpProviderInput["dlt"],
): never {
  const missing: string[] = [];
  if (!dlt?.principalEntityId) missing.push("CUSTOMER_OTP_DLT_PRINCIPAL_ENTITY_ID");
  if (!dlt?.header) missing.push("CUSTOMER_OTP_DLT_HEADER");
  if (!dlt?.templateId) missing.push("CUSTOMER_OTP_DLT_TEMPLATE_ID");
  void missing;
  throw new CustomerOtpProviderError(
    "No approved production customer OTP provider adapter is configured.",
    "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
  );
}

export function createCustomerOtpProvider(
  input: CreateCustomerOtpProviderInput,
): CustomerOtpProvider {
  if (
    input.environmentType === "staging" ||
    input.environmentType === "production"
  ) {
    assertProductionCustomerOtpProviderReady(input.dlt);
  }

  if (input.kind === "local") {
    return createLocalCustomerOtpProvider({
      environmentType: input.environmentType,
      fixedCode: input.fixedCode ?? null,
    });
  }

  throw new CustomerOtpProviderError(
    "Customer OTP provider is disabled.",
    "CUSTOMER_OTP_PROVIDER_DISABLED",
  );
}

export type { CustomerOtpProvider } from "./types";
