import type { Metadata } from "next";

import { CommercialWorkspaceClient } from "@/components/administration/commercial/CommercialWorkspaceClient";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Commercial",
  description: "Brand commercial workspace for catalog, menu, assortment, pricing, and promotions.",
  alternates: { canonical: "/workforce/admin/commercial" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminCommercialPage() {
  return (
    <>
      <PageHeader
        title="Commercial"
        description="Brand commercial workspace for offerings, menu presentation, assortment, pricing, promotions, delivery price, inspection, and verification. Authorities remain distinct."
      />
      <CommercialWorkspaceClient />
    </>
  );
}
