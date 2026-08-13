import { afterEach, describe, expect, it, vi } from "vitest";

import { commerceRequest } from "./http";
import { writeGuestCartCredential, clearGuestCartCredential } from "./guest-token";

afterEach(() => {
  clearGuestCartCredential();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("customer-commerce HTTP (D-360)", () => {
  it("parses the accepted error envelope including field and resolutionOptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: "CART_RECONCILIATION_CONFLICT",
            requestId: "req-1",
            resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await commerceRequest("/api/v1/cart/reconcile", { method: "POST", body: {} });
    expect(result).toEqual({
      ok: false,
      code: "CART_RECONCILIATION_CONFLICT",
      requestId: "req-1",
      resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
      status: 409,
    });
  });

  it("folds non-JSON failures as INVALID_RESPONSE and network failures as NETWORK_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500, headers: { "Content-Type": "text/plain" } })),
    );
    const invalid = await commerceRequest("/api/v1/cart");
    expect(invalid).toEqual({ ok: false, code: "INVALID_RESPONSE", status: 500 });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const network = await commerceRequest("/api/v1/cart");
    expect(network).toEqual({ ok: false, code: "NETWORK_ERROR", status: 0 });
  });

  it("attaches the guest header only when requested and uses same-origin credentials", async () => {
    writeGuestCartCredential({
      token: "guest-secret-token",
      brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388",
      cartId: "11111111-1111-4111-8111-111111111111",
      revision: "1",
    });
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ ok: true, cart: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await commerceRequest("/api/v1/cart", { guestToken: true, query: { brandId: "b" } });
    await commerceRequest("/api/v1/me/addresses", { guestToken: false });
    await commerceRequest("/api/v1/checkouts", { method: "POST", body: { cartId: "c" } });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const guestCall = fetchMock.mock.calls[0][1];
    expect(guestCall?.credentials).toBe("same-origin");
    expect((guestCall?.headers as Record<string, string>)["X-Boba-Guest-Cart-Token"]).toBe(
      "guest-secret-token",
    );

    const addressCall = fetchMock.mock.calls[1][1];
    expect(addressCall?.credentials).toBe("same-origin");
    expect((addressCall?.headers as Record<string, string>)["X-Boba-Guest-Cart-Token"]).toBeUndefined();

    const checkoutCall = fetchMock.mock.calls[2][1];
    expect(checkoutCall?.credentials).toBe("same-origin");
    expect((checkoutCall?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((checkoutCall?.headers as Record<string, string>)["X-Boba-Guest-Cart-Token"]).toBeUndefined();
  });
});
