import type { Metadata } from "next";

import { AdministrationResourcesClient } from "@/components/administration/AdministrationResourcesClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Admin Resources",
  description: "Workforce resource hierarchy administration.",
  alternates: { canonical: "/workforce/admin/resources" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" description="Brand, organization, territory, legal entity, and outlet hierarchy." />
      <AdministrationResourcesClient />
    </>
  );
}
