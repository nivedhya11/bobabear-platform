import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsOrderDetailClient } from "@/components/operations/OperationsOrderDetailClient";

export const metadata: Metadata = {
  title: "Operations order detail",
  description: "View a Boba Bear workforce operations order.",
  alternates: { canonical: "/workforce/operations/orders/detail" },
  robots: { index: false, follow: false },
};

export default function WorkforceOperationsOrderDetailPage() {
  return (
    <Suspense
      fallback={(
        <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
          <div className="mx-auto max-w-[960px] px-5 py-12 md:py-16">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading order…</p>
          </div>
        </main>
      )}
    >
      <OperationsOrderDetailClient />
    </Suspense>
  );
}
