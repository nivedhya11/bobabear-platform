import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerVerificationPanel } from "../../src/components/administration/commercial/CustomerVerificationPanel";
import type { CommercialContext } from "../../src/components/administration/commercial/commercial-types";

const postCustomerCommercialVerification = vi.fn();

vi.mock("@/lib/administration/commercial", () => ({
  postCustomerCommercialVerification: (...args: unknown[]) =>
    postCustomerCommercialVerification(...args),
}));

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: "product-1",
  productLabel: "Tea",
  variantId: "variant-1",
  variantLabel: "Regular",
  outletId: "outlet-1",
  outletLabel: "Main",
  menuId: null,
};

beforeEach(() => {
  postCustomerCommercialVerification.mockReset();
});

describe("CustomerVerificationPanel", () => {
  it("renders outcome labels and retry control", async () => {
    const user = userEvent.setup();
    postCustomerCommercialVerification.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        brandId: "brand-1",
        variantId: "variant-1",
        outletId: "outlet-1",
        outcome: "VERIFIED_MATCH",
        explanation: "Customer projections match composed inspection.",
        customerMenu: null,
        pricing: null,
        promotions: null,
        deliveryTariff: null,
        realtimePushRequired: false,
        formStateTrusted: false,
        subsequentReadValid: true,
      },
    });

    render(<CustomerVerificationPanel context={context} onStatus={vi.fn()} />);
    expect(screen.getByTestId("customer-verification")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /verify customer truth/i }));
    await waitFor(() => expect(screen.getByText("VERIFIED_MATCH")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Retry$/i })).toBeInTheDocument();
  });
});
