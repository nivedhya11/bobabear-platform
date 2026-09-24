/**
 * AC-036H-041 — fulfilment choice accessibility + no-Maps on Pickup path.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoutFulfilmentChoice } from "@/components/ordering/CheckoutFulfilmentChoice";

describe("CheckoutFulfilmentChoice (AC-036H-041)", () => {
  it("exposes accessible names, selected state, and keyboard operation", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <CheckoutFulfilmentChoice
        pending={false}
        selectedMode={null}
        onSelect={onSelect}
        errorId="checkout-fulfilment-error"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /how would you like your order/i }),
    ).toBeInTheDocument();
    const delivery = screen.getByRole("button", { name: /delivery/i });
    const pickup = screen.getByRole("button", { name: /pickup/i });
    expect(delivery).toHaveAttribute("aria-pressed", "false");
    expect(pickup).toHaveAttribute("aria-pressed", "false");

    await user.tab();
    expect(delivery).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("DELIVERY");

    rerender(
      <CheckoutFulfilmentChoice
        pending={false}
        selectedMode="PICKUP"
        onSelect={onSelect}
        errorId="checkout-fulfilment-error"
      />,
    );
    expect(screen.getByRole("button", { name: /pickup/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("announces errors without colour-only signalling", () => {
    render(
      <CheckoutFulfilmentChoice
        pending={false}
        selectedMode={null}
        onSelect={() => undefined}
        errorId="checkout-fulfilment-error"
        errorMessage="Pickup is not available right now."
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/unavailable/i);
    expect(alert).toHaveTextContent(/pickup is not available/i);
    expect(alert.id).toBe("checkout-fulfilment-error");
  });
});

describe("Pickup path Maps isolation (AC-036H-030)", () => {
  it("does not load Maps/Places globals when choosing Pickup alone", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CheckoutFulfilmentChoice
        pending={false}
        selectedMode={null}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: /pickup/i }));
    expect(onSelect).toHaveBeenCalledWith("PICKUP");
    expect((globalThis as { google?: unknown }).google).toBeUndefined();
    expect(document.querySelector("script[src*='maps.googleapis.com']")).toBeNull();
  });
});
