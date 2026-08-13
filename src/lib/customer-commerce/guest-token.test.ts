import { afterEach, describe, expect, it } from "vitest";

import {
  clearGuestCartCredential,
  guestCartTokenHeader,
  readGuestCartCredential,
  rememberGuestCartFromMutation,
  writeGuestCartCredential,
} from "./guest-token";

afterEach(() => {
  clearGuestCartCredential();
});

const credential = {
  token: "guest-token-1",
  brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
  cartId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  revision: "2",
} as const;

describe("guest cart sessionStorage credential", () => {
  it("persists, reads, and exposes the guest header", () => {
    expect(readGuestCartCredential()).toBeNull();
    writeGuestCartCredential(credential);
    expect(readGuestCartCredential()).toEqual(credential);
    expect(guestCartTokenHeader()).toEqual({
      "X-Boba-Guest-Cart-Token": "guest-token-1",
    });
  });

  it("stores a newly issued guest token from the first mutation", () => {
    rememberGuestCartFromMutation({
      brandId: credential.brandId,
      guestToken: "issued-once",
      cart: { id: credential.cartId, revision: "1", ownerMode: "guest" },
    });
    expect(readGuestCartCredential()).toEqual({
      token: "issued-once",
      brandId: credential.brandId,
      cartId: credential.cartId,
      revision: "1",
    });
  });

  it("clears the guest credential after a customer-owned cart is established", () => {
    writeGuestCartCredential(credential);
    rememberGuestCartFromMutation({
      brandId: credential.brandId,
      cart: { id: credential.cartId, revision: "3", ownerMode: "customer" },
    });
    expect(readGuestCartCredential()).toBeNull();
  });

  it("treats missing or corrupt storage as absent", () => {
    window.sessionStorage.setItem("boba.guest-cart.v1", "{not-json");
    expect(readGuestCartCredential()).toBeNull();
    window.sessionStorage.setItem("boba.guest-cart.v1", JSON.stringify({ token: "" }));
    expect(readGuestCartCredential()).toBeNull();
    clearGuestCartCredential();
    expect(readGuestCartCredential()).toBeNull();
  });
});
