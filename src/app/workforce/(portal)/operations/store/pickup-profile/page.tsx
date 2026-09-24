/**
 * /workforce/operations/store/pickup-profile — Outlet pickup profile (IMP-036H-E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StorePickupProfileClient } from "@/components/operations/store/StorePickupProfileClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Pickup Profile",
  description: "Manage customer-facing outlet pickup profile.",
  alternates: { canonical: "/workforce/operations/store/pickup-profile" },
  robots: { index: false, follow: false },
};

export default function WorkforceStorePickupProfilePage() {
  return (
    <>
      <PageHeader
        title="Pickup Profile"
        description="Customer-facing pickup location and instructions for this outlet."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Pickup Profile" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StorePickupProfileClient />
      </StoreShell>
    </>
  );
}
