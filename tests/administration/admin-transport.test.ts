import { createServer } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/operations/http/auth", () => ({
  resolveOperationsWorkforcePrincipal: vi.fn().mockResolvedValue(null),
}));

import {
  classifyAdminRoute,
  routeAdminRequest,
} from "../../src/server/operations/http/admin-routes";
import { rejectForgedAuthorityFields } from "../../src/server/administration";

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function start() {
  const server = createServer((req, res) => {
    void routeAdminRequest(req, res, {
      runtime: {} as never,
      persistence: {} as never,
      trustedOrigin: "https://admin.example.test",
    }, "admin-test-request");
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address.");
  return `http://127.0.0.1:${address.port}`;
}

describe("IMP-035 Administration transport boundary", () => {
  it("classifies the locked API surface and rejects adjacent paths", () => {
    expect(classifyAdminRoute("/api/admin/v1/session")).toEqual({ kind: "session" });
    expect(classifyAdminRoute("/api/admin/v1/resources/outlets/outlet-1")).toEqual({
      kind: "resources",
      resource: "outlets",
      id: "outlet-1",
    });
    expect(classifyAdminRoute("/api/admin/v1/memberships/member-1/role-assignments")).toEqual({
      kind: "memberships",
      id: "member-1",
      action: "role-assignments",
    });
    expect(classifyAdminRoute("/api/operations/v1/admin")).toBeNull();
  });

  it("enforces trusted Origin before every mutation", async () => {
    const base = await start();
    const response = await fetch(`${base}/api/admin/v1/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify({ workforceUserId: "forged", scopeType: "platform" }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, code: "ADMIN_REQUEST_INVALID" });
  });

  it("rejects caller-forged authority fields", () => {
    for (const field of ["actor", "principal", "permissions", "authorized", "scopeApproved"]) {
      expect(() => rejectForgedAuthorityFields({ [field]: true })).toThrow(
        "Caller-supplied authority fields are not accepted.",
      );
    }
  });
});
