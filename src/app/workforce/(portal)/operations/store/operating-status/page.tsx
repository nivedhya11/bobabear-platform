/**
 * /workforce/operations/store/operating-status — Outlet operating status (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreOperatingStatusClient } from "@/components/operations/store/StoreOperatingStatusClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Operating Status",
  description: "Pause, resume, or suspend an authorized outlet.",
  alternates: { canonical: "/workforce/operations/store/operating-status" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreOperatingStatusPage() {
  return (
    <>
      <PageHeader
        title="Operating Status"
        description="Control whether this outlet is accepting orders."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Operating Status" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreOperatingStatusClient />
      </StoreShell>
    </>
  );
}
