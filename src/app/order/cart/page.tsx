import type { Metadata } from "next";

import { CartClient } from "@/components/ordering/CartClient";
import orderingCatalogJson from "@/data/ordering-catalog.json";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const catalog = orderingCatalogJson as OrderingCatalog;

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your Boba Bear cart before checkout.",
  alternates: { canonical: "/order/cart" },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient catalog={catalog} />;
}
