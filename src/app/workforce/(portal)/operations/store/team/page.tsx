/**
 * /workforce/operations/store/team — Store team members (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { StoreTeamMembersClient } from "@/components/operations/store/StoreTeamMembersClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Team",
  description: "Outlet-scoped team memberships.",
  alternates: { canonical: "/workforce/operations/store/team" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreTeamPage() {
  return (
    <>
      <PageHeader
        title="Team Members"
        description="Review and manage workforce memberships for this outlet."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Team" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreTeamMembersClient />
      </StoreShell>
    </>
  );
}
