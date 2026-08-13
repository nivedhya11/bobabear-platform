import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccessCTA } from "./AccessCTA";

// window.matchMedia in tests/setup/vitest.setup.ts reports
// prefers-reduced-motion: reduce, so AccessCTA (and the Reveal helpers it
// uses) render their plain final-state markup — deterministic, no
// animation/IntersectionObserver timing involved.
describe("AccessCTA", () => {
  it("makes owned Boba Bear ordering the primary CTA and keeps aggregators secondary", () => {
    render(<AccessCTA />);
    const owned = screen.getByRole("link", { name: /order with boba bear/i });
    expect(owned).toHaveAttribute("href", "/order");
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

  it("opens aggregator links in a new tab without leaking a window.opener reference", () => {
    render(<AccessCTA />);
    for (const name of [
      /order boba bear on zomato/i,
      /order boba bear on swiggy/i,
      /message boba bear on whatsapp/i,
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
    }
  });
});
