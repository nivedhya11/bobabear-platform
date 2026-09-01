import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetailClient } from "@/components/ordering/OrderDetailClient";

export const metadata: Metadata = {
  title: "Order detail",
  description: "View a Boba Bear order.",
  alternates: { canonical: "/order/orders/detail" },
  robots: { index: false, follow: false },
};

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
          <div className="mx-auto max-w-[720px] px-5 py-12">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading order…</p>
          </div>
        </main>
      }
    >
      <OrderDetailClient />
    </Suspense>
  );
}
