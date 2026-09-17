/**
 * IMP-036G: exhaustive continuation behaviour of the Admin client helpers.
 *
 * The legacy callers (Store outlet selection, membership narrowing, brand
 * pickers) must never treat a 50-row first page as the complete authorized
 * set. `adminRequest` is mocked so the page shapes are exact.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listAdminBrands,
  listAdminMemberships,
  listAdminMembershipsFiltered,
  listAdminOutlets,
} from "../../src/lib/administration/api";

const adminRequest = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("../../src/lib/administration/http", () => ({
  adminRequest: (...args: unknown[]) => adminRequest(...args),
}));

function resourcePage(
  ids: readonly string[],
  continuation: Readonly<{ more?: boolean; nextCursor?: string | null }> = {},
) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      items: ids.map((id) => ({ id, code: id, name: id, status: "active" })),
      more: continuation.more ?? false,
      nextCursor: continuation.nextCursor ?? null,
    },
  };
}

function ids(prefix: string, count: number, offset = 0): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + offset}`);
}

function returnedIds(result: unknown): string[] {
  const page = result as { ok: true; data: { items: Array<{ id: string }> } };
  return page.data.items.map((item) => item.id);
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("Admin client exhaustive continuation helpers", () => {
  it("concatenates every outlet page so a full 50-row first page is not the whole set", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(ids("outlet", 50), { more: true, nextCursor: "cursor-1" }))
      .mockResolvedValueOnce(resourcePage(ids("outlet", 5, 50)));

    const result = await listAdminOutlets();

    expect(result.ok).toBe(true);
    expect(returnedIds(result)).toHaveLength(55);
    expect(returnedIds(result)[0]).toBe("outlet-0");
    expect(returnedIds(result)[54]).toBe("outlet-54");
    if (!result.ok) throw new Error("expected an exhausted page");
    expect(result.data.more).toBe(false);
    expect(result.data.nextCursor).toBeNull();

    expect(adminRequest).toHaveBeenCalledTimes(2);
    expect(adminRequest).toHaveBeenNthCalledWith(1, "/api/admin/v1/resources/outlets", {
      query: { cursor: undefined },
    });
    expect(adminRequest).toHaveBeenNthCalledWith(2, "/api/admin/v1/resources/outlets", {
      query: { cursor: "cursor-1" },
    });
  });

  it("concatenates every brand page and keeps ordering across pages", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(ids("brand", 50), { more: true, nextCursor: "b-1" }))
      .mockResolvedValueOnce(resourcePage(ids("brand", 50, 50), { more: true, nextCursor: "b-2" }))
      .mockResolvedValueOnce(resourcePage(ids("brand", 6, 100)));

    const result = await listAdminBrands();

    expect(returnedIds(result)).toHaveLength(106);
    expect(returnedIds(result)[105]).toBe("brand-105");
    if (!result.ok) throw new Error("expected an exhausted page");
    expect(result.data.more).toBe(false);
    expect(adminRequest).toHaveBeenCalledTimes(3);
  });

  it("returns a single server page when the caller supplies an explicit cursor", async () => {
    adminRequest.mockResolvedValueOnce(
      resourcePage(ids("outlet", 50), { more: true, nextCursor: "cursor-9" }),
    );

    const result = await listAdminOutlets({ cursor: "cursor-8" });

    expect(adminRequest).toHaveBeenCalledTimes(1);
    expect(adminRequest).toHaveBeenCalledWith("/api/admin/v1/resources/outlets", {
      query: { cursor: "cursor-8" },
    });
    if (!result.ok) throw new Error("expected a single page");
    expect(result.data.more).toBe(true);
    expect(result.data.nextCursor).toBe("cursor-9");
  });

  it("returns the first failing page instead of presenting partial results as complete", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(ids("outlet", 50), { more: true, nextCursor: "cursor-1" }))
      .mockResolvedValueOnce({ ok: false, status: 503, code: "INVALID_RESPONSE" });

    const result = await listAdminOutlets();

    expect(result).toEqual({ ok: false, status: 503, code: "INVALID_RESPONSE" });
    expect(adminRequest).toHaveBeenCalledTimes(2);
  });

  it("stops when a server repeats a cursor rather than looping forever", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(["a"], { more: true, nextCursor: "loop" }))
      .mockResolvedValueOnce(resourcePage(["b"], { more: true, nextCursor: "loop" }))
      .mockResolvedValue(resourcePage(["c"], { more: true, nextCursor: "loop" }));

    const result = await listAdminOutlets();

    expect(returnedIds(result)).toEqual(["a", "b"]);
    expect(adminRequest).toHaveBeenCalledTimes(2);
  });

  it("propagates the outlet filter on every membership page it drains", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(ids("member", 50), { more: true, nextCursor: "m-1" }))
      .mockResolvedValueOnce(resourcePage(ids("member", 5, 50)));

    const result = await listAdminMembershipsFiltered("outlet-42");

    expect(returnedIds(result)).toHaveLength(55);
    expect(adminRequest).toHaveBeenNthCalledWith(1, "/api/admin/v1/memberships", {
      query: { outletId: "outlet-42", cursor: undefined },
    });
    expect(adminRequest).toHaveBeenNthCalledWith(2, "/api/admin/v1/memberships", {
      query: { outletId: "outlet-42", cursor: "m-1" },
    });
  });

  it("drains membership pages for the unfiltered legacy caller", async () => {
    adminRequest
      .mockResolvedValueOnce(resourcePage(ids("member", 50), { more: true, nextCursor: "m-1" }))
      .mockResolvedValueOnce(resourcePage(ids("member", 12, 50)));

    const result = await listAdminMemberships();

    expect(returnedIds(result)).toHaveLength(62);
    expect(adminRequest).toHaveBeenCalledTimes(2);
  });
});
