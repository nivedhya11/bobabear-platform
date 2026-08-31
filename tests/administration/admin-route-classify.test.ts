import { describe, expect, it } from "vitest";

import { classifyAdminRoute } from "../../src/server/operations/http/admin-routes";

describe("classifyAdminRoute", () => {
  it("classifies admin session and membership routes", () => {
    expect(classifyAdminRoute("/api/admin/v1/session")).toEqual({ kind: "session" });
    expect(classifyAdminRoute("/api/admin/v1/memberships")).toEqual({ kind: "memberships" });
    expect(classifyAdminRoute("/api/admin/v1/memberships/abc/transition")).toEqual({
      kind: "memberships",
      id: "abc",
      action: "transition",
    });
    expect(classifyAdminRoute("/api/operations/v1/orders")).toBeNull();
  });
});
