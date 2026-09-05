/**
 * /workforce/operations/orders — Orders queue (IMP-030 / IMP-036D).
 */
import type { Metadata } from "next";

import { OperationsOrderListClient } from "@/components/operations/OperationsOrderListClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operations Orders",
  description: "Workforce operations order list for Boba Bear.",
  alternates: { canonical: "/workforce/operations/orders" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkforceOperationsOrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Search, review, and action the live order queue."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Orders" },
        ]}
      />
      <OperationsWorkspaceNav />
      <OperationsOrderListClient />
    </>
  );
}
