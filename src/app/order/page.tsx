import type { Metadata } from "next";

import { OrderingCatalogClient } from "@/components/ordering/OrderingCatalogClient";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

export const metadata: Metadata = {
  title: "Menu",
  description: "Browse the Boba Bear menu and add items to your cart.",
  alternates: { canonical: "/order" },
};

export default function OrderPage() {
  return <OrderingCatalogClient brandId={DIRECT_ORDERING_BRAND_ID} />;
}
