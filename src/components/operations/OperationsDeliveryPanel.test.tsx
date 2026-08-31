/**
 * Operations Delivery panel UX invariants (IMP-032).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("OperationsDeliveryPanel source invariants", () => {
  const source = readFileSync("src/components/operations/OperationsDeliveryPanel.tsx", "utf8");

  it("instructs external booking only after begin manual booking path", () => {
    expect(source).toContain("Begin manual booking in BOBA before attempting external courier booking");
    expect(source).toContain("External booking may now be attempted");
  });

  it("gates lifecycle commands via permittedCommands", () => {
    expect(source).toContain('has("BEGIN_MANUAL_BOOKING")');
    expect(source).toContain('has("CONFIRM_MANUAL_BOOKING")');
    expect(source).toContain('has("RECORD_ASSIGNMENT")');
    expect(source).toContain('has("CONFIRM_PICKUP")');
    expect(source).toContain('has("CONFIRM_DELIVERY")');
    expect(source).toContain('has("RESOLVE_MANUAL_BOOKING_FAILURE")');
  });

  it("surfaces revision conflict refresh handling", () => {
    expect(source).toContain("DELIVERY_REVISION_CONFLICT");
    expect(source).toContain("Refreshing");
  });
});
