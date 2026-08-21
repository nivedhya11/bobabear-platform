import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
  it("links legal navigation to the canonical static-export privacy route", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy/");
  });
});
