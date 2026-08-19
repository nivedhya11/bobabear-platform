import type { Metadata } from "next";

import { CartClient } from "@/components/ordering/CartClient";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your Boba Bear cart before checkout.",
  alternates: { canonical: "/order/cart" },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient brandId={DIRECT_ORDERING_BRAND_ID} />;
}
