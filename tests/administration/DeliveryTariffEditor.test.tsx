import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryTariffEditor } from "../../src/components/administration/commercial/DeliveryTariffEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const getDeliveryTariff = vi.fn();
const previewDeliveryTariff = vi.fn();

vi.mock("@/lib/administration/commercial-pricing", () => ({
  getDeliveryTariff: (...args: unknown[]) => getDeliveryTariff(...args),
  previewDeliveryTariff: (...args: unknown[]) => previewDeliveryTariff(...args),
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
  previewDeliveryTariff.mockReset();
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
  previewDeliveryTariff.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      preview: {
        expectedTariffConfigRevision: "1",
        currentBands: [{ maxDistanceMeters: 3000, amountPaise: 4000 }],
        proposedBands: [{ maxDistanceMeters: 3000, amountPaise: 4000 }],
        currentFreeDeliverySubtotalThresholdPaise: null,
        proposedFreeDeliverySubtotalThresholdPaise: null,
        customerMonetaryImplication: "No change",
        wouldChangeCustomerDeliveryPrice: false,
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

  it("rejects non-integer max distance without calling preview", async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();
    render(
      <DeliveryTariffEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={onStatus}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("delivery-tariff-editor")).toBeInTheDocument());
    const distance = screen.getByLabelText(/Max distance \(meters\)/);
    await user.clear(distance);
    await user.type(distance, "3000abc");
    await user.click(screen.getByRole("button", { name: /Review & update/i }));
    expect(previewDeliveryTariff).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith(
      "Enter valid distance meters and INR fees for each band.",
    );
  });

  it("valid max distance calls preview with maxDistanceMeters: 3000", async () => {
    const user = userEvent.setup();
    render(
      <DeliveryTariffEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("delivery-tariff-editor")).toBeInTheDocument());
    const distance = screen.getByLabelText(/Max distance \(meters\)/);
    await user.clear(distance);
    await user.type(distance, "3000");
    await user.click(screen.getByRole("button", { name: /Review & update/i }));
    await waitFor(() => expect(previewDeliveryTariff).toHaveBeenCalled());
    expect(previewDeliveryTariff).toHaveBeenCalledWith("brand-1", "outlet-1", {
      deliveryFeeBands: [{ maxDistanceMeters: 3000, amountPaise: 4000 }],
      freeDeliverySubtotalThresholdPaise: null,
    });
  });
});
