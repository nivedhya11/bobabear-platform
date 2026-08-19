import { test, expect } from "@playwright/test";

import { stubAnonymousCustomerSession } from "./support/stub-customer-session";

test.describe("IMP-028A Food Direct UX Foundation chrome", () => {
  test.beforeEach(async ({ page }) => {
    await stubAnonymousCustomerSession(page);
  });

  test("logged-out desktop chrome is Menu | Drops | Sign In | Cart", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "desktop nav bar is hidden below the lg breakpoint",
    );
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByRole("link", { name: "Menu" })).toHaveAttribute("href", "/order");
    await expect(nav.getByRole("link", { name: "Drops" })).toHaveAttribute("href", "/#drops");
    await expect(nav.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
    await expect(nav.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/order/cart/");
    await expect(nav.getByRole("link", { name: "Offers" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Merch" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Artists" })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "My BOBA" })).toHaveCount(0);
  });

  test("Home Order Now is the primary commerce CTA to Menu", async ({ page }) => {
    await page.goto("/");
    const orderNow = page.locator("#top").getByRole("link", { name: "Order Now" }).first();
    await expect(orderNow).toHaveAttribute("href", "/order");
  });

  test("Cart remains reachable when empty from Home, login, and Menu", async ({ page }) => {
    for (const route of ["/", "/login", "/order"]) {
      await page.goto(route);
      const cart = page.getByRole("link", { name: "Cart" }).first();
      await expect(cart).toHaveAttribute("href", "/order/cart/");
    }
    await page.goto("/order/cart/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Drops uses a route-safe destination off Home", async ({ page }) => {
    await page.goto("/login");
    const drops = page.getByRole("link", { name: "Drops" }).first();
    await expect(drops).toHaveAttribute("href", "/#drops");
  });

  test("supported mobile viewport keeps chrome usable without horizontal overflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "mobile overflow check is for the supported mobile viewport",
    );
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Open navigation menu" });
    await expect(opener).toBeVisible();
    await opener.click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    const drawerNav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(drawerNav.getByRole("link", { name: "Menu" })).toBeVisible();
    await expect(drawerNav.getByRole("link", { name: "Drops" })).toBeVisible();
    await expect(drawerNav.getByRole("link", { name: "Cart" })).toBeVisible();
    await expect(drawerNav.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(drawerNav.getByRole("link", { name: "Offers" })).toHaveCount(0);

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("JSON-LD OrderAction targets BOBA Direct Menu", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const restaurant = jsonLd
      .map((text) => JSON.parse(text) as { "@type"?: string; hasMenu?: string; potentialAction?: unknown })
      .find((payload) => payload["@type"] === "Restaurant");
    expect(restaurant?.hasMenu).toMatch(/\/order$/);
    const actions = Array.isArray(restaurant?.potentialAction)
      ? restaurant.potentialAction
      : restaurant?.potentialAction
        ? [restaurant.potentialAction]
        : [];
    const orderAction = actions.find(
      (action: { "@type"?: string }) => action["@type"] === "OrderAction",
    ) as { target?: { urlTemplate?: string } } | undefined;
    expect(orderAction?.target?.urlTemplate).toMatch(/\/order$/);
    expect(JSON.stringify(orderAction)).not.toMatch(/wa\.me/i);
  });
});
