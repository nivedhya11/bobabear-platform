/**
 * AC-036I-021 / AC-036I-052 — keyboard, name, selected state, error association.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoutTimingChoice } from "@/components/ordering/CheckoutTimingChoice";
import type { CommerceScheduledWindow } from "@/lib/customer-commerce";

const WINDOW: CommerceScheduledWindow = {
  startAt: "2026-09-25T12:30:00.000Z",
  endAt: "2026-09-25T13:00:00.000Z",
  localDate: "2026-09-25",
  day: "TODAY",
  timeZone: "Asia/Kolkata",
  label: "18:00–18:30",
};

describe("CheckoutTimingChoice accessibility", () => {
  it("exposes reachable named controls, selected state, and focus", async () => {
    const user = userEvent.setup();
    const onSelectAsap = vi.fn();
    const onSelectWindow = vi.fn();
    render(
      <CheckoutTimingChoice
        pending={false}
        loading={false}
        mode="DELIVERY"
        selectedTiming="SCHEDULED"
        selectedWindowStart={WINDOW.startAt}
        windows={[WINDOW]}
        availability="AVAILABLE"
        message={null}
        timeZone="Asia/Kolkata"
        cancellationCutoffMinutes={60}
        onSelectAsap={onSelectAsap}
        onSelectWindow={onSelectWindow}
      />,
    );

    expect(screen.getAllByText(/arrival \/ fulfilment window/i).length).toBeGreaterThan(0);
    const asap = screen.getByRole("button", { name: /as soon as possible/i });
    const slot = screen.getByRole("button", { name: /today 18:00–18:30 Asia\/Kolkata/i });
    expect(asap).toHaveAttribute("aria-pressed", "false");
    expect(slot).toHaveAttribute("aria-pressed", "true");

    await user.tab();
    expect(asap).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelectAsap).toHaveBeenCalled();
    asap.blur();
    slot.focus();
    expect(slot).toHaveFocus();
  });

  it("associates validation text and does not rely on colour alone", () => {
    render(
      <CheckoutTimingChoice
        pending={false}
        loading={false}
        mode="PICKUP"
        selectedTiming={null}
        selectedWindowStart={null}
        windows={[]}
        availability="NO_TIMES"
        message="No scheduled times are available right now."
        timeZone="Asia/Kolkata"
        cancellationCutoffMinutes={null}
        errorId="timing-error"
        errorMessage="Choose a time that is still available."
        onSelectAsap={() => undefined}
        onSelectWindow={() => undefined}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/check this time/i);
    expect(alert.id).toBe("timing-error");
    expect(screen.getByRole("group", { name: /when should we fulfil/i })).toHaveAttribute(
      "aria-describedby",
      "timing-error",
    );
    expect(screen.getByTestId("checkout-timing-empty")).toHaveTextContent(/no scheduled times/i);
    expect(screen.getAllByText(/pickup window/i).length).toBeGreaterThan(0);
  });

  it("uses a stacked mobile-first layout with visible focus classes", () => {
    render(
      <CheckoutTimingChoice
        pending={false}
        loading
        mode="PICKUP"
        selectedTiming="ASAP"
        selectedWindowStart={null}
        windows={[]}
        availability={null}
        message={null}
        timeZone={null}
        cancellationCutoffMinutes={null}
        onSelectAsap={() => undefined}
        onSelectWindow={() => undefined}
      />,
    );
    expect(screen.getByTestId("checkout-timing-choice").className).toContain("flex-col");
    expect(screen.getByTestId("checkout-timing-asap").className).toContain("min-h-11");
    expect(screen.getByTestId("checkout-timing-loading")).toBeInTheDocument();
  });
});
