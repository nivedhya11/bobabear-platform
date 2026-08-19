import { describe, expect, it } from "vitest";

import {
  orderSupportMailtoUrl,
  orderSupportMessage,
  orderSupportWhatsAppUrl,
} from "./order-support";

describe("order support links", () => {
  it("prefills only the public order number", () => {
    const orderNumber = "ORD-0123456789AB";
    expect(orderSupportMessage(orderNumber)).toContain(orderNumber);
    expect(orderSupportWhatsAppUrl(orderNumber)).toContain(encodeURIComponent(orderNumber));
    expect(orderSupportMailtoUrl(orderNumber)).toContain(encodeURIComponent(orderNumber));
    expect(orderSupportWhatsAppUrl(orderNumber)).not.toMatch(/pay_|rzp_|uuid/i);
  });
});
