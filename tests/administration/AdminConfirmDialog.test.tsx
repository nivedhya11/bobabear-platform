import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminConfirmDialog } from "../../src/components/administration/AdminConfirmDialog";

describe("AdminConfirmDialog", () => {
  it("exposes dialog accessible name and Confirm/Cancel controls", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AdminConfirmDialog
        open
        title="Deactivate resource"
        targetLabel="BRAND — Demo"
        scopeLabel="brands"
        consequenceLabel="Soft-deactivate only."
        confirmLabel="Deactivate"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deactivate resource" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByTestId("admin-confirm-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders high-consequence confirm controls without commercial md gate", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <AdminConfirmDialog
        open
        title="Deactivate resource"
        targetLabel="BRAND — Demo"
        scopeLabel="brands"
        consequenceLabel="Soft-deactivate only."
        confirmLabel="Confirm"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Deactivate resource" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
