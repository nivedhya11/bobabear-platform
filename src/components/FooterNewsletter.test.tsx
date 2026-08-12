import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FooterNewsletter } from "./FooterNewsletter";

describe("FooterNewsletter", () => {
  const originalOpen = window.open;

  beforeEach(() => {
    window.open = vi.fn();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it("renders the contact input and submit button", () => {
    render(<FooterNewsletter />);
    expect(
      screen.getByLabelText(/mobile number or email to join the boba bear community/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notify me/i })).toBeInTheDocument();
  });

  it("shows the idle hint before the visitor types anything", () => {
    render(<FooterNewsletter />);
    expect(screen.getByText("Email us or drop your number")).toBeInTheDocument();
  });

  it("switches the hint to the WhatsApp path for a non-email value (conditional rendering)", async () => {
    const user = userEvent.setup();
    render(<FooterNewsletter />);

    const input = screen.getByLabelText(/mobile number or email/i);
    await user.type(input, "9876543210");

    expect(screen.getByText("Will open WhatsApp →")).toBeInTheDocument();
  });

  it("switches the hint to the email path for an email-shaped value (conditional rendering)", async () => {
    const user = userEvent.setup();
    render(<FooterNewsletter />);

    const input = screen.getByLabelText(/mobile number or email/i);
    await user.type(input, "reader@example.com");

    expect(screen.getByText("Will open your mail app →")).toBeInTheDocument();
  });

  it("opens WhatsApp on submit for a non-email value (user interaction)", async () => {
    const user = userEvent.setup();
    render(<FooterNewsletter />);

    await user.type(screen.getByLabelText(/mobile number or email/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /notify me/i }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("wa.me"),
      "_blank",
      "noopener,noreferrer",
    );
  });
});
