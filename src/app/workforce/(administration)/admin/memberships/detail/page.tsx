import type { Metadata } from "next";

import { AdministrationMembershipDetailClient } from "@/components/administration/AdministrationMembershipDetailClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Admin Membership Detail",
  description: "Workforce membership detail and role assignment.",
  alternates: { canonical: "/workforce/admin/memberships/detail" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminMembershipDetailPage() {
  return (
    <>
      <PageHeader title="Membership detail" description="Role assignments and membership lifecycle for the selected workforce user." />
      <AdministrationMembershipDetailClient />
    </>
  );
}
