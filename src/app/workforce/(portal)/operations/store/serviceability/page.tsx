/**
 * /workforce/operations/store/serviceability — Distance serviceability (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreServiceabilityClient } from "@/components/operations/store/StoreServiceabilityClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Serviceability",
  description: "Manage outlet distance serviceability policy.",
  alternates: { canonical: "/workforce/operations/store/serviceability" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreServiceabilityPage() {
  return (
    <>
      <PageHeader
        title="Serviceability"
        description="Service origin and maximum delivery distance for this outlet."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Serviceability" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreServiceabilityClient />
      </StoreShell>
    </>
  );
}
