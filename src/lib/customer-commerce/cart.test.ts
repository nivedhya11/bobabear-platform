import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addCartLine,
  claimGuestCart,
  evaluateCart,
  reconcileGuestCart,
  removeCartLine,
  setCartLineQuantity,
  updateCartLineConfiguration,
} from "./cart";
import { clearGuestCartCredential, readGuestCartCredential } from "./guest-token";

const brandId = "56ff7724-d511-5ef4-b5d5-d629cbfb2388";
const variantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const cartId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const lineId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function guestCart(revision: string, quantity = 1) {
  return {
    id: cartId,
    brandId,
    ownerMode: "guest",
    revision,
    manualCouponCode: null,
    expiresAt: null,
    createdAt: "2026-08-13T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
    lines: [
      {
        id: lineId,
        variantId,
        quantity,
        modifiers: [],
        bundleSelections: [],
      },
    ],
  };
}

afterEach(() => {
  clearGuestCartCredential();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cart client journey", () => {
  it("adds, changes quantity, removes, and evaluates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, cart: guestCart("1"), guestToken: "tok-1" }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, cart: guestCart("2", 3) }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          cart: {
            ...guestCart("3", 0),
            lines: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          cartId,
          cartRevision: "3",
          evaluatedAt: "2026-08-13T00:00:00.000Z",
          status: "REQUIRES_FULFILMENT_CONTEXT",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const added = await addCartLine({ brandId, variantId, quantity: 1 });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.data.guestToken).toBe("tok-1");
    expect(readGuestCartCredential()?.token).toBe("tok-1");

    const qty = await setCartLineQuantity({
      brandId,
      cartLineId: lineId,
      quantity: 3,
      expectedRevision: "1",
    });
    expect(qty.ok).toBe(true);
    if (!qty.ok) return;
    expect(qty.data.cart.lines[0]?.quantity).toBe(3);

    const removed = await removeCartLine({
      brandId,
      cartLineId: lineId,
      expectedRevision: "2",
    });
    expect(removed.ok).toBe(true);

    const evaluated = await evaluateCart({ brandId });
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(evaluated.data.status).toBe("REQUIRES_FULFILMENT_CONTEXT");

    const addInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((addInit.headers as Record<string, string>)["X-Boba-Guest-Cart-Token"]).toBeUndefined();
    const qtyInit = fetchMock.mock.calls[1]![1] as RequestInit;
    expect((qtyInit.headers as Record<string, string>)["X-Boba-Guest-Cart-Token"]).toBe("tok-1");
  });

  it("forwards modifier purchase intent unchanged when adding a configured line", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ ok: true, cart: guestCart("1") }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const modifiers = [{ variantModifierGroupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", modifierGroupOptionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", quantity: 2 }];
    await addCartLine({ brandId, variantId, quantity: 1, modifiers });
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({ brandId, variantId, quantity: 1, modifiers });
  });
});

describe("updateCartLineConfiguration transport", () => {
  it("serializes modifiers, bundleSelections, and expectedRevision without persisted bundle ids", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ ok: true, cart: guestCart("2") }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const modifiers = [
      {
        variantModifierGroupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        modifierGroupOptionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        quantity: 1,
      },
    ];
    const bundleSelections = [
      {
        bundleGroupOptionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 1,
        modifiers: [
          {
            variantModifierGroupId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            modifierGroupOptionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            quantity: 2,
          },
        ],
      },
    ];
    await updateCartLineConfiguration({
      brandId,
      cartLineId: lineId,
      variantId,
      modifiers,
      bundleSelections,
      expectedRevision: "1",
    });
    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body)) as Record<
      string,
      unknown
    >;
    expect(body.modifiers).toEqual(modifiers);
    expect(body.bundleSelections).toEqual(bundleSelections);
    expect(body.expectedRevision).toBe("1");
    expect(body.variantId).toBe(variantId);
    expect(JSON.stringify(body)).not.toContain("bundle-child-id");
    for (const bundle of body.bundleSelections as Record<string, unknown>[]) {
      expect(bundle).not.toHaveProperty("id");
    }
  });
});

describe("claim / reconcile client", () => {
  it("claims a guest cart into a customer cart and clears the guest credential", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          ok: true,
          cart: { ...guestCart("4"), ownerMode: "customer" },
        }),
      ),
    );
    const { writeGuestCartCredential } = await import("./guest-token");
    writeGuestCartCredential({
      token: "tok-claim",
      brandId,
      cartId,
      revision: "3",
    });

    const claimed = await claimGuestCart({ brandId, expectedGuestRevision: "3" });
    expect(claimed.ok).toBe(true);
    expect(readGuestCartCredential()).toBeNull();
  });

  it("reconciles with an explicit KEEP_GUEST / KEEP_CUSTOMER choice", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (!body.resolution) {
        return jsonResponse(
          {
            ok: false,
            code: "CART_RECONCILIATION_CONFLICT",
            requestId: "req-c",
            resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
          },
          409,
        );
      }
      return jsonResponse({
        ok: true,
        cart: { ...guestCart("8"), ownerMode: "customer" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { writeGuestCartCredential } = await import("./guest-token");
    writeGuestCartCredential({ token: "tok-r", brandId, cartId, revision: "5" });

    const conflict = await reconcileGuestCart({
      brandId,
      expectedGuestRevision: "5",
      expectedCustomerRevision: "2",
    });
    expect(conflict).toMatchObject({
      ok: false,
      code: "CART_RECONCILIATION_CONFLICT",
      resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
    });

    const resolved = await reconcileGuestCart({
      brandId,
      expectedGuestRevision: "5",
      expectedCustomerRevision: "2",
      resolution: "KEEP_GUEST",
    });
    expect(resolved.ok).toBe(true);
    expect(readGuestCartCredential()).toBeNull();
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]![1] as RequestInit).body));
    expect(secondBody.resolution).toBe("KEEP_GUEST");
  });
});
