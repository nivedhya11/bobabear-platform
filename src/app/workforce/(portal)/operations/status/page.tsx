/**
 * /workforce/operations/status — Operational Status (IMP-036 / IMP-036D).
 */
import type { Metadata } from "next";

import { OperationsStatusClient } from "@/components/operations/OperationsStatusClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operational Status",
  description: "Safe operational status for Boba Bear workforce.",
  alternates: { canonical: "/workforce/operations/status" },
  robots: { index: false, follow: false },
};

export default function WorkforceOperationsStatusPage() {
  return (
    <>
      <PageHeader
        title="Operational Status"
        description="Plain-language service and worker health for daily operations."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Operational Status" },
        ]}
      />
      <OperationsWorkspaceNav />
      <OperationsStatusClient />
    </>
  );
}
