/**
 * Pure Delivery domain tests (IMP-031 lifecycle / return / assignment).
 */
import { describe, expect, it } from "vitest";

import {
  isAllowedDeliveryExecutionTransition,
  isAllowedDeliveryReturnTransition,
  isDeliveryActiveStatus,
  isDeliveryCancellationAllowed,
  isDeliveryReturnEligible,
  isDeliveryTerminalStatus,
  DELIVERY_EXECUTION_STATUSES,
  DELIVERY_RETURN_STATUSES,
} from "./index";

describe("delivery execution lifecycle", () => {
  it("allows the locked transition matrix and forbids everything else", () => {
    const allowed: Array<[string, string]> = [
      ["REQUESTED", "BOOKING_OUTCOME_UNKNOWN"],
      ["REQUESTED", "BOOKED"],
      ["REQUESTED", "FAILED"],
      ["REQUESTED", "CANCELLED"],
      ["BOOKING_OUTCOME_UNKNOWN", "BOOKED"],
      ["BOOKING_OUTCOME_UNKNOWN", "FAILED"],
      ["BOOKING_OUTCOME_UNKNOWN", "CANCELLED"],
      ["BOOKED", "PICKED_UP"],
      ["BOOKED", "FAILED"],
      ["BOOKED", "CANCELLED"],
      ["PICKED_UP", "DELIVERED"],
      ["PICKED_UP", "FAILED"],
    ];

    for (const from of DELIVERY_EXECUTION_STATUSES) {
      for (const to of DELIVERY_EXECUTION_STATUSES) {
        const expectAllowed =
          from === to ||
          allowed.some(([a, b]) => a === from && b === to);
        expect(
          isAllowedDeliveryExecutionTransition(from, to),
          `${from} → ${to}`,
        ).toBe(expectAllowed);
      }
    }
  });

  it("marks terminal statuses immutable", () => {
    expect(isDeliveryTerminalStatus("DELIVERED")).toBe(true);
    expect(isDeliveryTerminalStatus("FAILED")).toBe(true);
    expect(isDeliveryTerminalStatus("CANCELLED")).toBe(true);
    expect(isDeliveryTerminalStatus("BOOKED")).toBe(false);
    expect(isAllowedDeliveryExecutionTransition("DELIVERED", "FAILED")).toBe(
      false,
    );
    expect(isAllowedDeliveryExecutionTransition("FAILED", "REQUESTED")).toBe(
      false,
    );
    expect(isAllowedDeliveryExecutionTransition("CANCELLED", "BOOKED")).toBe(
      false,
    );
  });

  it("treats assignment-like statuses as non-lifecycle", () => {
    expect(isDeliveryActiveStatus("BOOKED")).toBe(true);
    expect(isDeliveryActiveStatus("DELIVERED")).toBe(false);
    // No courier-search / arrival / reassignment execution states exist.
    expect(
      (DELIVERY_EXECUTION_STATUSES as readonly string[]).includes("ASSIGNED"),
    ).toBe(false);
    expect(
      (DELIVERY_EXECUTION_STATUSES as readonly string[]).includes("ARRIVED"),
    ).toBe(false);
  });

  it("prohibits cancellation after pickup", () => {
    expect(isDeliveryCancellationAllowed("REQUESTED")).toBe(true);
    expect(isDeliveryCancellationAllowed("BOOKING_OUTCOME_UNKNOWN")).toBe(true);
    expect(isDeliveryCancellationAllowed("BOOKED")).toBe(true);
    expect(isDeliveryCancellationAllowed("PICKED_UP")).toBe(false);
    expect(isDeliveryCancellationAllowed("DELIVERED")).toBe(false);
    expect(isAllowedDeliveryExecutionTransition("PICKED_UP", "CANCELLED")).toBe(
      false,
    );
  });
});

describe("delivery return lifecycle", () => {
  it("allows the locked return transition matrix", () => {
    const allowed: Array<[string, string]> = [
      ["RETURN_REQUESTED", "RETURNING"],
      ["RETURN_REQUESTED", "RETURN_FAILED"],
      ["RETURNING", "RETURNED"],
      ["RETURNING", "RETURN_FAILED"],
    ];
    for (const from of DELIVERY_RETURN_STATUSES) {
      for (const to of DELIVERY_RETURN_STATUSES) {
        const expectAllowed =
          from === to ||
          allowed.some(([a, b]) => a === from && b === to);
        expect(
          isAllowedDeliveryReturnTransition(from, to),
          `${from} → ${to}`,
        ).toBe(expectAllowed);
      }
    }
  });

  it("requires FAILED execution plus custody for return eligibility", () => {
    expect(
      isDeliveryReturnEligible({
        executionStatus: "FAILED",
        hadCourierCustody: true,
      }),
    ).toBe(true);
    expect(
      isDeliveryReturnEligible({
        executionStatus: "FAILED",
        hadCourierCustody: false,
      }),
    ).toBe(false);
    expect(
      isDeliveryReturnEligible({
        executionStatus: "CANCELLED",
        hadCourierCustody: true,
      }),
    ).toBe(false);
    expect(
      isDeliveryReturnEligible({
        executionStatus: "DELIVERED",
        hadCourierCustody: true,
      }),
    ).toBe(false);
  });
});
