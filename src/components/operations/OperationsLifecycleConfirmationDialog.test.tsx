import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OperationsLifecycleConfirmationDialog } from "./OperationsLifecycleConfirmationDialog";
import { OPERATIONS_CANCELLATION_REASON_CODES } from "@/lib/operations/types";

describe("OperationsLifecycleConfirmationDialog", () => {
  it("exposes an accessible dialog name and moves initial focus inside", async () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <button type="button">Trigger</button>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    trigger.focus();

    render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Accept this order?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("cycles Tab and Shift+Tab within the dialog", async () => {
    const user = userEvent.setup();
    render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons.length).toBe(2);

    buttons[0].focus();
    await user.tab();
    expect(document.activeElement).toBe(buttons[1]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[0]);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("restores focus to the previously focused control on unmount", async () => {
    const onDismiss = vi.fn();
    render(<button type="button">Open accept</button>);
    const trigger = screen.getByRole("button", { name: "Open accept" });
    trigger.focus();

    const dialogRender = render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    dialogRender.unmount();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape when not pending", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <OperationsLifecycleConfirmationDialog
        action="FULFIL"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss on Escape while pending", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <OperationsLifecycleConfirmationDialog
        action="FULFIL"
        orderNumber="ORD-1"
        pending
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Updating order…")).toBeInTheDocument();
  });

  it("confirms and dismisses with native buttons", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm accept" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate confirm while pending", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Confirm accept" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("requires a cancellation reason and submits only canonical codes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onReason = vi.fn();
    const { rerender } = render(
      <OperationsLifecycleConfirmationDialog
        action="CANCEL"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode=""
        onCancellationReasonChange={onReason}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Cancellation reason")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm cancel" })).toBeDisabled();

    const select = screen.getByLabelText("Cancellation reason");
    const optionValues = Array.from(select.querySelectorAll("option")).map((option) => option.value);
    for (const code of OPERATIONS_CANCELLATION_REASON_CODES) {
      expect(optionValues).toContain(code);
    }

    await user.selectOptions(select, "ITEM_UNAVAILABLE");
    expect(onReason).toHaveBeenCalledWith("ITEM_UNAVAILABLE");

    rerender(
      <OperationsLifecycleConfirmationDialog
        action="CANCEL"
        orderNumber="ORD-1"
        pending={false}
        error={null}
        cancellationReasonCode="ITEM_UNAVAILABLE"
        onCancellationReasonChange={onReason}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm cancel" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Confirm cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("exposes error feedback with role=alert", () => {
    render(
      <OperationsLifecycleConfirmationDialog
        action="ACCEPT"
        orderNumber="ORD-1"
        pending={false}
        error="You do not have permission to perform this action."
        cancellationReasonCode=""
        onCancellationReasonChange={vi.fn()}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/do not have permission/i);
  });
});
