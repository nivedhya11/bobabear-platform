import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccessCTA } from "./AccessCTA";

// window.matchMedia in tests/setup/vitest.setup.ts reports
// prefers-reduced-motion: reduce, so AccessCTA (and the Reveal helpers it
// uses) render their plain final-state markup — deterministic, no
// animation/IntersectionObserver timing involved.
describe("AccessCTA", () => {
  it("renders the three ordering-platform wordmarks (user-visible content)", () => {
    render(<AccessCTA />);
    expect(screen.getByText("Zomato")).toBeInTheDocument();
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("exposes each ordering platform as an accessible link with the current live destination", () => {
    render(<AccessCTA />);

    const zomato = screen.getByRole("link", { name: /order boba bear on zomato/i });
    expect(zomato).toHaveAttribute(
      "href",
      "https://link.zomato.com/xqzv/rshare?id=12538351530563d18",
    );

    const swiggy = screen.getByRole("link", { name: /order boba bear on swiggy/i });
    expect(swiggy).toHaveAttribute(
      "href",
      "https://www.swiggy.com/direct/brand/730987?source=swiggy-direct&subSource=generic",
    );

    const whatsapp = screen.getByRole("link", { name: /message boba bear on whatsapp/i });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21",
    );
  });

  it("opens every ordering link in a new tab without leaking a window.opener reference", () => {
    render(<AccessCTA />);
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
    }
  });
});
