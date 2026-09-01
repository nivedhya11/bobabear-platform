import { describe, expect, it } from "vitest";

import {
  compactDeliveryDisplayLabel,
  deliveryHeaderContext,
} from "@/lib/customer-location/display-label";

describe("compactDeliveryDisplayLabel", () => {
  it("deduplicates locality tokens and compacts long Google addresses", () => {
    const label = compactDeliveryDisplayLabel(
      "Ghanta Ghar, Ghanta Ghar, Chukkuwala, Dehradun, Uttarakhand 248001, India",
    );
    expect(label).toBe("Ghanta Ghar, Dehradun");
  });

  it("keeps PIN-only labels", () => {
    expect(compactDeliveryDisplayLabel("248001")).toBe("248001");
  });

  it("compacts saved-address style labels", () => {
    const label = compactDeliveryDisplayLabel("Home · Rajpur Road, Dehradun · 248001");
    expect(label).toContain("Home");
    expect(label).toContain("Rajpur");
    expect(label).not.toContain("248001");
  });
});

describe("deliveryHeaderContext", () => {
  it("returns two-line header structure", () => {
    const header = deliveryHeaderContext(
      "Ghanta Ghar, Ghanta Ghar, Chukkuwala, Dehradun, Uttarakhand 248001, India",
      "Dehradun",
    );
    expect(header.title).toBe("Delivering to");
    expect(header.context).toBe("Ghanta Ghar, Dehradun");
  });
});
