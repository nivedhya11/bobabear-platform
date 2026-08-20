# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: imp026-real-checkout.spec.ts >> real Razorpay checkout loads with test order
- Location: tests/e2e/imp026-real-checkout.spec.ts:10:5

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: locator.fill: Test timeout of 240000ms exceeded.
Call log:
  - waiting for getByLabel('6-digit code', { exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - marquee "Boba Bear brand slogans" [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e7]: FOR THE UNBOTHERED
        - generic [ref=e10]: BOBA TEA · INDO-KOREAN STREET FOOD
        - generic [ref=e13]: S-TIER SIPS · K-STREET DRIP
        - generic [ref=e16]: BEAR SUPPORTS ART
        - generic [ref=e19]: CATCH THE DROP
      - generic [ref=e21]:
        - generic [ref=e23]: FOR THE UNBOTHERED
        - generic [ref=e26]: BOBA TEA · INDO-KOREAN STREET FOOD
        - generic [ref=e29]: S-TIER SIPS · K-STREET DRIP
        - generic [ref=e32]: BEAR SUPPORTS ART
        - generic [ref=e35]: CATCH THE DROP
  - banner [ref=e37]:
    - generic [ref=e39]:
      - link "Boba Bear — home" [ref=e40] [cursor=pointer]:
        - /url: /
        - img "Boba Bear" [ref=e41]
      - navigation "Main navigation" [ref=e42]:
        - list [ref=e43]:
          - listitem [ref=e44]:
            - link "Drops" [ref=e45] [cursor=pointer]:
              - /url: /#drops
          - listitem [ref=e46]:
            - link "Menu" [ref=e47] [cursor=pointer]:
              - /url: /#bar
          - listitem [ref=e48]:
            - link "Merch" [ref=e49] [cursor=pointer]:
              - /url: /#merch
          - listitem [ref=e50]:
            - link "Artists" [ref=e51] [cursor=pointer]:
              - /url: /#artists
          - listitem [ref=e52]:
            - link "Order" [ref=e53] [cursor=pointer]:
              - /url: /order
      - generic [ref=e54]:
        - button "Switch to dark mode" [ref=e55] [cursor=pointer]:
          - img [ref=e56]
        - link "Orders" [ref=e58] [cursor=pointer]:
          - /url: /order/orders/
        - link "Sign in" [ref=e59] [cursor=pointer]:
          - /url: /login
        - link "Order now" [ref=e60] [cursor=pointer]:
          - /url: /order
          - text: Order now
          - img [ref=e61]
  - main [ref=e64]:
    - generic [ref=e65]:
      - generic [ref=e66]:
        - paragraph [ref=e67]: Boba Bear · Account
        - heading "Sign In" [level=1] [ref=e68]
      - generic [ref=e69]:
        - generic [ref=e70]:
          - generic [ref=e71]: Mobile number
          - textbox "Mobile number" [ref=e72]:
            - /placeholder: 98765 43210
            - text: "9876500310"
        - button "Send code" [ref=e73]
      - paragraph [ref=e74]: Something went wrong. Please try again.
  - contentinfo [ref=e75]:
    - generic [ref=e77]:
      - generic [ref=e78]:
        - img "Boba Bear" [ref=e79]
        - paragraph [ref=e80]: Indo-Korean kitchen, boba bar & merch. Ist. 2026 · Dehradun.
        - link "Follow @boba.bearofficial" [ref=e81] [cursor=pointer]:
          - /url: https://instagram.com/boba.bearofficial
          - img [ref=e82]
          - text: Follow @boba.bearofficial
      - generic [ref=e86]:
        - generic [ref=e87]:
          - paragraph [ref=e88]: The Menu
          - list [ref=e89]:
            - listitem [ref=e90]:
              - link "Boba drinks" [ref=e91] [cursor=pointer]:
                - /url: /#bar
            - listitem [ref=e92]:
              - link "K-Street" [ref=e93] [cursor=pointer]:
                - /url: /#plates
            - listitem [ref=e94]:
              - link "Beary sweet" [ref=e95] [cursor=pointer]:
                - /url: /#sweet
            - listitem [ref=e96]:
              - link "Vegan / gluten" [disabled]
        - generic [ref=e97]:
          - paragraph [ref=e98]: The Bear
          - list [ref=e99]:
            - listitem [ref=e100]:
              - link "Artists" [ref=e101] [cursor=pointer]:
                - /url: /#artists
            - listitem [ref=e102]:
              - link "Press" [disabled]
            - listitem [ref=e103]:
              - link "Careers" [disabled]
        - generic [ref=e104]:
          - paragraph [ref=e105]: Contact
          - generic [ref=e106]:
            - generic [ref=e107]:
              - img [ref=e109]
              - generic [ref=e112]: 11am — 12am
            - generic [ref=e113]:
              - img [ref=e115]
              - link "+91 92598 94495" [ref=e118] [cursor=pointer]:
                - /url: tel:+919259894495
            - generic [ref=e119]:
              - img [ref=e121]
              - link "bobabear.unbothered@gmail.com" [ref=e125] [cursor=pointer]:
                - /url: mailto:bobabear.unbothered@gmail.com
            - generic [ref=e126]:
              - img [ref=e128]
              - link "WhatsApp us" [ref=e132] [cursor=pointer]:
                - /url: https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21
            - paragraph [ref=e133]: Delivery-only · Dehradun
      - generic [ref=e134]:
        - paragraph [ref=e135]: Catch the Drop
        - generic [ref=e136]:
          - paragraph [ref=e137]: Get drop updates by email or WhatsApp. No spam.
          - generic [ref=e138]:
            - generic [ref=e139]:
              - textbox "Mobile number or email to join the Boba Bear community" [ref=e140]:
                - /placeholder: mobile or email →
              - button "Notify Me" [ref=e141]
            - paragraph [ref=e142]: Email us or drop your number
    - generic [ref=e144]:
      - paragraph [ref=e145]: © 2026 Boba Bear · All rights, no apologies
      - navigation "Legal" [ref=e146]:
        - generic [ref=e147]:
          - link "Privacy" [ref=e148] [cursor=pointer]:
            - /url: /privacy
          - generic [ref=e149]: ·
        - generic [ref=e150]:
          - link "Terms" [disabled]
          - generic [ref=e151]: ·
        - generic [ref=e152]:
          - link "Accessibility" [disabled]
      - paragraph [ref=e153]: Made in Bharat · By Unbothered humans
  - alert [ref=e154]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const FIXED_OTP = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;
  4  | const PHONE = "9876500310";
  5  | 
  6  | test.beforeEach(() => {
  7  |   test.skip(!FIXED_OTP, "OTP required");
  8  | });
  9  | 
  10 | test("real Razorpay checkout loads with test order", async ({ page }) => {
  11 |   test.setTimeout(240_000);
  12 |   await page.goto("/order/");
  13 |   await page.getByRole("button", { name: /add to cart/i }).first().click();
  14 |   await page.getByRole("link", { name: /cart/i }).first().click();
  15 |   await page.getByRole("button", { name: /checkout/i }).click();
  16 |   await page.getByLabel("Mobile number", { exact: true }).fill(PHONE);
  17 |   await page.getByRole("button", { name: /send code/i }).click();
> 18 |   await page.getByLabel("6-digit code", { exact: true }).fill(FIXED_OTP!);
     |                                                          ^ Error: locator.fill: Test timeout of 240000ms exceeded.
  19 |   await page.getByRole("button", { name: /verify code/i }).click();
  20 |   await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 20_000 });
  21 |   const checkout = page.locator("#main-content");
  22 |   await checkout.getByLabel("Recipient name", { exact: true }).fill("GTM Real");
  23 |   await checkout.getByLabel("Mobile number", { exact: true }).fill(`+91${PHONE}`);
  24 |   await checkout.getByLabel("Address line 1", { exact: true }).fill("12 Mall Road");
  25 |   await checkout.getByLabel("City", { exact: true }).fill("Dehradun");
  26 |   await checkout.getByRole("combobox", { name: /^State$/i }).selectOption({ label: "Uttarakhand" });
  27 |   await checkout.getByLabel("PIN code", { exact: true }).fill("248001");
  28 |   await checkout.getByRole("button", { name: /evaluate checkout/i }).click();
  29 |   await expect(page.getByTestId("checkout-ready")).toBeVisible({ timeout: 20_000 });
  30 | 
  31 |   const checkoutScript = page.waitForResponse(
  32 |     (r) => r.url().includes("checkout.razorpay.com/v1/checkout.js") && r.ok(),
  33 |   );
  34 |   const payStart = page.waitForResponse(
  35 |     (r) => r.request().method() === "POST" && r.url().includes("/api/v1/payments") && r.ok(),
  36 |   );
  37 |   await page.getByTestId("payment-start").click();
  38 |   await checkoutScript;
  39 |   const payResponse = await payStart;
  40 |   const payBody = await payResponse.json();
  41 |   expect(payBody.clientAction?.kind).toBe("razorpay_standard_checkout");
  42 |   expect(String(payBody.clientAction?.payload?.keyId ?? "")).toMatch(/^rzp_test_/);
  43 |   expect(payBody.clientAction?.payload?.razorpayOrderId).toMatch(/^order_/);
  44 | });
  45 | 
```