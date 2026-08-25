import { describe, expect, it, vi } from "vitest";

import type { WorkforceAuthRuntime } from "../../src/server/auth/workforce";
import { isWorkforcePrincipal } from "../../src/server/access-control/principal";
import { resolveOperationsWorkforcePrincipal } from "../../src/server/operations/http/auth";

type LifecycleUser = Readonly<{
  id: string;
  disabledAt: Date | null;
  passwordChangeRequired: boolean;
  twoFactorEnabled: boolean;
}>;

function runtimeFor(users: ReadonlyMap<string, LifecycleUser>): {
  runtime: WorkforceAuthRuntime;
  getSession: ReturnType<typeof vi.fn>;
} {
  const getSession = vi.fn(async ({ headers }: { headers: Headers }) => {
    const token = headers.get("cookie")?.match(/boba-workforce\.session_token=([^;]+)/)?.[1];
    return token && users.has(token)
      ? { user: { id: users.get(token)!.id }, session: {} }
      : null;
  });
  const findUserById = vi.fn(async (userId: string) =>
    [...users.values()].find((user) => user.id === userId) ?? null,
  );

  return {
    getSession,
    runtime: {
      realm: "workforce",
      getAuth: async () =>
        ({
          api: { getSession },
          $context: Promise.resolve({
            internalAdapter: {
              findUserById,
              findSession: vi.fn(),
            },
          }),
        }) as never,
      close: async () => {},
    },
  };
}

function eligibleUser(id: string): LifecycleUser {
  return {
    id,
    disabledAt: null,
    passwordChangeRequired: false,
    twoFactorEnabled: true,
  };
}

describe("resolveOperationsWorkforcePrincipal", () => {
  it("returns null when no workforce session is present", async () => {
    const { runtime } = runtimeFor(new Map());
    const result = await resolveOperationsWorkforcePrincipal(runtime, {});

    expect(result).toBeNull();
  });

  it("uses the authoritative eligible session user, not caller headers", async () => {
    const { runtime, getSession } = runtimeFor(
      new Map([["session-token", eligibleUser("authoritative-user")]]),
    );
    const result = await resolveOperationsWorkforcePrincipal(runtime, {
      cookie: "boba-workforce.session_token=session-token",
      "x-workforce-user-id": "caller-selected-id",
      "x-workforce-role": "admin",
      "x-workforce-permission": "order.cancel",
      "x-outlet-id": "caller-outlet-id",
    });

    expect(isWorkforcePrincipal(result)).toBe(true);
    expect(result?.workforceUserId).toBe("authoritative-user");
    expect(result).not.toHaveProperty("roles");
    expect(result).not.toHaveProperty("permissions");
    expect(result).not.toHaveProperty("outletId");
    const requestHeaders = getSession.mock.calls[0][0].headers as Headers;
    expect(requestHeaders.get("x-workforce-user-id")).toBeNull();
    expect(requestHeaders.get("x-workforce-role")).toBeNull();
    expect(requestHeaders.get("x-workforce-permission")).toBeNull();
    expect(requestHeaders.get("x-outlet-id")).toBeNull();
  });

  it.each([
    ["disabled", { ...eligibleUser("disabled-user"), disabledAt: new Date() }],
    ["password-change-required", { ...eligibleUser("password-user"), passwordChangeRequired: true }],
    ["MFA-ineligible", { ...eligibleUser("mfa-user"), twoFactorEnabled: false }],
  ])("returns null for a %s session user", async (_name, user) => {
    const { runtime } = runtimeFor(new Map([["session-token", user]]));

    const result = await resolveOperationsWorkforcePrincipal(runtime, {
      cookie: "boba-workforce.session_token=session-token",
    });

    expect(result).toBeNull();
  });
});
