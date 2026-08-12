/**
 * Customer-commerce configuration errors (IMP-024).
 *
 * Safe for process-start failure reporting — never attach secrets, session
 * tokens, guest cart tokens, or raw PII.
 */
export type CustomerCommerceSafeIssue = Readonly<{
  key: string;
  message: string;
}>;

export class CustomerCommerceConfigurationError extends Error {
  readonly code = "CUSTOMER_COMMERCE_CONFIGURATION_INVALID" as const;
  readonly issues: readonly CustomerCommerceSafeIssue[];

  constructor(issues: readonly CustomerCommerceSafeIssue[]) {
    const summary = issues.map((i) => `${i.key}: ${i.message}`).join("; ");
    super(`customer-commerce configuration invalid: ${summary}`);
    this.name = "CustomerCommerceConfigurationError";
    this.issues = issues;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }
}
