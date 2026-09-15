import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssortmentEditor } from "../../src/components/administration/commercial/AssortmentEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const inspectAssortmentVariant = vi.fn();
const previewAssortmentConsequence = vi.fn();
const excludeAssortmentTarget = vi.fn();
const includeAssortmentVariant = vi.fn();

vi.mock("@/lib/administration/commercial-assortment", () => ({
  inspectAssortmentVariant: (...args: unknown[]) => inspectAssortmentVariant(...args),
  includeAssortmentVariant: (...args: unknown[]) => includeAssortmentVariant(...args),
  excludeAssortmentTarget: (...args: unknown[]) => excludeAssortmentTarget(...args),
  previewAssortmentConsequence: (...args: unknown[]) => previewAssortmentConsequence(...args),
}));

const baseContext: CommercialContext = {
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
  assortmentRead: true,
  assortmentManage: true,
  pricingRead: false,
  pricingManage: false,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

beforeEach(() => {
  inspectAssortmentVariant.mockReset();
  previewAssortmentConsequence.mockReset();
  excludeAssortmentTarget.mockReset();
  includeAssortmentVariant.mockReset();
  inspectAssortmentVariant.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      inspection: {
        brandId: "brand-1",
        variantId: "variant-1",
        includeRule: null,
        relatedRules: [],
        outletConsequences: [],
        availabilityIsSeparate: true,
      },
    },
  });
  previewAssortmentConsequence.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      preview: {
        mutationType: "exclude",
        brandId: "brand-1",
        expectedRuleRevision: "7",
        currentRule: null,
        proposed: { decision: "exclude", status: "active" },
        availabilityRemainsSeparate: true,
        outletConsequences: [],
        customerOrderabilityImplication: "Outlet intent updated",
        validationBlockers: [],
        wouldChangeAssortmentIntent: true,
      },
    },
  });
  excludeAssortmentTarget.mockResolvedValue({
    ok: true,
    status: 200,
    data: { rule: { id: "rule-1" } },
  });
});

describe("AssortmentEditor", () => {
  it("distinguishes Assortment vs Availability", async () => {
    render(
      <AssortmentEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("assortment-editor")).toBeInTheDocument());
    expect(screen.getByText(/Brand assortment vs availability/i)).toBeInTheDocument();
    expect(screen.getByText(/ASSORTMENT/)).toBeInTheDocument();
    expect(screen.getByText(/AVAILABILITY/)).toBeInTheDocument();
  });

  it("manage=false does not offer include mutation", async () => {
    render(
      <AssortmentEditor
        context={baseContext}
        capabilities={{ ...capabilities, assortmentManage: false }}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("assortment-editor")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /include variant/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("exclude-brand-assortment")).not.toBeInTheDocument();
  });

  it("selected Outlet exclusion previews and effects outlet scope — not brand", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(
      <AssortmentEditor
        context={{
          ...baseContext,
          outletId: "outlet-99",
          outletLabel: "Main",
        }}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("exclude-outlet-assortment")).toBeInTheDocument());
    await user.click(screen.getByTestId("exclude-outlet-assortment"));
    await waitFor(() => expect(previewAssortmentConsequence).toHaveBeenCalled());
    expect(previewAssortmentConsequence).toHaveBeenCalledWith("brand-1", {
      mutationType: "exclude",
      variantId: "variant-1",
      scopeType: "outlet",
      outletId: "outlet-99",
    });
    expect(screen.getByText(/Outlet exclusion/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirm effect/i }));
    await waitFor(() => expect(excludeAssortmentTarget).toHaveBeenCalled());
    expect(excludeAssortmentTarget).toHaveBeenCalledWith("brand-1", {
      scopeType: "outlet",
      variantId: "variant-1",
      expectedRuleRevision: "7",
      outletId: "outlet-99",
    });
    expect(excludeAssortmentTarget.mock.calls[0]![1]).not.toMatchObject({ scopeType: "brand" });
  });

  it("cancel causes no assortment effect", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(
      <AssortmentEditor
        context={{ ...baseContext, outletId: "outlet-99", outletLabel: "Main" }}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("exclude-outlet-assortment")).toBeInTheDocument());
    await user.click(screen.getByTestId("exclude-outlet-assortment"));
    await waitFor(() => expect(screen.getByTestId("consequence-review-dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(excludeAssortmentTarget).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith(expect.stringMatching(/No effect/i));
  });

  it("brand-wide exclude remains explicit when no outlet is selected", async () => {
    const user = userEvent.setup();
    render(
      <AssortmentEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("exclude-brand-assortment")).toBeInTheDocument());
    expect(screen.queryByTestId("exclude-outlet-assortment")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("exclude-brand-assortment"));
    await waitFor(() =>
      expect(previewAssortmentConsequence).toHaveBeenCalledWith("brand-1", {
        mutationType: "exclude",
        variantId: "variant-1",
        scopeType: "brand",
      }),
    );
  });
});
