/**
 * /workforce/operations/store/team/access — Store team access (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { StoreTeamAccessClient } from "@/components/operations/store/StoreTeamAccessClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Team Access",
  description: "Role assignments for outlet team memberships.",
  alternates: { canonical: "/workforce/operations/store/team/access" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreTeamAccessPage() {
  return (
    <>
      <PageHeader
        title="Team Access"
        description="Grant and revoke roles for outlet team members."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Team", href: "/workforce/operations/store/team/" },
          { label: "Access" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreTeamAccessClient />
      </StoreShell>
    </>
  );
}
