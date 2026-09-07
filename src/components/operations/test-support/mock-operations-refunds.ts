/**
 * Shared mock function refs for `@/lib/operations/refunds`.
 *
 * Shared refs so Operations order-detail and refund-panel suites configure the
 * same `vi.fn` instances their components import. Divergent per-file factories
 * previously left `getOrderRefunds` returning `undefined` (unhandled
 * `result.ok` rejections) when mocks leaked or factories diverged.
 */
import { vi } from "vitest";

import type * as OperationsRefunds from "@/lib/operations/refunds";

export const mockGetOrderRefunds = vi.fn<typeof OperationsRefunds.getOrderRefunds>();
export const mockCreateOrderRefund = vi.fn<typeof OperationsRefunds.createOrderRefund>();
export const mockCreateRefundRequestId = vi.fn<typeof OperationsRefunds.createRefundRequestId>(
  () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
);
