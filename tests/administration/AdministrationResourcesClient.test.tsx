/**
 * IMP-036G Organization workspace behaviour: continuation, success feedback,
 * mid-session expiry recovery, and the absence of any hard-delete affordance.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationResourcesClient } from "../../src/components/administration/AdministrationResourcesClient";

const listAdministrationResourceClient = vi.fn<(...args: unknown[]) => unknown>();
const createAdministrationResource = vi.fn<(...args: unknown[]) => unknown>();
const updateAdministrationResource = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  listAdministrationResourceClient: (...args: unknown[]) =>
    listAdministrationResourceClient(...args),
  createAdministrationResource: (...args: unknown[]) => createAdministrationResource(...args),
  updateAdministrationResource: (...args: unknown[]) => updateAdministrationResource(...args),
}));

type ResourceSeed = Readonly<{
  id: string;
  name?: string;
  status?: string;
  revision?: string;
}>;

function resource(seed: ResourceSeed) {
  return {
    id: seed.id,
    code: seed.id,
    name: seed.name ?? seed.id,
    status: seed.status ?? "active",
    revision: seed.revision ?? "1",
  };
}

function page(
  seeds: readonly ResourceSeed[],
  continuation: Readonly<{ more?: boolean; nextCursor?: string | null }> = {},
) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      items: seeds.map(resource),
      more: continuation.more ?? false,
      nextCursor: continuation.nextCursor ?? null,
    },
  };
}

beforeEach(() => {
  listAdministrationResourceClient.mockReset();
  createAdministrationResource.mockReset();
  updateAdministrationResource.mockReset();
  listAdministrationResourceClient.mockResolvedValue(page([{ id: "brand-a" }]));
});

describe("AdministrationResourcesClient", () => {
  it("appends the next page without dropping already-browsed rows", async () => {
    const user = userEvent.setup();
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a" }], { more: true, nextCursor: "cursor-1" }),
    );
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());
    expect(listAdministrationResourceClient).toHaveBeenCalledWith("brands", { cursor: undefined });

    listAdministrationResourceClient.mockResolvedValueOnce(page([{ id: "brand-b" }]));
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(screen.getByText(/brand-b/)).toBeInTheDocument());
    expect(screen.getByText(/brand-a/)).toBeInTheDocument();
    expect(listAdministrationResourceClient).toHaveBeenLastCalledWith("brands", {
      cursor: "cursor-1",
    });
    // No continuation remains, so the control disappears rather than looping.
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("reloads the browse list from the error state", async () => {
    const user = userEvent.setup();
    listAdministrationResourceClient.mockResolvedValueOnce({
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
    });
    render(<AdministrationResourcesClient />);
    await waitFor(() =>
      expect(screen.getByTestId("enterprise-error-state")).toHaveTextContent(
        /could not be loaded/i,
      ),
    );

    listAdministrationResourceClient.mockResolvedValueOnce(page([{ id: "brand-recovered" }]));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByText(/brand-recovered/)).toBeInTheDocument());
    expect(screen.queryByTestId("enterprise-error-state")).not.toBeInTheDocument();
  });

  it("shows an empty-scope message instead of implying the set is truncated", async () => {
    listAdministrationResourceClient.mockResolvedValueOnce(page([]));
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources-empty")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("confirms create with an explicit success notice", async () => {
    const user = userEvent.setup();
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());

    createAdministrationResource.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, item: resource({ id: "brand-new" }) },
    });
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a" }, { id: "brand-new" }]),
    );

    await user.type(screen.getByLabelText(/^code$/i), "brand-new");
    await user.type(screen.getByLabelText(/^name$/i), "Brand New");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(screen.getByText("Resource created.")).toBeInTheDocument());
    expect(createAdministrationResource).toHaveBeenCalledWith("brands", {
      code: "brand-new",
      name: "Brand New",
    });
  });

  it("confirms update with an explicit success notice", async () => {
    const user = userEvent.setup();
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    updateAdministrationResource.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, item: resource({ id: "brand-a", name: "Renamed", revision: "2" }) },
    });
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a", name: "Renamed", revision: "2" }]),
    );
    await user.click(screen.getByRole("button", { name: /save update/i }));

    await waitFor(() => expect(screen.getByText("Resource updated.")).toBeInTheDocument());
    expect(updateAdministrationResource).toHaveBeenCalledWith("brands", "brand-a", {
      name: "brand-a",
      expectedRevision: "1",
    });
  });

  it("surfaces a stale-revision conflict as recoverable guidance, not a silent failure", async () => {
    const user = userEvent.setup();
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    updateAdministrationResource.mockResolvedValueOnce({
      ok: false,
      status: 409,
      code: "ADMIN_CONFLICT",
    });
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a", revision: "7" }]),
    );
    await user.click(screen.getByRole("button", { name: /save update/i }));

    await waitFor(() => expect(screen.getByText(/stale revision/i)).toBeInTheDocument());
    expect(screen.queryByText("Resource updated.")).not.toBeInTheDocument();
  });

  it("deactivates through a consequence confirmation and reports success", async () => {
    const user = userEvent.setup();
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^deactivate$/i }));
    const dialog = screen.getByTestId("admin-confirm-dialog");
    expect(dialog).toHaveTextContent(/hard delete is not available/i);

    updateAdministrationResource.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, item: resource({ id: "brand-a", status: "inactive", revision: "2" }) },
    });
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a", status: "inactive", revision: "2" }]),
    );
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(screen.getByText("Resource deactivated.")).toBeInTheDocument());
    expect(updateAdministrationResource).toHaveBeenCalledWith("brands", "brand-a", {
      status: "inactive",
      expectedRevision: "1",
    });
    // Deactivated rows stay browsable and offer reactivation, never deletion.
    expect(screen.getByRole("button", { name: /^activate$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("recovers to the sign-in state when the session expires mid-session", async () => {
    const user = userEvent.setup();
    listAdministrationResourceClient.mockResolvedValueOnce(
      page([{ id: "brand-a" }], { more: true, nextCursor: "cursor-1" }),
    );
    render(<AdministrationResourcesClient />);
    await waitFor(() => expect(screen.getByTestId("admin-resources")).toBeInTheDocument());

    // The session lapses between the first page and the continuation request.
    listAdministrationResourceClient.mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "WORKFORCE_AUTH_REQUIRED",
    });
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-resources-unauthorized")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute(
      "href",
      "/workforce/login/",
    );
    expect(screen.queryByTestId("admin-resources")).not.toBeInTheDocument();
  });
});
