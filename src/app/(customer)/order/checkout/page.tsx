import type { Metadata } from "next";

import { CheckoutClient } from "@/components/ordering/CheckoutClient";
import orderingCatalogJson from "@/data/ordering-catalog.json";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const catalog = orderingCatalogJson as OrderingCatalog;

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout your Boba Bear order.",
  alternates: { canonical: "/order/checkout" },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient catalog={catalog} />;
}
