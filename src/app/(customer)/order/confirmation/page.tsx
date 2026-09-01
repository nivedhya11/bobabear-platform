import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderConfirmationClient } from "@/components/ordering/OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Boba Bear order confirmation.",
  alternates: { canonical: "/order/confirmation" },
  robots: { index: false, follow: false },
};

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
          <div className="mx-auto max-w-[640px] px-5 py-12">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading your order…</p>
          </div>
        </main>
      }
    >
      <OrderConfirmationClient />
    </Suspense>
  );
}
