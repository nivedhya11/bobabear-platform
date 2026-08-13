import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentReturnClient } from "@/components/ordering/PaymentReturnClient";

export const metadata: Metadata = {
  title: "Payment",
  description: "Check your Boba Bear payment status.",
  alternates: { canonical: "/order/payment" },
  robots: { index: false, follow: false },
};

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
          <div className="mx-auto max-w-[640px] px-5 py-12">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Checking payment…</p>
          </div>
        </main>
      }
    >
      <PaymentReturnClient />
    </Suspense>
  );
}
