import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationAuditClient } from "../../src/components/administration/AdministrationAuditClient";

const listAdministrationAuditEventsClient = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  listAdministrationAuditEventsClient: (...args: unknown[]) =>
    listAdministrationAuditEventsClient(...args),
}));

type AuditEventSeed = Readonly<{ id: string; action: string }>;

function auditEvent(seed: AuditEventSeed) {
  return {
    id: seed.id,
    occurredAt: "2026-01-01T00:00:00.000Z",
    action: seed.action,
    targetType: "membership",
    targetId: "m-1",
    actorWorkforceUserId: "wf-1",
  };
}

function page(
  seeds: readonly AuditEventSeed[],
  continuation: Readonly<{ more?: boolean; nextCursor?: string | null }> = {},
) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      items: seeds.map(auditEvent),
      more: continuation.more ?? false,
      nextCursor: continuation.nextCursor ?? null,
    },
  };
}

const NO_FILTERS = {
  cursor: undefined,
  actorWorkforceUserId: undefined,
  action: undefined,
  occurredFrom: undefined,
  occurredTo: undefined,
};

beforeEach(() => {
  listAdministrationAuditEventsClient.mockReset();
  listAdministrationAuditEventsClient.mockResolvedValue(page([]));
});

describe("AdministrationAuditClient", () => {
  it("loads once on mount with no filters", async () => {
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());
    expect(listAdministrationAuditEventsClient).toHaveBeenCalledTimes(1);
    expect(listAdministrationAuditEventsClient).toHaveBeenCalledWith(NO_FILTERS);
  });

  it("does not fetch while draft filter fields are edited", async () => {
    const user = userEvent.setup();
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());
    expect(listAdministrationAuditEventsClient).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText(/actor workforce user id/i), "wf-9");
    await user.type(screen.getByLabelText(/^action$/i), "membership.grant");
    await user.type(screen.getByLabelText(/occurred from/i), "2026-01-01");

    expect(listAdministrationAuditEventsClient).toHaveBeenCalledTimes(1);
  });

  it("fetches exactly once with the draft snapshot when filters are applied", async () => {
    const user = userEvent.setup();
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/actor workforce user id/i), "wf-9");
    await user.type(screen.getByLabelText(/^action$/i), "membership.grant");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());
    expect(listAdministrationAuditEventsClient).toHaveBeenCalledTimes(2);
    expect(listAdministrationAuditEventsClient).toHaveBeenLastCalledWith({
      cursor: undefined,
      actorWorkforceUserId: "wf-9",
      action: "membership.grant",
      occurredFrom: undefined,
      occurredTo: undefined,
    });
  });

  it("loads more with the applied snapshot, not the edited draft", async () => {
    const user = userEvent.setup();
    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e1", action: "initial.event" }], { more: true, nextCursor: "c1" }),
    );
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());

    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e2", action: "applied.event" }], { more: true, nextCursor: "c2" }),
    );
    await user.type(screen.getByLabelText(/^action$/i), "applied.event");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await waitFor(() => expect(screen.getByText("applied.event")).toBeInTheDocument());

    // Editing the draft after Apply must not leak into the next page request.
    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e3", action: "page-two.event" }]),
    );
    await user.type(screen.getByLabelText(/^action$/i), "-draft-only");
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(screen.getByText("page-two.event")).toBeInTheDocument());
    expect(listAdministrationAuditEventsClient).toHaveBeenLastCalledWith({
      cursor: "c2",
      actorWorkforceUserId: undefined,
      action: "applied.event",
      occurredFrom: undefined,
      occurredTo: undefined,
    });
    // The applied page and the appended page are both retained.
    expect(screen.getByText("applied.event")).toBeInTheDocument();
  });

  it("surfaces a transport failure instead of an empty or stale list", async () => {
    listAdministrationAuditEventsClient.mockReset();
    listAdministrationAuditEventsClient.mockResolvedValue({
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
    });
    render(<AdministrationAuditClient />);
    await waitFor(() =>
      expect(screen.getByTestId("admin-audit-error")).toHaveTextContent(
        "Audit events could not be loaded.",
      ),
    );
    expect(screen.getByTestId("admin-audit-retry")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-audit-empty")).not.toBeInTheDocument();
  });

  it("retries with the applied filter snapshot after a failed read", async () => {
    const user = userEvent.setup();
    listAdministrationAuditEventsClient.mockResolvedValueOnce(page([]));
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^action$/i), "membership.grant");
    listAdministrationAuditEventsClient.mockResolvedValueOnce({
      ok: false,
      status: 500,
      code: "INTERNAL_ERROR",
    });
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await waitFor(() => expect(screen.getByTestId("admin-audit-error")).toBeInTheDocument());

    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e-ok", action: "membership.grant" }]),
    );
    await user.click(screen.getByTestId("admin-audit-retry"));
    await waitFor(() => expect(screen.getByText("membership.grant")).toBeInTheDocument());
    expect(listAdministrationAuditEventsClient).toHaveBeenLastCalledWith({
      cursor: undefined,
      actorWorkforceUserId: undefined,
      action: "membership.grant",
      occurredFrom: undefined,
      occurredTo: undefined,
    });
  });

  it("recovers on a later successful request after a failed continuation", async () => {
    const user = userEvent.setup();
    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e1", action: "first.event" }], { more: true, nextCursor: "c1" }),
    );
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByText("first.event")).toBeInTheDocument());

    // A failed continuation replaces the list with the error surface.
    listAdministrationAuditEventsClient.mockResolvedValueOnce({
      ok: false,
      status: 500,
      code: "INTERNAL_ERROR",
    });
    await user.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(screen.getByTestId("admin-audit-error")).toBeInTheDocument());
    expect(screen.queryByText("first.event")).not.toBeInTheDocument();

    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e2", action: "recovered.event" }]),
    );
    await user.click(screen.getByTestId("admin-audit-retry"));
    await waitFor(() => expect(screen.getByText("recovered.event")).toBeInTheDocument());
  });

  it("distinguishes an authorized empty result from unauthorized and failed reads", async () => {
    listAdministrationAuditEventsClient.mockReset();
    listAdministrationAuditEventsClient.mockResolvedValue(page([]));
    const empty = render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit-empty")).toBeInTheDocument());
    empty.unmount();

    listAdministrationAuditEventsClient.mockResolvedValue({
      ok: false,
      status: 403,
      code: "ADMIN_UNAUTHORIZED",
    });
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit-forbidden")).toBeInTheDocument());
  });

  it("ignores a stale in-flight response that resolves after a newer one", async () => {
    const user = userEvent.setup();
    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e1", action: "initial.event" }], { more: true, nextCursor: "c1" }),
    );
    render(<AdministrationAuditClient />);
    await waitFor(() => expect(screen.getByTestId("admin-audit")).toBeInTheDocument());

    // Start a "Load more" that never settles yet; append keeps the form mounted.
    let resolveStale: ((value: unknown) => void) | undefined;
    listAdministrationAuditEventsClient.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
    );
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(resolveStale).toBeDefined();

    // Apply newer filters; this response wins.
    listAdministrationAuditEventsClient.mockResolvedValueOnce(
      page([{ id: "e9", action: "newest.event" }]),
    );
    await user.type(screen.getByLabelText(/^action$/i), "newest.event");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await waitFor(() => expect(screen.getByText("newest.event")).toBeInTheDocument());

    // The older request now settles and must be discarded.
    resolveStale!(page([{ id: "e2", action: "stale.event" }]));
    await waitFor(() => expect(screen.getByText("newest.event")).toBeInTheDocument());

    expect(screen.queryByText("stale.event")).not.toBeInTheDocument();
    expect(screen.queryByText("initial.event")).not.toBeInTheDocument();
  });
});
