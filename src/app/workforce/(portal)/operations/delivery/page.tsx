/**
 * /workforce/operations/delivery — Delivery workspace (IMP-036D).
 */
import type { Metadata } from "next";

import { OperationsDeliveryWorkspaceClient } from "@/components/operations/OperationsDeliveryWorkspaceClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operations Delivery",
  description: "Workforce delivery coordination for Boba Bear.",
  alternates: { canonical: "/workforce/operations/delivery" },
  robots: { index: false, follow: false },
};

export default function WorkforceOperationsDeliveryPage() {
  return (
    <>
      <PageHeader
        title="Delivery"
        description="Manual Dehradun delivery booking, tracking, and recovery."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Delivery" },
        ]}
      />
      <OperationsWorkspaceNav />
      <OperationsDeliveryWorkspaceClient />
    </>
  );
}
