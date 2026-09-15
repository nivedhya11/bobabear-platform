import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuEditor } from "../../src/components/administration/commercial/MenuEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const listMenus = vi.fn();
const getMenu = vi.fn();
const activateMenuSection = vi.fn();
const retireMenuSection = vi.fn();
const activateMenuEntry = vi.fn();
const retireMenuEntry = vi.fn();
const reorderMenuSections = vi.fn();

vi.mock("@/lib/administration/commercial-menu", () => ({
  listMenus: (...args: unknown[]) => listMenus(...args),
  getMenu: (...args: unknown[]) => getMenu(...args),
  createMenu: vi.fn(),
  addMenuSection: vi.fn(),
  addMenuEntry: vi.fn(),
  reorderMenuSections: (...args: unknown[]) => reorderMenuSections(...args),
  reorderMenuEntries: vi.fn(),
  saveMenuEntryDisplayDraft: vi.fn(),
  previewMenuPublish: vi.fn(),
  publishMenu: vi.fn(),
  activateMenuSection: (...args: unknown[]) => activateMenuSection(...args),
  retireMenuSection: (...args: unknown[]) => retireMenuSection(...args),
  activateMenuEntry: (...args: unknown[]) => activateMenuEntry(...args),
  retireMenuEntry: (...args: unknown[]) => retireMenuEntry(...args),
}));

const capabilities: CommercialCapabilities = {
  catalogRead: false,
  catalogManage: false,
  menuRead: true,
  menuManage: true,
  assortmentRead: false,
  assortmentManage: false,
  pricingRead: false,
  pricingManage: false,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: "product-1",
  productLabel: "Tea",
  variantId: null,
  variantLabel: null,
  outletId: null,
  outletLabel: null,
  menuId: "menu-1",
};

function sectionControls(name: RegExp | string) {
  const heading = screen.getByRole("heading", { name });
  return within(heading.parentElement as HTMLElement);
}

beforeEach(() => {
  listMenus.mockReset();
  getMenu.mockReset();
  activateMenuSection.mockReset();
  retireMenuSection.mockReset();
  activateMenuEntry.mockReset();
  retireMenuEntry.mockReset();
  reorderMenuSections.mockReset();

  activateMenuSection.mockResolvedValue({ ok: true, status: 200, data: {} });
  activateMenuEntry.mockResolvedValue({ ok: true, status: 200, data: {} });
  reorderMenuSections.mockResolvedValue({ ok: true, status: 200, data: {} });

  listMenus.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      menus: [
        {
          id: "menu-1",
          code: "MAIN",
          name: "Main menu",
          lifecycleStatus: "draft",
          revision: "1",
          hasEffectiveVersion: false,
          hasDraftVersion: true,
        },
      ],
    },
  });
  getMenu.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      menu: {
        id: "menu-1",
        brandId: "brand-1",
        code: "MAIN",
        name: "Main menu",
        lifecycleStatus: "draft",
        revision: "1",
        effectiveMenuVersionId: null,
        draftMenuVersionId: "dv-1",
      },
      effective: null,
      draft: {
        versionId: "dv-1",
        sections: [
          {
            id: "sec-root-a",
            parentSectionId: null,
            code: "ROOT_A",
            name: "Root A",
            description: null,
            position: 0,
            lifecycleStatus: "draft",
          },
          {
            id: "sec-root-b",
            parentSectionId: null,
            code: "ROOT_B",
            name: "Root B",
            description: null,
            position: 1,
            lifecycleStatus: "draft",
          },
          {
            id: "sec-child-1",
            parentSectionId: "sec-root-a",
            code: "CHILD_1",
            name: "Child 1",
            description: null,
            position: 0,
            lifecycleStatus: "draft",
          },
          {
            id: "sec-child-2",
            parentSectionId: "sec-root-a",
            code: "CHILD_2",
            name: "Child 2",
            description: null,
            position: 1,
            lifecycleStatus: "draft",
          },
        ],
        entries: [
          {
            id: "entry-1",
            sectionId: "sec-root-a",
            productId: "product-1",
            displayName: "Milk Tea",
            displayDescription: null,
            imagePath: null,
            position: 0,
            lifecycleStatus: "draft",
          },
        ],
      },
      draftDiffersFromEffective: true,
    },
  });
});

describe("MenuEditor", () => {
  it("exposes Move up / Move down for keyboard reorder", async () => {
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("menu-editor")).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: "Move up" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Move down" }).length).toBeGreaterThan(0);
  });

  it("shows media reference absence honestly without upload control", async () => {
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/No media reference/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/upload|image file/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon|upload not available/i)).not.toBeInTheDocument();
  });

  it("Activate section is present for draft section and calls activateMenuSection", async () => {
    const user = userEvent.setup();
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("menu-editor")).toBeInTheDocument());
    const activate = sectionControls(/Root A/).getByRole("button", { name: "Activate section" });
    expect(activate).toBeInTheDocument();
    await user.click(activate);
    await waitFor(() => expect(activateMenuSection).toHaveBeenCalled());
    expect(activateMenuSection).toHaveBeenCalledWith("brand-1", "menu-1", "sec-root-a", {
      expectedMenuRevision: "1",
    });
  });

  it("Move down on first child reorders only siblings under parent", async () => {
    const user = userEvent.setup();
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("menu-editor")).toBeInTheDocument());
    await user.click(sectionControls(/Child 1/).getByRole("button", { name: "Move down" }));
    await waitFor(() => expect(reorderMenuSections).toHaveBeenCalled());
    expect(reorderMenuSections).toHaveBeenCalledWith("brand-1", "menu-1", {
      expectedMenuRevision: "1",
      parentSectionId: "sec-root-a",
      orderedSectionIds: ["sec-child-2", "sec-child-1"],
    });
    const payload = reorderMenuSections.mock.calls[0]![2] as {
      orderedSectionIds: string[];
    };
    expect(payload.orderedSectionIds).not.toContain("sec-root-a");
    expect(payload.orderedSectionIds).not.toContain("sec-root-b");
  });

  it("disables Move up on first sibling and Move down on last sibling within group", async () => {
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("menu-editor")).toBeInTheDocument());
    expect(sectionControls(/Child 1/).getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(sectionControls(/Child 2/).getByRole("button", { name: "Move down" })).toBeDisabled();
  });

  it("Activate entry for draft entry calls activateMenuEntry", async () => {
    const user = userEvent.setup();
    render(
      <MenuEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onSelectMenu={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("menu-editor")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Activate entry" }));
    await waitFor(() => expect(activateMenuEntry).toHaveBeenCalled());
    expect(activateMenuEntry).toHaveBeenCalledWith("brand-1", "menu-1", "entry-1", {
      expectedMenuRevision: "1",
    });
  });
});
