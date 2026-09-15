import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryTariffEditor } from "../../src/components/administration/commercial/DeliveryTariffEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const getDeliveryTariff = vi.fn();

vi.mock("@/lib/administration/commercial-pricing", () => ({
  getDeliveryTariff: (...args: unknown[]) => getDeliveryTariff(...args),
  previewDeliveryTariff: vi.fn(),
  updateDeliveryTariff: vi.fn(),
}));

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: null,
  productLabel: null,
  variantId: null,
  variantLabel: null,
  outletId: "outlet-1",
  outletLabel: "Main",
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

beforeEach(() => {
  getDeliveryTariff.mockReset();
  getDeliveryTariff.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      tariff: {
        outletId: "outlet-1",
        brandId: "brand-1",
        expectedTariffConfigRevision: "1",
        deliveryFeeBands: [{ maxDistanceMeters: 3000, amountPaise: 4000 }],
        freeDeliverySubtotalThresholdPaise: null,
        geographicServiceability: {
          routingPriority: 1,
          serviceOriginLatitude: "30.3",
          serviceOriginLongitude: "78.0",
          maxServiceDistanceMeters: 5000,
        },
      },
    },
  });
});

describe("DeliveryTariffEditor", () => {
  it("labels customer delivery price separately from serviceability and avoids provider cost language", async () => {
    render(
      <DeliveryTariffEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("delivery-tariff-editor")).toBeInTheDocument());
    expect(screen.getByText("Customer delivery price")).toBeInTheDocument();
    expect(screen.getByText(/Geographic serviceability \(read-only context\)/)).toBeInTheDocument();
    expect(screen.getByText(/not provider\/carrier cost/i)).toBeInTheDocument();
    expect(screen.queryByText(/carrier invoice|courier fee paid|provider cost language/i)).not.toBeInTheDocument();
  });
});
