import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileWelcomeClient } from "@/components/account/ProfileWelcomeClient";

const useSearchParams = vi.fn<() => URLSearchParams>();
const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const getOwnProfile = vi.fn<(...args: unknown[]) => unknown>();
const createOwnProfile = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}));

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    getOwnProfile: (...args: unknown[]) => getOwnProfile(...args),
    createOwnProfile: (...args: unknown[]) => createOwnProfile(...args),
  };
});

describe("ProfileWelcomeClient", () => {
  beforeEach(() => {
    useSearchParams.mockReturnValue(new URLSearchParams("returnTo=%2Forder%2F"));
    fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: true } });
    getOwnProfile.mockResolvedValue({ ok: true, status: 200, data: { profile: null } });
  });

  it("renders optional welcome copy", async () => {
    render(<ProfileWelcomeClient />);
    await waitFor(() => expect(screen.getByText(/Welcome to My BOBA/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(screen.queryByText(/Delete account/i)).not.toBeInTheDocument();
  });
});
