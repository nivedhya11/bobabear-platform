import { afterEach, describe, expect, it, vi } from "vitest";

import { listWorkforceOrders, SUPPORTED_QUERY_KEYS } from "./orders";

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
