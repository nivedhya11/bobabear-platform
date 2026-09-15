import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuEditor } from "../../src/components/administration/commercial/MenuEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const listMenus = vi.fn();
const getMenu = vi.fn();

vi.mock("@/lib/administration/commercial-menu", () => ({
  listMenus: (...args: unknown[]) => listMenus(...args),
  getMenu: (...args: unknown[]) => getMenu(...args),
  createMenu: vi.fn(),
  addMenuSection: vi.fn(),
  addMenuEntry: vi.fn(),
  reorderMenuSections: vi.fn(),
  reorderMenuEntries: vi.fn(),
  saveMenuEntryDisplayDraft: vi.fn(),
  previewMenuPublish: vi.fn(),
  publishMenu: vi.fn(),
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

beforeEach(() => {
  listMenus.mockReset();
  getMenu.mockReset();
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
            id: "sec-1",
            parentSectionId: null,
            code: "DRINKS",
            name: "Drinks",
            description: null,
            position: 0,
            lifecycleStatus: "draft",
          },
          {
            id: "sec-2",
            parentSectionId: null,
            code: "FOOD",
            name: "Food",
            description: null,
            position: 1,
            lifecycleStatus: "draft",
          },
        ],
        entries: [
          {
            id: "entry-1",
            sectionId: "sec-1",
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
});
