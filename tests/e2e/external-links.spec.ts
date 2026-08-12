import { test, expect } from "@playwright/test";

/**
 * Validates the current external-ordering-link contract without triggering
 * any external transaction: no navigation into Zomato/Swiggy/WhatsApp, no
 * clicks that follow the link — only reading the rendered `href` and
 * accessible name, which is what the site actually ships.
 */
test.describe("external ordering links", () => {
  test("Zomato link points at the current configured destination", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /order boba bear on zomato/i });
    await expect(link).toHaveAttribute(
      "href",
      "https://link.zomato.com/xqzv/rshare?id=12538351530563d18",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
  });

  test("Swiggy link points at the current configured destination", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /order boba bear on swiggy/i });
    await expect(link).toHaveAttribute(
      "href",
      "https://www.swiggy.com/direct/brand/730987?source=swiggy-direct&subSource=generic",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
  });

  test("WhatsApp link points at the current wa.me destination", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /message boba bear on whatsapp/i });
    await expect(link).toHaveAttribute(
      "href",
      "https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
  });

  test("footer WhatsApp contact link uses the same wa.me destination", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "WhatsApp us" }).first();
    await expect(link).toHaveAttribute(
      "href",
      "https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21",
    );
  });
});
