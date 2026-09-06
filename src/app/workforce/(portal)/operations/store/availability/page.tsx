/**
 * /workforce/operations/store/availability — Store Availability (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreAvailabilityClient } from "@/components/operations/store/StoreAvailabilityClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Availability",
  description: "Manage item availability for an authorized outlet.",
  alternates: { canonical: "/workforce/operations/store/availability" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreAvailabilityPage() {
  return (
    <>
      <PageHeader
        title="Availability"
        description="Mark items available, temporarily unavailable, or sold out."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Availability" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreAvailabilityClient />
      </StoreShell>
    </>
  );
}
