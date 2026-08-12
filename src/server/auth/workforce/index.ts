/**
 * Public entry point for the workforce Better Auth realm (IMP-008). See
 * `customer/index.ts` for the shared rationale.
 */
import "server-only";

export { getWorkforceAuthRuntime } from "./runtime";
export type { WorkforceAuthRuntime, WorkforceBetterAuthInstance } from "./runtime";
