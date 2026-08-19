import { test, expect } from "@playwright/test";

import { stubAnonymousCustomerSession } from "./support/stub-customer-session";

test.describe("home page", () => {
  test("renders principal content without browser/console errors", async ({ page }) => {
    await stubAnonymousCustomerSession(page);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    const failedRequests: string[] = [];
    page.on("requestfailed", (req) => {
      // Same-origin resources only — third-party fonts/analytics hiccups are
      // not this site's product defect.
      if (new URL(req.url()).origin === new URL(page.url() || "http://127.0.0.1:4173").origin) {
        failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
      }
    });

    const response = await page.goto("/");
    expect(response!.status()).toBeLessThan(400);

    // Main hero content — anchors the "reader landed on the real page" check.
    await expect(page.locator("#top")).toBeVisible();
    await expect(page.getByRole("link", { name: /boba bear/i }).first()).toBeVisible();

    // Menu section (The Bar chapter) is present/reachable.
    await expect(page.locator("#bar")).toBeAttached();

    // Ordering links exist and are reachable without scrolling into them.
    await expect(page.getByRole("link", { name: /order boba bear on zomato/i })).toBeAttached();
    await expect(page.getByRole("link", { name: /order boba bear on swiggy/i })).toBeAttached();
    await expect(
      page.getByRole("link", { name: /message boba bear on whatsapp/i }),
    ).toBeAttached();

    expect(pageErrors, "uncaught page error(s)").toEqual([]);
    expect(consoleErrors, "console error(s)").toEqual([]);
    expect(failedRequests, "same-origin request failure(s)").toEqual([]);
  });

  test("principal menu imagery loads successfully", async ({ page }) => {
    await stubAnonymousCustomerSession(page);
    await page.goto("/");
    const menuSection = page.locator("#bar");
    await menuSection.scrollIntoViewIfNeeded();

    const firstMenuImage = menuSection.locator("img").first();
    await expect(firstMenuImage).toBeVisible();
    // A broken <img> reports naturalWidth === 0 once the load/error event
    // has settled — a stronger signal than "the element exists in the DOM".
    await expect(async () => {
      const naturalWidth = await firstMenuImage.evaluate(
        (img: HTMLImageElement) => img.naturalWidth,
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }).toPass({ timeout: 5_000 });
  });

  test("desktop navigation exposes the primary chapter links", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "desktop nav bar is hidden below the lg breakpoint",
    );
    await stubAnonymousCustomerSession(page);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Menu", "Drops", "Sign In", "Cart"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("mobile navigation drawer opens and exposes the primary chapter links", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "hamburger drawer only renders below the lg breakpoint",
    );
    await stubAnonymousCustomerSession(page);
    await page.goto("/");

    const opener = page.getByRole("button", { name: "Open navigation menu" });
    await expect(opener).toBeVisible();
    await opener.click();

    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    const drawerNav = page.getByRole("navigation", { name: "Mobile navigation" });
    for (const label of ["Menu", "Drops", "Cart", "Sign In"]) {
      await expect(drawerNav.getByRole("link", { name: new RegExp(`^${label}$`) })).toBeVisible();
    }

    await page.getByRole("button", { name: "Close navigation menu" }).click();
    // The drawer is a slide-out overlay (CSS transform), not display/visibility
    // toggled, so Playwright's toBeHidden() (bounding-box + visibility check)
    // never resolves true here. The component's actual closed-state signal is
    // the `inert` attribute it sets on the dialog — assert on that instead.
    await expect(drawer).toHaveAttribute("inert", "");
  });
});
