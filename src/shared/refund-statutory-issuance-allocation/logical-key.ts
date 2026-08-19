/**
 * Logical identity for D-366 Slice 3A PARTIAL issuance allocation.
 *
 * One RefundStatutoryDecision → at most one issuance-allocation authority:
 *   refund-statutory-decision:<decisionId>:ISSUANCE_ALLOCATION
 */
import {
  REFUND_STATUTORY_ISSUANCE_ALLOCATION_LOGICAL_KEY_PREFIX,
  REFUND_STATUTORY_ISSUANCE_ALLOCATION_PURPOSE,
} from "./constants";
import { RefundStatutoryIssuanceAllocationError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRefundStatutoryIssuanceAllocationUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertRefundStatutoryIssuanceAllocationUuid(
  value: string,
  field: string,
): string {
  const trimmed = value.trim();
  if (!isRefundStatutoryIssuanceAllocationUuid(trimmed)) {
    throw new RefundStatutoryIssuanceAllocationError(
      "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return trimmed;
}

export function buildRefundStatutoryIssuanceAllocationLogicalKey(
  decisionId: string,
): string {
  const trimmed = assertRefundStatutoryIssuanceAllocationUuid(
    decisionId,
    "decisionId",
  );
  return `${REFUND_STATUTORY_ISSUANCE_ALLOCATION_LOGICAL_KEY_PREFIX}${trimmed}:${REFUND_STATUTORY_ISSUANCE_ALLOCATION_PURPOSE}`;
}
