import type { Metadata } from "next";

import { OrderHistoryClient } from "@/components/ordering/OrderHistoryClient";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View your Boba Bear order history.",
  alternates: { canonical: "/order/orders" },
  robots: { index: false, follow: false },
};

export default function OrderHistoryPage() {
  return <OrderHistoryClient />;
}
