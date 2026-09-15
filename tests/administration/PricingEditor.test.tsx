import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PricingEditor } from "../../src/components/administration/commercial/PricingEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";
import { COMMERCIAL_CONFLICT_MESSAGE } from "../../src/lib/administration/commercial-errors";

const listPriceBooks = vi.fn();
const getPriceBook = vi.fn();
const attachModifierPrice = vi.fn();
const getCatalogProductGraph = vi.fn();
const previewPriceBookActivation = vi.fn();
const activatePriceBook = vi.fn();

vi.mock("@/lib/administration/commercial-pricing", () => ({
  listPriceBooks: (...args: unknown[]) => listPriceBooks(...args),
  getPriceBook: (...args: unknown[]) => getPriceBook(...args),
  createPriceBook: vi.fn(),
  attachVariantPrice: vi.fn(),
  attachModifierPrice: (...args: unknown[]) => attachModifierPrice(...args),
  previewPriceBookActivation: (...args: unknown[]) => previewPriceBookActivation(...args),
  activatePriceBook: (...args: unknown[]) => activatePriceBook(...args),
}));

vi.mock("@/lib/administration/commercial-catalog", () => ({
  getCatalogProductGraph: (...args: unknown[]) => getCatalogProductGraph(...args),
}));

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: "product-1",
  productLabel: "Tea",
  variantId: "variant-1",
  variantLabel: "Regular",
  outletId: null,
  outletLabel: null,
  menuId: null,
};

const capabilities: CommercialCapabilities = {
  catalogRead: false,
  catalogManage: false,
  menuRead: false,
  menuManage: false,
  assortmentRead: false,
  assortmentManage: false,
  pricingRead: true,
  pricingManage: true,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

const priceBook = {
  id: "pb-1",
  brandId: "brand-1",
  scopeType: "brand" as const,
  territoryId: null,
  organizationId: null,
  outletId: null,
  code: "MAIN",
  name: "Main book",
  salesChannel: "direct" as const,
  currency: "INR" as const,
  taxInclusionMode: "exclusive" as const,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveTo: null,
  lifecycleStatus: "draft" as const,
  revision: "5",
};

beforeEach(() => {
  listPriceBooks.mockReset();
  getPriceBook.mockReset();
  attachModifierPrice.mockReset();
  getCatalogProductGraph.mockReset();
  previewPriceBookActivation.mockReset();
  activatePriceBook.mockReset();

  listPriceBooks.mockResolvedValue({
    ok: true,
    status: 200,
    data: { priceBooks: [priceBook] },
  });
  getPriceBook.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      inspection: {
        priceBook,
        variantPrices: [],
        modifierPrices: [],
        customerEffective: [],
      },
    },
  });
  getCatalogProductGraph.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      graph: {
        product: { id: "product-1" },
        variants: [{ id: "variant-1" }],
        modifierGroups: [
          {
            id: "mg-1",
            brandId: "brand-1",
            code: "TOPPINGS",
            draftContentRevision: "1",
            draft: { name: "Toppings", description: null, lifecycleStatus: "draft" },
            effective: null,
          },
        ],
        modifierOptions: [
          {
            id: "mo-1",
            brandId: "brand-1",
            code: "PEARL",
            draft: { name: "Pearl", description: null, lifecycleStatus: "draft" },
          },
        ],
        modifierGroupOptions: [
          {
            id: "mgo-1",
            brandId: "brand-1",
            modifierGroupId: "mg-1",
            modifierOptionId: "mo-1",
          },
        ],
        variantModifierGroups: [
          {
            id: "vmg-1",
            brandId: "brand-1",
            variantId: "variant-1",
            modifierGroupId: "mg-1",
          },
        ],
      },
    },
  });
  attachModifierPrice.mockResolvedValue({
    ok: true,
    status: 200,
    data: { modifierPrice: { id: "mp-1" }, priceBookRevision: "6" },
  });
  previewPriceBookActivation.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      preview: {
        expectedPriceBookRevision: "5",
        lifecycleStatus: "draft",
        customerMonetaryConsequence: "Activation would change customer-effective monetary amounts.",
        variantPriceChanges: [],
        overlapBlockers: [],
        referenceBlockers: [],
        wouldChangeCustomerPricing: true,
      },
    },
  });
  activatePriceBook.mockResolvedValue({ ok: true, status: 200, data: { revision: "6" } });
});

describe("PricingEditor", () => {
  it("shows modifier-price-authoring with product+variant context", async () => {
    const user = userEvent.setup();
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await waitFor(() => expect(screen.getByTestId("modifier-price-authoring")).toBeInTheDocument());
  });

  it("Attach modifier price calls attachModifierPrice with revision and parsed paise", async () => {
    const user = userEvent.setup();
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await waitFor(() =>
      expect(screen.getByLabelText("Modifier association and option")).toBeInTheDocument(),
    );
    await user.selectOptions(
      screen.getByLabelText("Modifier association and option"),
      "vmg-1:mgo-1",
    );
    await user.type(screen.getByLabelText("Modifier INR delta"), "20.00");
    await user.click(screen.getByRole("button", { name: "Attach modifier price" }));
    await waitFor(() => expect(attachModifierPrice).toHaveBeenCalled());
    expect(attachModifierPrice).toHaveBeenCalledWith("brand-1", "pb-1", {
      expectedPriceBookRevision: "5",
      variantModifierGroupId: "vmg-1",
      modifierGroupOptionId: "mgo-1",
      priceDeltaPaise: "2000",
    });
  });

  it("surfaces stale conflict from attachModifierPrice via onStatus", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    attachModifierPrice.mockResolvedValue({
      ok: false,
      status: 409,
      code: "PRICE_BOOK_REVISION_CONFLICT",
    });
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await waitFor(() =>
      expect(screen.getByLabelText("Modifier association and option")).toBeInTheDocument(),
    );
    await user.selectOptions(
      screen.getByLabelText("Modifier association and option"),
      "vmg-1:mgo-1",
    );
    await user.type(screen.getByLabelText("Modifier INR delta"), "10");
    await user.click(screen.getByRole("button", { name: "Attach modifier price" }));
    await waitFor(() =>
      expect(onStatus).toHaveBeenCalledWith(COMMERCIAL_CONFLICT_MESSAGE),
    );
  });

  it("activation consumes exact reviewed expectedPriceBookRevision and reports effect", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Review & activate/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Review & activate/i }));
    await waitFor(() => expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument());
    expect(screen.getByText("5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirm effect/i }));
    await waitFor(() => expect(activatePriceBook).toHaveBeenCalled());
    expect(activatePriceBook).toHaveBeenCalledWith("brand-1", "pb-1", {
      expectedPriceBookRevision: "5",
    });
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("Price book activated."));
  });

  it("stale activation conflict remains recoverable in the review dialog", async () => {
    const user = userEvent.setup();
    activatePriceBook.mockResolvedValue({
      ok: false,
      status: 409,
      code: "PRICE_BOOK_REVISION_CONFLICT",
    });
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await user.click(await screen.findByRole("button", { name: /Review & activate/i }));
    await waitFor(() => expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Confirm effect/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(COMMERCIAL_CONFLICT_MESSAGE),
    );
    expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument();
  });

  it("Cancel on activation review reports no effect without calling activate", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(
      <PricingEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Main book \(MAIN\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Main book \(MAIN\)/ }));
    await user.click(await screen.findByRole("button", { name: /Review & activate/i }));
    await waitFor(() => expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(activatePriceBook).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith("No effect — draft work remains.");
  });
});
