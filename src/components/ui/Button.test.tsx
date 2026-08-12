import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders user-visible text as an accessible button", () => {
    render(<Button>Access Drop</Button>);
    expect(screen.getByRole("button", { name: "Access Drop" })).toBeInTheDocument();
  });

  it("fires onClick when clicked (user interaction)", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Notify Me</Button>);

    await user.click(screen.getByRole("button", { name: "Notify Me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Notify Me
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Notify Me" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders the child element (not a <button>) when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/menu">View Menu</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "View Menu" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/menu");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
