import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acceptWorkforceOrder,
  cancelWorkforceOrder,
  fulfilWorkforceOrder,
  getWorkforceOrder,
  isOperationsOrderUuid,
  listWorkforceOrders,
  parseOperationsOrderDetail,
  parseOperationsOrderMutationResult,
  SUPPORTED_QUERY_KEYS,
} from "./orders";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const summary = {
  orderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  orderNumber: "ORD-0123456789AB",
  status: "PLACED",
  revision: "1",
  createdAt: "2026-08-13T00:20:00.000Z",
  acceptedAt: null,
  fulfilledAt: null,
  cancelledAt: null,
  money: { grandTotalMinor: "27195", currency: "INR" },
  outlet: {
    outletId: "outlet-1",
    brandId: "brand-1",
    code: "e2e-outlet",
    name: "E2E Outlet",
  },
};

const detail = {
  ...summary,
  updatedAt: "2026-08-13T00:25:00.000Z",
  paymentProvenanceKind: "PAYMENT",
  acceptedByWorkforceUserId: null,
  fulfilledByWorkforceUserId: null,
  cancelledByWorkforceUserId: null,
  cancellationReasonCode: null,
  destination: {
    recipientName: "E2E Guest",
    recipientPhone: "+919876500251",
    addressLine1: "12 Mall Road",
    addressLine2: null,
    landmark: null,
    locality: null,
    city: "Dehradun",
    stateCode: "IN-UT",
    postalCode: "248001",
    label: null,
  },
  lines: [
    {
      productName: "Classic Milk Tea",
      variantName: "Regular",
      quantity: 1,
      lineTotalMinor: "27195",
      modifiers: [{ groupName: "Sweetness", optionName: "Less sugar", quantity: 1 }],
    },
  ],
};

const mutationAccepted = {
  orderId: summary.orderId,
  orderNumber: summary.orderNumber,
  status: "ACCEPTED",
  revision: "2",
  updatedAt: "2026-08-13T00:30:00.000Z",
  acceptedAt: "2026-08-13T00:30:00.000Z",
};

describe("operations order list client", () => {
  it("uses same-origin GET with credentials and supported query parameters only", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.credentials).toBe("same-origin");
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse({ ok: true, items: [summary], nextCursor: "cursor-2" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const listed = await listWorkforceOrders({
      status: "PLACED",
      orderNumber: "ORD-0123456789AB",
      cursor: "cursor-1",
      limit: 20,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url.startsWith("/api/operations/v1/orders?")).toBe(true);
    const params = new URLSearchParams(url.split("?", 2)[1]);
    expect(params.get("status")).toBe("PLACED");
    expect(params.get("orderNumber")).toBe("ORD-0123456789AB");
    expect(params.get("cursor")).toBe("cursor-1");
    expect(params.get("limit")).toBe("20");
    expect([...params.keys()].every((key) => (SUPPORTED_QUERY_KEYS as readonly string[]).includes(key))).toBe(true);
    expect(listed.data.nextCursor).toBe("cursor-2");
  });

  it("omits empty filters and requests the bare collection path", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, items: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    const listed = await listWorkforceOrders();
    expect(listed.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operations/v1/orders",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("surfaces accepted Operations error envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: false, code: "WORKFORCE_AUTH_REQUIRED", requestId: "req-1" }, 401)),
    );
    const unauthorized = await listWorkforceOrders();
    expect(unauthorized).toEqual({
      ok: false,
      code: "WORKFORCE_AUTH_REQUIRED",
      requestId: "req-1",
      status: 401,
    });
  });
});

describe("operations order detail client adapter", () => {
  it("gets a detail resource through the encoded same-origin Operations path", async () => {
    const orderId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init).toEqual(expect.objectContaining({ method: "GET", credentials: "same-origin" }));
      return jsonResponse({ ok: true, order: detail });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWorkforceOrder(orderId);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/operations/v1/orders/${encodeURIComponent(orderId)}`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    if (!result.ok) return;
    expect(result.data.order.orderId).toBe(orderId);
    expect(result.data.order.destination.recipientName).toBe("E2E Guest");
  });

  it("rejects a summary-shaped HTTP 200 detail payload as INVALID_RESPONSE", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, order: summary }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWorkforceOrder("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    expect(result).toEqual({ ok: false, code: "INVALID_RESPONSE", status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a nested malformed destination on HTTP 200", async () => {
    const malformed = {
      ...detail,
      destination: {
        recipientName: "E2E Guest",
      },
    };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ ok: true, order: malformed })));

    const result = await getWorkforceOrder("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(result).toEqual({ ok: false, code: "INVALID_RESPONSE", status: 200 });
  });

  it("rejects a nested malformed line modifier on HTTP 200", async () => {
    const malformed = {
      ...detail,
      lines: [
        {
          productName: "Classic Milk Tea",
          variantName: "Regular",
          quantity: 1,
          lineTotalMinor: "27195",
          modifiers: [{ groupName: "Sweetness" }],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ ok: true, order: malformed })));

    const result = await getWorkforceOrder("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(result).toEqual({ ok: false, code: "INVALID_RESPONSE", status: 200 });
  });
});

describe("operations lifecycle mutation adapters", () => {
  const orderId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const encodedPath = `/api/operations/v1/orders/${encodeURIComponent(orderId)}`;

  it("accept posts exact JSON body with string revision and same-origin credentials", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("same-origin");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ expectedOrderRevision: "1" });
      expect(typeof body.expectedOrderRevision).toBe("string");
      expect(body).not.toHaveProperty("role");
      expect(body).not.toHaveProperty("idempotencyKey");
      expect(body).not.toHaveProperty("Idempotency-Key");
      return jsonResponse({ ok: true, order: mutationAccepted });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await acceptWorkforceOrder(orderId, "1");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${encodedPath}/accept`, expect.any(Object));
    if (!result.ok) return;
    expect(result.data.order.revision).toBe("2");
    expect(typeof result.data.order.revision).toBe("string");
  });

  it("accept rejects malformed success payloads and does not retry", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, order: { orderId } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await acceptWorkforceOrder(orderId, "1");
    expect(result).toEqual({ ok: false, code: "INVALID_RESPONSE", status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accept maps API error envelopes without retry", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: false, code: "ORDER_CONFLICT", requestId: "req-conflict" }, 409),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await acceptWorkforceOrder(orderId, "1");
    expect(result).toEqual({
      ok: false,
      code: "ORDER_CONFLICT",
      requestId: "req-conflict",
      status: 409,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fulfil posts exact encoded route and string revision", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ expectedOrderRevision: "2" });
      expect(typeof body.expectedOrderRevision).toBe("string");
      return jsonResponse({
        ok: true,
        order: {
          ...mutationAccepted,
          status: "FULFILLED",
          revision: "3",
          fulfilledAt: "2026-08-13T00:40:00.000Z",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fulfilWorkforceOrder(orderId, "2");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${encodedPath}/fulfil`,
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fulfil maps malformed and API failures without retry", async () => {
    const malformed = vi.fn(async () => jsonResponse({ ok: true, order: null }));
    vi.stubGlobal("fetch", malformed);
    expect(await fulfilWorkforceOrder(orderId, "2")).toEqual({
      ok: false,
      code: "INVALID_RESPONSE",
      status: 200,
    });
    expect(malformed).toHaveBeenCalledTimes(1);

    const apiError = vi.fn(async () =>
      jsonResponse({ ok: false, code: "ORDER_FULFIL_NOT_ALLOWED" }, 409),
    );
    vi.stubGlobal("fetch", apiError);
    expect(await fulfilWorkforceOrder(orderId, "2")).toEqual({
      ok: false,
      code: "ORDER_FULFIL_NOT_ALLOWED",
      status: 409,
    });
    expect(apiError).toHaveBeenCalledTimes(1);
  });

  it("cancel posts exact cancellationReasonCode and string revision", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        expectedOrderRevision: "1",
        cancellationReasonCode: "ITEM_UNAVAILABLE",
      });
      expect(typeof body.expectedOrderRevision).toBe("string");
      expect(body).not.toHaveProperty("role");
      expect(body).not.toHaveProperty("idempotencyKey");
      return jsonResponse({
        ok: true,
        order: {
          orderId,
          orderNumber: summary.orderNumber,
          status: "CANCELLED",
          revision: "2",
          updatedAt: "2026-08-13T00:35:00.000Z",
          cancelledAt: "2026-08-13T00:35:00.000Z",
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelWorkforceOrder(orderId, "1", "ITEM_UNAVAILABLE");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${encodedPath}/cancel`,
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancel maps malformed and API failures without retry", async () => {
    const malformed = vi.fn(async () => jsonResponse({ ok: true, order: { status: "CANCELLED" } }));
    vi.stubGlobal("fetch", malformed);
    expect(await cancelWorkforceOrder(orderId, "1", "CUSTOMER_REQUESTED")).toEqual({
      ok: false,
      code: "INVALID_RESPONSE",
      status: 200,
    });
    expect(malformed).toHaveBeenCalledTimes(1);

    const apiError = vi.fn(async () =>
      jsonResponse({ ok: false, code: "ORDER_CANCELLATION_REASON_INVALID" }, 400),
    );
    vi.stubGlobal("fetch", apiError);
    expect(await cancelWorkforceOrder(orderId, "1", "CUSTOMER_REQUESTED")).toEqual({
      ok: false,
      code: "ORDER_CANCELLATION_REASON_INVALID",
      status: 400,
    });
    expect(apiError).toHaveBeenCalledTimes(1);
  });

  it("percent-encodes order IDs in mutation paths", async () => {
    const specialId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, order: mutationAccepted }));
    vi.stubGlobal("fetch", fetchMock);
    await acceptWorkforceOrder(specialId, "1");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/operations/v1/orders/${encodeURIComponent(specialId)}/accept`,
      expect.any(Object),
    );
  });
});

describe("parseOperationsOrderDetail", () => {
  it("accepts a complete detail projection", () => {
    expect(parseOperationsOrderDetail(detail)?.orderNumber).toBe("ORD-0123456789AB");
  });

  it("rejects incomplete summary-like objects", () => {
    expect(parseOperationsOrderDetail(summary)).toBeNull();
  });
});

describe("parseOperationsOrderMutationResult", () => {
  it("accepts a slim mutation projection and keeps revision as string", () => {
    const parsed = parseOperationsOrderMutationResult(mutationAccepted);
    expect(parsed?.revision).toBe("2");
    expect(typeof parsed?.revision).toBe("string");
  });

  it("rejects incomplete mutation projections", () => {
    expect(parseOperationsOrderMutationResult({ orderId: summary.orderId })).toBeNull();
  });
});

describe("isOperationsOrderUuid", () => {
  it("accepts the Operations UUID resource shape", () => {
    expect(isOperationsOrderUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(true);
  });

  it("rejects non-UUID and empty values", () => {
    expect(isOperationsOrderUuid("")).toBe(false);
    expect(isOperationsOrderUuid("not-a-uuid")).toBe(false);
    expect(isOperationsOrderUuid("ord-1")).toBe(false);
  });
});
