import { test, expect } from "@playwright/test";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "../../src/shared/customer-auth/contracts";
import { WORKFORCE_AUTH_PUBLIC_PATHS } from "../../src/shared/workforce-auth/contracts";

/**
 * Route inventory for the current static export (see `next build` output /
 * `out/`). Some routes are HTML pages; others are text/XML/image resources
 * that don't get page-content assertions — only a successful, correctly
 * typed response.
 */
const HTML_ROUTES = [
  "/",
  "/dev",
  "/dev/icons",
  "/privacy",
  "/login",
  "/workforce/login",
  "/order",
  "/order/cart",
  "/order/checkout",
  "/order/payment",
  "/order/confirmation",
  "/order/orders",
  "/order/orders/detail",
];

/** Matches unauthenticated session responses from the shared contracts. */
const STATIC_LOGIN_SESSION_STUB = Object.freeze({ authenticated: false as const });

test.describe("public routes — HTML pages", () => {
  for (const route of HTML_ROUTES) {
    test(`${route} renders without a server/browser error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      const pageErrors: Error[] = [];
      page.on("pageerror", (err) => pageErrors.push(err));

      // The static export server has no auth APIs. Login clients probe their
      // session façade on mount; stub only that one GET path per route so this
      // suite can prove the static page loads. Real sign-in / MFA behaviour
      // stays in dedicated auth E2E suites — do not mock those here.
      const interceptedSessionPaths: string[] = [];
      if (route === "/login") {
        await page.route(
          (url) => url.pathname === CUSTOMER_AUTH_PUBLIC_PATHS.session,
          async (routeHandler) => {
            const request = routeHandler.request();
            if (request.method() !== "GET") {
              await routeHandler.continue();
              return;
            }
            interceptedSessionPaths.push(new URL(request.url()).pathname);
            await routeHandler.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Cache-Control": "no-store" },
              body: JSON.stringify(STATIC_LOGIN_SESSION_STUB),
            });
          },
        );
      }
      if (route === "/workforce/login") {
        await page.route(
          (url) => url.pathname === WORKFORCE_AUTH_PUBLIC_PATHS.session,
          async (routeHandler) => {
            const request = routeHandler.request();
            if (request.method() !== "GET") {
              await routeHandler.continue();
              return;
            }
            interceptedSessionPaths.push(new URL(request.url()).pathname);
            await routeHandler.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Cache-Control": "no-store" },
              body: JSON.stringify(STATIC_LOGIN_SESSION_STUB),
            });
          },
        );
      }
      if (
        route === "/order" ||
        route === "/order/cart" ||
        route === "/order/checkout" ||
        route === "/order/payment" ||
        route === "/order/confirmation" ||
        route === "/order/orders" ||
        route === "/order/orders/detail"
      ) {
        await page.route(
          (url) =>
            url.pathname === "/api/v1/cart" ||
            url.pathname.startsWith("/api/v1/") ||
            url.pathname === CUSTOMER_AUTH_PUBLIC_PATHS.session,
          async (routeHandler) => {
            const request = routeHandler.request();
            const pathname = new URL(request.url()).pathname;
            if (request.method() === "GET" && pathname === "/api/v1/cart") {
              await routeHandler.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                body: JSON.stringify({ ok: true, cart: null }),
              });
              return;
            }
            if (request.method() === "GET" && pathname === "/api/v1/orders") {
              await routeHandler.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                body: JSON.stringify({ ok: true, items: [], nextCursor: null }),
              });
              return;
            }
            if (request.method() === "GET" && pathname.startsWith("/api/v1/orders/")) {
              await routeHandler.fulfill({
                status: 404,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                body: JSON.stringify({ ok: false, code: "ORDER_NOT_FOUND" }),
              });
              return;
            }
            if (request.method() === "GET" && pathname.startsWith("/api/v1/payments/")) {
              await routeHandler.fulfill({
                status: 404,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                body: JSON.stringify({ ok: false, code: "PAYMENT_NOT_FOUND" }),
              });
              return;
            }
            if (request.method() === "GET" && pathname === CUSTOMER_AUTH_PUBLIC_PATHS.session) {
              interceptedSessionPaths.push(pathname);
              await routeHandler.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                body: JSON.stringify(STATIC_LOGIN_SESSION_STUB),
              });
              return;
            }
            await routeHandler.continue();
          },
        );
      }

      const response = await page.goto(route);
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `unexpected status for ${route}`).toBeLessThan(400);

      await expect(page.locator("body")).toBeVisible();

      if (route === "/login") {
        // Exact name avoids the footer newsletter's "Mobile number or email…" field.
        await expect(
          page.getByRole("textbox", { name: "Mobile number", exact: true }),
        ).toBeVisible();
        expect(
          interceptedSessionPaths,
          "static /login must stub only GET /api/customer-auth/session",
        ).toEqual([CUSTOMER_AUTH_PUBLIC_PATHS.session]);
      }

      if (route === "/workforce/login") {
        await expect(page.getByRole("textbox", { name: "Work email", exact: true })).toBeVisible();
        await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
        expect(
          interceptedSessionPaths,
          "static /workforce/login must stub only GET /api/workforce-auth/session",
        ).toEqual([WORKFORCE_AUTH_PUBLIC_PATHS.session]);
      }

      expect(pageErrors, `uncaught page error(s) on ${route}`).toEqual([]);
      expect(consoleErrors, `console error(s) on ${route}`).toEqual([]);
    });
  }
});

test.describe("public routes — non-HTML resources", () => {
  test("/robots.txt returns a successful plain-text response", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("Sitemap:");
  });

  test("/sitemap.xml returns a successful XML response", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<urlset");
  });

  test("/icon.svg returns a successful SVG response", async ({ request }) => {
    const res = await request.get("/icon.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
  });
});

test.describe("public routes — 404 behaviour", () => {
  test("an unknown path returns a 404 with the site's not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response!.status()).toBe(404);
    // The exported 404.html renders the same shell/chrome as the rest of the
    // site rather than a bare server error — assert on structure, not copy.
    await expect(page.locator("body")).toBeVisible();
  });
});
