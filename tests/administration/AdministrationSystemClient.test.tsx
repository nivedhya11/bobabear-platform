import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationSystemClient } from "../../src/components/administration/AdministrationSystemClient";

const getOperationalStatus = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/operations/operational-status", () => ({
  getOperationalStatus: (...args: unknown[]) => getOperationalStatus(...args),
}));

beforeEach(() => {
  getOperationalStatus.mockReset();
});

describe("AdministrationSystemClient", () => {
  it("shows actionable Open Operations only when Ops status read succeeds", async () => {
    getOperationalStatus.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { service: "operations", uptimeSeconds: 12 },
    });
    render(<AdministrationSystemClient />);
    await waitFor(() => expect(screen.getByTestId("admin-open-operations")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /open operations/i })).toHaveAttribute(
      "href",
      "/workforce/operations/",
    );
    expect(screen.queryByTestId("admin-open-operations-unavailable")).not.toBeInTheDocument();
  });

  it("does not offer an Operations link when status is forbidden", async () => {
    getOperationalStatus.mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: "ORDER_UNAUTHORIZED",
    });
    render(<AdministrationSystemClient />);
    await waitFor(() =>
      expect(screen.getByTestId("admin-open-operations-unavailable")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: /open operations/i })).not.toBeInTheDocument();
  });

  it("offers retry on error and reload on success", async () => {
    const user = userEvent.setup();
    getOperationalStatus
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        code: "INTERNAL_ERROR",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { service: "operations", uptimeSeconds: 3 },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { service: "operations", uptimeSeconds: 9 },
      });

    render(<AdministrationSystemClient />);
    await waitFor(() => expect(screen.getByTestId("admin-system-retry")).toHaveTextContent(/retry/i));
    await user.click(screen.getByTestId("admin-system-retry"));
    await waitFor(() => expect(screen.getByTestId("admin-open-operations")).toBeInTheDocument());
    expect(screen.getByTestId("admin-system-retry")).toHaveTextContent(/reload/i);
    await user.click(screen.getByTestId("admin-system-retry"));
    await waitFor(() => expect(getOperationalStatus).toHaveBeenCalledTimes(3));
  });
});
