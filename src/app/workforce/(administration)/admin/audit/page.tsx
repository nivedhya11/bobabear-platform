import type { Metadata } from "next";

import { AdministrationAuditClient } from "@/components/administration/AdministrationAuditClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Admin Access Audit",
  description: "Workforce access-control audit visibility.",
  alternates: { canonical: "/workforce/admin/audit" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminAuditPage() {
  return (
    <>
      <PageHeader title="Access audit" description="Read-only visibility into access-control audit events." />
      <AdministrationAuditClient />
    </>
  );
}
