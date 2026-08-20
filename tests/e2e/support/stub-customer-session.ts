import type { Page } from "@playwright/test";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "../../../src/shared/customer-auth/contracts";

/** Static-export pages have no auth service. Stub GET session so chrome can resolve. */
export async function stubAnonymousCustomerSession(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === CUSTOMER_AUTH_PUBLIC_PATHS.session,
    async (routeHandler) => {
      if (routeHandler.request().method() !== "GET") {
        await routeHandler.continue();
        return;
      }
      await routeHandler.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ authenticated: false }),
      });
    },
  );
}
