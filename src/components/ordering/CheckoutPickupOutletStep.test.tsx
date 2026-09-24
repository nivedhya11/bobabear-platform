/**
 * AC-036H-003 / 004 / 032 / 041 — Pickup outlet step selection + a11y.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoutPickupOutletStep } from "@/components/ordering/CheckoutPickupOutletStep";
import type { CommercePickupOption } from "@/lib/customer-commerce";

const outletA: CommercePickupOption = {
  outletId: "11111111-1111-4111-8111-111111111111",
  displayName: "Mall Road Counter",
  addressLine1: "12 Mall Road",
  addressLine2: null,
  locality: "Rajpur",
  city: "Dehradun",
  stateCode: "IN-UT",
  postalCode: "248001",
  instructions: "Ask at counter",
  coordinates: null,
};

const outletB: CommercePickupOption = {
  ...outletA,
  outletId: "22222222-2222-4222-8222-222222222222",
  displayName: "ISBT Counter",
  addressLine1: "ISBT Road",
};

describe("CheckoutPickupOutletStep", () => {
  it("AC-036H-003: AUTO_SELECT shows sealed outlet without list selection", () => {
    render(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="AUTO_SELECT"
        outlets={[outletA]}
        selectedOutletId={outletA.outletId}
        onSelectOutlet={() => undefined}
        onContinue={() => undefined}
        onChooseDelivery={() => undefined}
        onBackToMode={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-pickup-outlet-auto")).toBeInTheDocument();
    expect(screen.getByText("Mall Road Counter")).toBeInTheDocument();
    expect(screen.getByText(/ask at counter/i)).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-pickup-outlet-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-destination-select")).not.toBeInTheDocument();
  });

  it("AC-036H-004: CUSTOMER_SELECT list is keyboard-selectable with accessible names", async () => {
    const user = userEvent.setup();
    const onSelectOutlet = vi.fn();
    render(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="CUSTOMER_SELECT"
        outlets={[outletA, outletB]}
        selectedOutletId={null}
        onSelectOutlet={onSelectOutlet}
        onContinue={() => undefined}
        onChooseDelivery={() => undefined}
        onBackToMode={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-pickup-outlet-list")).toBeInTheDocument();
    const optionA = screen.getByRole("option", { name: /pickup at mall road counter/i });
    const optionB = screen.getByRole("option", { name: /pickup at isbt counter/i });
    expect(optionA).toHaveAttribute("aria-selected", "false");
    await user.click(optionB);
    expect(onSelectOutlet).toHaveBeenCalledWith(outletB.outletId);
  });

  it("AC-036H-032: UNAVAILABLE shows clear empty state and Delivery escape", async () => {
    const user = userEvent.setup();
    const onChooseDelivery = vi.fn();
    render(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="UNAVAILABLE"
        outlets={[]}
        selectedOutletId={null}
        onSelectOutlet={() => undefined}
        onContinue={() => undefined}
        onChooseDelivery={onChooseDelivery}
        onBackToMode={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-pickup-unavailable")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/not available/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/delivery remains available/i);
    await user.click(screen.getByTestId("checkout-pickup-switch-delivery"));
    expect(onChooseDelivery).toHaveBeenCalled();
  });

  it("AC-036H-041: continue control is named and disabled until selection", () => {
    const { rerender } = render(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="CUSTOMER_SELECT"
        outlets={[outletA, outletB]}
        selectedOutletId={null}
        onSelectOutlet={() => undefined}
        onContinue={() => undefined}
        onChooseDelivery={() => undefined}
        onBackToMode={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-pickup-continue")).toBeDisabled();
    rerender(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="CUSTOMER_SELECT"
        outlets={[outletA, outletB]}
        selectedOutletId={outletA.outletId}
        onSelectOutlet={() => undefined}
        onContinue={() => undefined}
        onChooseDelivery={() => undefined}
        onBackToMode={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-pickup-continue")).toBeEnabled();
  });

  it("AC-036H-030: outlet step does not mount Maps globals", () => {
    render(
      <CheckoutPickupOutletStep
        pending={false}
        loading={false}
        selectionPolicy="AUTO_SELECT"
        outlets={[outletA]}
        selectedOutletId={outletA.outletId}
        onSelectOutlet={() => undefined}
        onContinue={() => undefined}
        onChooseDelivery={() => undefined}
        onBackToMode={() => undefined}
      />,
    );
    expect((globalThis as { google?: unknown }).google).toBeUndefined();
    expect(document.querySelector("script[src*='maps.googleapis.com']")).toBeNull();
  });
});
