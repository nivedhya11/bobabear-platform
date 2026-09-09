import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guardrails so light/system theme switching cannot silently return.
 * Presentation-only — does not assert product domain behaviour.
 */
describe("dark-only theme policy", () => {
  const root = resolve(__dirname, "../..");

  it("keeps root layout on dark color-scheme without theme bootstrap", () => {
    const layout = readFileSync(resolve(root, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/colorScheme:\s*"dark"/);
    expect(layout).not.toMatch(/prefers-color-scheme:\s*light/);
    expect(layout).not.toMatch(/localStorage\.getItem\(["']theme["']\)/);
    expect(layout).not.toMatch(/themeInitScript/);
    expect(layout).not.toMatch(/classList\.add\(["']light["']\)/);
  });

  it("does not ship light semantic overrides or ThemeToggle", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/color-scheme:\s*dark/);
    expect(css).not.toMatch(/^\.light\s*\{/m);
    expect(css).toMatch(/--enterprise-bg-page:\s*#1A2210/i);

    const nav = readFileSync(resolve(root, "src/components/Nav.tsx"), "utf8");
    expect(nav).not.toMatch(/Switch to light mode/);
    expect(nav).not.toMatch(/localStorage\.setItem\(["']theme["']/);
    expect(nav).not.toMatch(/CircleThemeButton/);

    expect(() =>
      readFileSync(resolve(root, "src/components/ui/ThemeToggle.tsx"), "utf8"),
    ).toThrow();

    const uiIndex = readFileSync(resolve(root, "src/components/ui/index.ts"), "utf8");
    expect(uiIndex).not.toMatch(/ThemeToggle/);
  });
});
