import type { Metadata } from "next";

import { AdministrationMembershipsClient } from "@/components/administration/AdministrationMembershipsClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Admin Memberships",
  description: "Workforce membership administration.",
  alternates: { canonical: "/workforce/admin/memberships" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminMembershipsPage() {
  return (
    <>
      <PageHeader title="Memberships" description="Workforce memberships and lifecycle status across authorized scopes." />
      <AdministrationMembershipsClient />
    </>
  );
}
