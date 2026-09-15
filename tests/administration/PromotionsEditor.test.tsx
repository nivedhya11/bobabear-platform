import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PromotionsEditor } from "../../src/components/administration/commercial/PromotionsEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const listPromotions = vi.fn();
const listCoupons = vi.fn();
const getPromotion = vi.fn();
const setPromotionTargets = vi.fn();

vi.mock("@/lib/administration/commercial-promotions", () => ({
  listPromotions: (...args: unknown[]) => listPromotions(...args),
  listCoupons: (...args: unknown[]) => listCoupons(...args),
  getPromotion: (...args: unknown[]) => getPromotion(...args),
  createPromotion: vi.fn(),
  createCoupon: vi.fn(),
  savePromotionDraft: vi.fn(),
  savePromotionBenefit: vi.fn(),
  setPromotionTargets: (...args: unknown[]) => setPromotionTargets(...args),
  previewPromotionConsequence: vi.fn(),
  previewCouponConsequence: vi.fn(),
  activatePromotion: vi.fn(),
  retirePromotion: vi.fn(),
  activateCoupon: vi.fn(),
  disableCoupon: vi.fn(),
  enableCoupon: vi.fn(),
  retireCoupon: vi.fn(),
}));

const baseContext: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: null,
  productLabel: null,
  variantId: null,
  variantLabel: null,
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
  pricingRead: false,
  pricingManage: false,
  promotionsRead: true,
  promotionsManage: true,
  promotionsActivate: true,
  couponsRead: true,
  couponsManage: true,
};

function draftPromotion(overrides: Partial<{
  id: string;
  triggerType: "automatic" | "coupon";
  revision: string;
  status: "draft" | "active" | "retired";
}> = {}) {
  return {
    id: overrides.id ?? "promo-1",
    brandId: "brand-1",
    code: "WELCOME",
    displayName: "Welcome",
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    salesChannel: "online",
    status: (overrides.status ?? "draft") as "draft" | "active" | "retired",
    triggerType: (overrides.triggerType ?? "automatic") as "automatic" | "coupon",
    stackingPolicy: "exclusive",
    priority: 100,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: null,
    minimumQualifyingAmountPaise: null,
    minimumItemQuantity: null,
    revision: overrides.revision ?? "1",
    supportedLifecycleStates: ["draft", "active", "retired"] as const,
  };
}

function mockPromotionDetail(promotion: ReturnType<typeof draftPromotion>) {
  listPromotions.mockResolvedValue({
    ok: true,
    status: 200,
    data: { promotions: [promotion] },
  });
  listCoupons.mockResolvedValue({ ok: true, status: 200, data: { coupons: [] } });
  getPromotion.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      promotion,
      benefit: null,
      qualifierTargets: [],
      benefitTargets: [],
    },
  });
}

beforeEach(() => {
  listPromotions.mockReset();
  listCoupons.mockReset();
  getPromotion.mockReset();
  setPromotionTargets.mockReset();
  setPromotionTargets.mockResolvedValue({ ok: true, status: 200, data: {} });
  mockPromotionDetail(draftPromotion());
});

describe("PromotionsEditor", () => {
  it("documents only draft/active/retired lifecycle labels", async () => {
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("promotions-editor")).toBeInTheDocument());
    expect(
      screen.getByText(/Lifecycle states: draft, active, retired only/i),
    ).toBeInTheDocument();
    const editor = screen.getByTestId("promotions-editor");
    expect(editor.textContent).not.toMatch(/\bscheduled\b/i);
    expect(editor.textContent).not.toMatch(/\bended\b/i);
    expect(editor.textContent).not.toMatch(/\bpaused\b/i);
  });

  it("create UI has Trigger type select", async () => {
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("promotions-editor")).toBeInTheDocument());
    expect(screen.getByLabelText("Trigger type")).toBeInTheDocument();
  });

  it("automatic trigger hides Create coupon and shows coupon-triggered explanation", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion({ triggerType: "automatic" }));
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() => expect(screen.getByText(/Trigger: automatic/)).toBeInTheDocument());
    expect(screen.queryByTestId("coupon-authoring")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create coupon/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Coupons require a coupon-triggered Promotion/i),
    ).toBeInTheDocument();
  });

  it("coupon trigger shows Create coupon authoring", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion({ triggerType: "coupon" }));
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() => expect(screen.getByTestId("coupon-authoring")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Create coupon/i })).toBeInTheDocument();
  });

  it("draft promotion with product+variant context sets qualifier via setPromotionTargets", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion({ revision: "3" }));
    setPromotionTargets.mockResolvedValue({ ok: true, status: 200, data: {} });
    render(
      <PromotionsEditor
        context={{
          ...baseContext,
          productId: "product-1",
          productLabel: "Tea",
          variantId: "variant-1",
          variantLabel: "Regular",
        }}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() => expect(screen.getByTestId("promotion-targets")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Set qualifier to selected variant" }));
    await waitFor(() => expect(setPromotionTargets).toHaveBeenCalled());
    expect(setPromotionTargets).toHaveBeenCalledWith("brand-1", "promo-1", {
      expectedPromotionRevision: "3",
      targetRole: "qualifier",
      targets: [
        {
          targetType: "variant",
          variantId: "variant-1",
          productId: null,
        },
      ],
    });
  });

  it("manage without activate hides Review & activate and Review & retire", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion());
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={{
          ...capabilities,
          promotionsManage: true,
          promotionsActivate: false,
        }}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() => expect(screen.getByLabelText("Benefit type")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Review & activate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review & retire/i })).not.toBeInTheDocument();
  });

  it("manage with activate exposes Review & activate", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion());
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={{
          ...capabilities,
          promotionsManage: true,
          promotionsActivate: true,
        }}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Review & activate/i })).toBeInTheDocument(),
    );
  });

  it("activate without manage hides activation but still exposes retirement affordance", async () => {
    const user = userEvent.setup();
    mockPromotionDetail(draftPromotion({ status: "active" }));
    render(
      <PromotionsEditor
        context={baseContext}
        capabilities={{
          ...capabilities,
          promotionsManage: false,
          promotionsActivate: true,
        }}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Welcome \(WELCOME\)/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Welcome \(WELCOME\)/ }));
    await waitFor(() => expect(screen.getByText(/Trigger:/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Review & activate/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review & retire/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Benefit type")).not.toBeInTheDocument();
  });
});
