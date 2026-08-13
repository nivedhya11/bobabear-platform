import type { Metadata } from "next";

import { OrderingCatalogClient } from "@/components/ordering/OrderingCatalogClient";
import orderingCatalogJson from "@/data/ordering-catalog.json";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const catalog = orderingCatalogJson as OrderingCatalog;

export const metadata: Metadata = {
  title: "Order",
  description: "Order Boba Bear directly — browse the menu and add items to your cart.",
  alternates: { canonical: "/order" },
};

export default function OrderPage() {
  return <OrderingCatalogClient catalog={catalog} />;
}
