import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  it("joins plain class strings in order", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy, undefined, null, and boolean-false inputs", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("resolves conditional (object-form) class inputs", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("resolves conflicting Tailwind utilities from the same group, keeping the last one", () => {
    // Both are "text-color" utilities in the same tailwind-merge group —
    // the later class must win, matching how cn() is used to override a
    // default color in downstream components.
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("resolves conflicting padding utilities, keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("preserves BOBA Bear custom typography classes alongside text-color classes", () => {
    // Regression guard for the extendTailwindMerge() config in utils.ts:
    // without registering the custom type-scale classes as their own
    // "font-size" group, tailwind-merge treats them as text-color utilities
    // and drops one of the two. Both must survive together.
    const result = cn("text-h1", "text-[var(--text-primary)]");
    expect(result).toContain("text-h1");
    expect(result).toContain("text-[var(--text-primary)]");
  });

  it("preserves a custom typography class alongside another custom typography class conflict resolution (last body size wins)", () => {
    // Two classes from the SAME custom group (font-size) should still
    // dedupe like any other Tailwind group — only the last one survives.
    expect(cn("text-body-md", "text-body-lg")).toBe("text-body-lg");
  });

  it("composes multiple compatible custom typography and styling inputs", () => {
    const result = cn(
      "text-label-lg",
      "text-[var(--text-secondary)]",
      "font-semibold",
      "uppercase",
    );
    expect(result).toBe(
      "text-label-lg text-[var(--text-secondary)] font-semibold uppercase",
    );
  });

  it("flattens arrays of class values", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
