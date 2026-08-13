import { afterEach, describe, expect, it } from "vitest";

import {
  readGuestCartCredential,
  writeGuestCartCredential,
  clearGuestCartCredential,
} from "../customer-commerce/guest-token";
import { loginUrlWithReturn, parseSafeReturnPath } from "./return-to";

afterEach(() => {
  clearGuestCartCredential();
});

describe("guest cart survives auth navigation", () => {
  it("keeps sessionStorage credential across the login return URL hop", () => {
    writeGuestCartCredential({
      token: "survive-auth",
      brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
      cartId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      revision: "6",
    });

    const href = loginUrlWithReturn("/order/checkout");
    expect(href).toBe("/login?returnTo=%2Forder%2Fcheckout%2F");
    expect(parseSafeReturnPath(new URL(href, "https://boba.local").searchParams.get("returnTo"))).toBe(
      "/order/checkout/",
    );
    expect(readGuestCartCredential()?.token).toBe("survive-auth");
  });
});
