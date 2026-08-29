import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { expect, test, type Page, type Response } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { email: string; orders: Record<"accept" | "fulfil" | "cancel", { id: string; number: string }> };
const fixturePath = process.env.OPERATIONS_E2E_FIXTURE_MANIFEST;
const temporaryPassword = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
const permanentPassword = process.env.WORKFORCE_E2E_PERMANENT_PASSWORD;
let fixture: Fixture;

test.beforeAll(async () => {
  if (!fixturePath || !temporaryPassword || !permanentPassword) throw new Error("Missing E2E credentials.");
  fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
});

async function login(page: Page) {
  await page.goto("/workforce/login/");
  await page.getByLabel("Work email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(temporaryPassword!);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.getByLabel("Temporary password", { exact: true }).fill(temporaryPassword!);
  await page.getByLabel("New password", { exact: true }).fill(permanentPassword!);
  await page.getByRole("button", { name: /update password/i }).click();
  await page.getByLabel("Confirm password", { exact: true }).fill(permanentPassword!);
  await page.getByRole("button", { name: /set up authenticator/i }).click();
  const uri = await page.locator("#main-content code").filter({ hasText: "otpauth://" }).innerText();
  const encoded = new URL(uri.trim()).searchParams.get("secret");
  if (!encoded) throw new Error("TOTP secret missing.");
  const secret = new TextDecoder().decode(base32.decode(encoded));
  await page.getByRole("button", { name: /continue to verification/i }).click();
  await page.getByLabel("Authenticator code", { exact: true }).fill(await createOTP(secret, { digits: 6, period: 30 }).totp());
  await page.getByRole("button", { name: /verify authenticator/i }).click();
  // Enrollment verify clears the session and requires re-authentication (canonical workforce-auth E2E).
  await expect(page.getByText(/authenticator set up\. sign in again/i)).toBeVisible();
  await page.getByLabel("Work email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(permanentPassword!);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.getByLabel("Authenticator code", { exact: true }).fill(await createOTP(secret, { digits: 6, period: 30 }).totp());
  await page.getByRole("button", { name: /^Verify$/i }).click();
  // Wait for final authenticated UI so MFA verify Set-Cookie commits before Operations navigation.
  await expect(page.getByText(/you.?re signed in/i)).toBeVisible();
}

/** Canonical default first-page Operations list: GET /api/operations/v1/orders with empty query. */
function isDefaultFirstPageOrdersListResponse(response: Response): boolean {
  if (response.request().method() !== "GET") return false;
  let url: URL;
  try {
    url = new URL(response.url());
  } catch {
    return false;
  }
  if (url.pathname !== "/api/operations/v1/orders") return false;
  return [...url.searchParams.keys()].length === 0;
}

const LIST_STATUS_LABEL: Readonly<Record<"ACCEPTED" | "FULFILLED" | "CANCELLED", string>> = {
  ACCEPTED: "Order accepted",
  FULFILLED: "Order fulfilled",
  CANCELLED: "Order cancelled",
};

/**
 * After server-confirmed detail status: install first-page waiter, navigate to list,
 * await NEW default first-page GET, then assert list UI shows the updated lifecycle status.
 */
async function assertPostMutationListFreshness(
  page: Page,
  order: { id: string; number: string },
  expectedStatus: "ACCEPTED" | "FULFILLED" | "CANCELLED",
) {
  const freshListResponsePromise = page.waitForResponse(isDefaultFirstPageOrdersListResponse);
  await page.goto("/workforce/operations/");
  const freshListResponse = await freshListResponsePromise;
  expect(freshListResponse.ok()).toBeTruthy();
  expect(new URL(freshListResponse.url()).pathname).toBe("/api/operations/v1/orders");
  expect([...new URL(freshListResponse.url()).searchParams.keys()]).toEqual([]);

  const body = (await freshListResponse.json()) as {
    ok?: unknown;
    items?: ReadonlyArray<{ orderId?: string; status?: string }>;
  };
  expect(body.ok).toBe(true);
  const listed = Array.isArray(body.items)
    ? body.items.find((item) => item.orderId === order.id)
    : undefined;
  if (listed) {
    expect(listed.status).toBe(expectedStatus);
  }

  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  const statusCell = page.getByTestId(`order-status-${order.id}`);
  if (!(await statusCell.isVisible().catch(() => false))) {
    await page.getByLabel("Order number", { exact: true }).fill(order.number);
    await page.getByRole("button", { name: "Apply filters" }).click();
  }
  await expect(page.getByRole("link", { name: new RegExp(order.number) })).toBeVisible();
  await expect(page.getByTestId(`order-status-${order.id}`)).toHaveText(LIST_STATUS_LABEL[expectedStatus]);
}

async function mutate(
  page: Page,
  key: "accept" | "fulfil" | "cancel",
  action: "Accept" | "Fulfil" | "Cancel",
  finalStatus: string,
  listStatus: "ACCEPTED" | "FULFILLED" | "CANCELLED",
) {
  const order = fixture.orders[key];
  await page.goto("/workforce/operations/");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.getByLabel("Order number", { exact: true }).fill(order.number);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("link", { name: new RegExp(order.number) }).click();
  await expect(page).toHaveURL(new RegExp(`orders/detail/\\?orderId=${order.id}`));
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/operations/v1/orders/${encodeURIComponent(order.id)}/${key}`) && response.request().method() === "POST");
  await page.getByRole("button", { name: action, exact: true }).click();
  if (key === "cancel") await page.getByLabel("Cancellation reason", { exact: true }).selectOption("CUSTOMER_REQUESTED");
  await page.getByRole("button", { name: new RegExp(`Confirm ${action.toLowerCase()}`, "i") }).click();
  const response = await responsePromise;
  expect(new URL(response.url()).origin).toBe(new URL(page.url()).origin);
  expect(response.ok()).toBeTruthy();
  const body = response.request().postDataJSON() as Record<string, unknown>;
  expect(typeof body.expectedOrderRevision).toBe("string");
  expect(Object.keys(body).sort()).toEqual(key === "cancel" ? ["cancellationReasonCode", "expectedOrderRevision"] : ["expectedOrderRevision"]);
  if (key === "cancel") expect(body.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");
  await expect(page.getByText(finalStatus, { exact: true })).toBeVisible();
  await assertPostMutationListFreshness(page, order, listStatus);
}

test("workforce login through Nginx performs Accept, Fulfil, and Cancel", async ({ page }) => {
  await login(page);
  await mutate(page, "accept", "Accept", "Accepted", "ACCEPTED");
  await mutate(page, "fulfil", "Fulfil", "Fulfilled", "FULFILLED");
  await mutate(page, "cancel", "Cancel", "Cancelled", "CANCELLED");
});
