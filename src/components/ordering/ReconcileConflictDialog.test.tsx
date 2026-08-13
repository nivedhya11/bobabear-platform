import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReconcileConflictDialog } from "./ReconcileConflictDialog";

describe("reconcile conflict choice", () => {
  it("requires an explicit KEEP_GUEST or KEEP_CUSTOMER decision", async () => {
    const onChoose = vi.fn();
    render(<ReconcileConflictDialog pending={false} onChoose={onChoose} />);
    await userEvent.click(screen.getByRole("button", { name: /keep guest cart/i }));
    expect(onChoose).toHaveBeenCalledWith("KEEP_GUEST");
    await userEvent.click(screen.getByRole("button", { name: /keep signed-in cart/i }));
    expect(onChoose).toHaveBeenCalledWith("KEEP_CUSTOMER");
  });
});
