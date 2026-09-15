import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PromotionsEditor } from "../../src/components/administration/commercial/PromotionsEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const listPromotions = vi.fn();
const listCoupons = vi.fn();
const getPromotion = vi.fn();

vi.mock("@/lib/administration/commercial-promotions", () => ({
  listPromotions: (...args: unknown[]) => listPromotions(...args),
  listCoupons: (...args: unknown[]) => listCoupons(...args),
  getPromotion: (...args: unknown[]) => getPromotion(...args),
  createPromotion: vi.fn(),
  createCoupon: vi.fn(),
  savePromotionDraft: vi.fn(),
  savePromotionBenefit: vi.fn(),
  previewPromotionConsequence: vi.fn(),
  previewCouponConsequence: vi.fn(),
  activatePromotion: vi.fn(),
  retirePromotion: vi.fn(),
  activateCoupon: vi.fn(),
  disableCoupon: vi.fn(),
  enableCoupon: vi.fn(),
  retireCoupon: vi.fn(),
}));

const context: CommercialContext = {
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

beforeEach(() => {
  listPromotions.mockReset();
  listCoupons.mockReset();
  getPromotion.mockReset();
  const draftPromotion = {
    id: "promo-1",
    brandId: "brand-1",
    code: "WELCOME",
    displayName: "Welcome",
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    salesChannel: "online",
    status: "draft" as const,
    triggerType: "automatic" as const,
    stackingPolicy: "exclusive",
    priority: 100,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: null,
    minimumQualifyingAmountPaise: null,
    minimumItemQuantity: null,
    revision: "1",
    supportedLifecycleStates: ["draft", "active", "retired"] as const,
  };
  listPromotions.mockResolvedValue({
    ok: true,
    status: 200,
    data: { promotions: [draftPromotion] },
  });
  listCoupons.mockResolvedValue({ ok: true, status: 200, data: { coupons: [] } });
  getPromotion.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      promotion: draftPromotion,
      benefit: null,
      qualifierTargets: [],
      benefitTargets: [],
    },
  });
});

describe("PromotionsEditor", () => {
  it("documents only draft/active/retired lifecycle labels", async () => {
    render(
      <PromotionsEditor
        context={context}
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
});
