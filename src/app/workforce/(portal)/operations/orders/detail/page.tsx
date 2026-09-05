import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsOrderDetailClient } from "@/components/operations/OperationsOrderDetailClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operations order detail",
  description: "View a Boba Bear workforce operations order.",
  alternates: { canonical: "/workforce/operations/orders/detail" },
  robots: { index: false, follow: false },
};

export default function WorkforceOperationsOrderDetailPage() {
  return (
    <>
      <PageHeader
        title="Order detail"
        description="Lifecycle, delivery, refund, and notification support for one order."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Orders", href: "/workforce/operations/orders/" },
          { label: "Detail" },
        ]}
      />
      <OperationsWorkspaceNav />
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
    </>
  );
}
