import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPendingRefundCommand } from "@/lib/operations/pending-refund-command";
import * as refundsClient from "@/lib/operations/refunds";

import { OperationsRefundPanel } from "./OperationsRefundPanel";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/lib/operations/refunds", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/refunds")>(
    "@/lib/operations/refunds",
  );
  let uuidSeq = 0;
  return {
    ...actual,
    getOrderRefunds: vi.fn(),
    createOrderRefund: vi.fn(),
    createRefundRequestId: () => {
      uuidSeq += 1;
      return `11111111-1111-4111-8111-${String(uuidSeq).padStart(12, "0")}`;
    },
    refundStatusLabel: (status: string) => `status:${status}`,
    __resetUuidSeq: () => {
      uuidSeq = 0;
    },
  };
});

const getOrderRefunds = vi.mocked(refundsClient.getOrderRefunds);
const createOrderRefund = vi.mocked(refundsClient.createOrderRefund);
const resetUuidSeq = (
  refundsClient as typeof refundsClient & { __resetUuidSeq?: () => void }
).__resetUuidSeq;

function readyBalance(remaining = "27195") {
  return {
    capturedAmountPaise: "27195",
    processedRefundedAmountPaise: "0",
    reservedAmountPaise: "0",
    remainingRefundableAmountPaise: remaining,
    fullyRefunded: false,
  };
}

beforeEach(() => {
  resetUuidSeq?.();
  window.sessionStorage.clear();
  clearPendingRefundCommand(ORDER_ID);
  getOrderRefunds.mockReset();
  createOrderRefund.mockReset();
  getOrderRefunds.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      paymentStatus: "SUCCEEDED",
      balance: readyBalance(),
      refunds: [],
    },
  });
});

afterEach(() => {
  window.sessionStorage.clear();
  clearPendingRefundCommand(ORDER_ID);
});

describe("OperationsRefundPanel", () => {
  it("uses one UUID for one logical submission and retries the same UUID after NETWORK_ERROR", async () => {
    const user = userEvent.setup();
    createOrderRefund
      .mockResolvedValueOnce({ ok: false, status: 0, code: "NETWORK_ERROR" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          paymentStatus: "SUCCEEDED",
          balance: readyBalance("17195"),
          refund: {
            refundId: "11111111-1111-4111-8111-000000000001",
            amountPaise: "10000",
            currency: "INR",
            status: "ACCEPTED",
            reason: "partial support refund",
            operatorNote: null,
            createdAt: "2026-09-05T00:00:00.000Z",
            acceptedAt: "2026-09-05T00:00:00.000Z",
            pendingAt: null,
            indeterminateAt: null,
            processedAt: null,
            failedAt: null,
            recoveryHint: "awaiting provider",
          },
        },
      });

    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByLabelText("Refund amount (₹)");

    await user.type(screen.getByLabelText("Refund amount (₹)"), "100.00");
    await user.type(screen.getByLabelText("Reason"), "partial support refund");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(
        /Check refund status or retry this same request/i,
      );
    });
    expect(screen.getByRole("alert").textContent).not.toMatch(/Refresh before trying again/i);
    expect(createOrderRefund).toHaveBeenCalledTimes(1);
    expect(createOrderRefund.mock.calls[0]?.[1]).toMatchObject({
      refundRequestId: "11111111-1111-4111-8111-000000000001",
      amountPaise: "10000",
      reason: "partial support refund",
    });

    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(2));
    expect(createOrderRefund.mock.calls[1]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000001",
    );
  });

  it("reconciles an ambiguous pending UUID from GET without creating another command", async () => {
    const user = userEvent.setup();
    createOrderRefund.mockResolvedValueOnce({ ok: false, status: 0, code: "NETWORK_ERROR" });
    getOrderRefunds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { paymentStatus: "SUCCEEDED", balance: readyBalance(), refunds: [] },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          paymentStatus: "SUCCEEDED",
          balance: readyBalance("17195"),
          refunds: [
            {
              refundId: "11111111-1111-4111-8111-000000000001",
              amountPaise: "10000",
              currency: "INR",
              status: "ACCEPTED",
              reason: "partial support refund",
              operatorNote: null,
              createdAt: "2026-09-05T00:00:00.000Z",
              acceptedAt: "2026-09-05T00:00:00.000Z",
              pendingAt: null,
              indeterminateAt: null,
              processedAt: null,
              failedAt: null,
              recoveryHint: "awaiting provider",
            },
          ],
        },
      });

    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByLabelText("Refund amount (₹)");
    await user.type(screen.getByLabelText("Refund amount (₹)"), "100");
    await user.type(screen.getByLabelText("Reason"), "partial support refund");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await screen.findByRole("button", { name: "Check refund status" });
    await user.click(screen.getByRole("button", { name: "Check refund status" }));

    await waitFor(() => {
      expect(screen.getByText(/status:ACCEPTED/i)).toBeTruthy();
    });
    expect(createOrderRefund).toHaveBeenCalledTimes(1);
  });

  it("does not silently replace an unresolved ambiguous UUID when immutable facts change", async () => {
    const user = userEvent.setup();
    createOrderRefund.mockResolvedValueOnce({ ok: false, status: 0, code: "NETWORK_ERROR" });

    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByLabelText("Refund amount (₹)");
    await user.type(screen.getByLabelText("Refund amount (₹)"), "100");
    await user.type(screen.getByLabelText("Reason"), "first command");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(1));

    await user.clear(screen.getByLabelText("Refund amount (₹)"));
    await user.type(screen.getByLabelText("Refund amount (₹)"), "50");
    await user.clear(screen.getByLabelText("Reason"));
    await user.type(screen.getByLabelText("Reason"), "different amount");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(
        /previous refund request is still unconfirmed/i,
      );
    });
    expect(createOrderRefund).toHaveBeenCalledTimes(1);
    expect(createOrderRefund.mock.calls[0]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000001",
    );
    expect(screen.getByRole("button", { name: "Check refund status" })).toBeTruthy();
  });

  it("reuses the same UUID after NETWORK_ERROR even when sessionStorage.setItem throws", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("setItem blocked");
    });
    createOrderRefund
      .mockResolvedValueOnce({ ok: false, status: 0, code: "NETWORK_ERROR" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          paymentStatus: "SUCCEEDED",
          balance: readyBalance("17195"),
          refund: {
            refundId: "11111111-1111-4111-8111-000000000001",
            amountPaise: "10000",
            currency: "INR",
            status: "ACCEPTED",
            reason: "storage failure retry",
            operatorNote: null,
            createdAt: "2026-09-05T00:00:00.000Z",
            acceptedAt: "2026-09-05T00:00:00.000Z",
            pendingAt: null,
            indeterminateAt: null,
            processedAt: null,
            failedAt: null,
            recoveryHint: "awaiting provider",
          },
        },
      });

    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByLabelText("Refund amount (₹)");
    await user.type(screen.getByLabelText("Refund amount (₹)"), "100.00");
    await user.type(screen.getByLabelText("Reason"), "storage failure retry");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(2));
    expect(createOrderRefund.mock.calls[0]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000001",
    );
    expect(createOrderRefund.mock.calls[1]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000001",
    );
    setItem.mockRestore();
  });

  it("issues a new UUID for a genuinely new logical Refund after a successful prior command", async () => {
    const user = userEvent.setup();
    createOrderRefund
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          paymentStatus: "SUCCEEDED",
          balance: readyBalance("17195"),
          refund: {
            refundId: "11111111-1111-4111-8111-000000000001",
            amountPaise: "10000",
            currency: "INR",
            status: "ACCEPTED",
            reason: "first logical",
            operatorNote: null,
            createdAt: "2026-09-05T00:00:00.000Z",
            acceptedAt: "2026-09-05T00:00:00.000Z",
            pendingAt: null,
            indeterminateAt: null,
            processedAt: null,
            failedAt: null,
            recoveryHint: null,
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          paymentStatus: "SUCCEEDED",
          balance: readyBalance("12195"),
          refund: {
            refundId: "11111111-1111-4111-8111-000000000002",
            amountPaise: "5000",
            currency: "INR",
            status: "ACCEPTED",
            reason: "second logical",
            operatorNote: null,
            createdAt: "2026-09-05T00:00:00.000Z",
            acceptedAt: "2026-09-05T00:00:00.000Z",
            pendingAt: null,
            indeterminateAt: null,
            processedAt: null,
            failedAt: null,
            recoveryHint: null,
          },
        },
      });

    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByLabelText("Refund amount (₹)");
    await user.type(screen.getByLabelText("Refund amount (₹)"), "100");
    await user.type(screen.getByLabelText("Reason"), "first logical");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Refund amount (₹)"), "50");
    await user.type(screen.getByLabelText("Reason"), "second logical");
    await user.click(screen.getByRole("button", { name: "Authorize refund" }));
    await waitFor(() => expect(createOrderRefund).toHaveBeenCalledTimes(2));
    expect(createOrderRefund.mock.calls[0]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000001",
    );
    expect(createOrderRefund.mock.calls[1]?.[1].refundRequestId).toBe(
      "11111111-1111-4111-8111-000000000002",
    );
  });

  it("rejects invalid currency strings and displays remaining balance via formatPaise", async () => {
    const user = userEvent.setup();
    render(<OperationsRefundPanel orderId={ORDER_ID} canInitiate />);
    await screen.findByText(/Remaining refundable: ₹271\.95/i);
    await user.type(screen.getByLabelText("Refund amount (₹)"), "1.001");
    await user.type(screen.getByLabelText("Reason"), "bad amount");
    expect(screen.getByRole("button", { name: "Authorize refund" })).toBeDisabled();
    expect(createOrderRefund).not.toHaveBeenCalled();
  });
});
