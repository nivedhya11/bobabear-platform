import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConsequenceReviewDialog } from "../../src/components/administration/commercial/ConsequenceReviewDialog";

const baseProps = {
  open: true,
  title: "Review publish",
  draftLabel: "Draft: Milk Tea",
  effectiveLabel: "Effective: Classic Tea",
  dimensions: [{ label: "Lifecycle", value: "draft → active" }],
  revisionLabel: "Expected revision",
  revisionValue: "7",
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

describe("ConsequenceReviewDialog", () => {
  it("open renders dialog with draft and effective labels", () => {
    render(<ConsequenceReviewDialog {...baseProps} />);
    expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Draft: Milk Tea")).toBeInTheDocument();
    expect(screen.getByText("Effective (customer)")).toBeInTheDocument();
    expect(screen.getByText("Effective: Classic Tea")).toBeInTheDocument();
  });

  it("Cancel calls onCancel without confirm", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConsequenceReviewDialog {...baseProps} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Confirm calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConsequenceReviewDialog {...baseProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Confirm effect" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Escape cancels when not busy", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConsequenceReviewDialog {...baseProps} onCancel={onCancel} busy={false} />);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("blockers disable confirm", () => {
    render(
      <ConsequenceReviewDialog
        {...baseProps}
        blockers={["Missing effective pricing"]}
      />,
    );
    expect(screen.getByText("Cannot proceed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm effect" })).toBeDisabled();
  });
});
