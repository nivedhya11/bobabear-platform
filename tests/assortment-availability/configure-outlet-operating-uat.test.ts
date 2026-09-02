import { describe, expect, it } from "vitest";

import { isExpectedUatOperatingConfiguration } from "../../scripts/assortment/configure-outlet-operating-uat";

const fullWeek = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 0,
  endMinute: 1440,
}));

describe("local UAT operating bootstrap", () => {
  it("requires the exact Asia/Kolkata 24x7 schedule rather than any existing schedule", () => {
    expect(
      isExpectedUatOperatingConfiguration(
        { timezone: "Asia/Kolkata" } as never,
        fullWeek as never,
      ),
    ).toBe(true);
    expect(
      isExpectedUatOperatingConfiguration(
        { timezone: "Asia/Kolkata" } as never,
        fullWeek.slice(0, 1) as never,
      ),
    ).toBe(false);
    expect(
      isExpectedUatOperatingConfiguration(
        { timezone: "UTC" } as never,
        fullWeek as never,
      ),
    ).toBe(false);
  });
});
