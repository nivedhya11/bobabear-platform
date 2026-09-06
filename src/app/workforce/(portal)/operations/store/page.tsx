/**
 * /workforce/operations/store — Read-only store context (IMP-036D).
 */
import type { Metadata } from "next";

import { OperationsStoreClient } from "@/components/operations/OperationsStoreClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operations Store",
  description: "Read-only store operational context for Boba Bear workforce.",
  alternates: { canonical: "/workforce/operations/store" },
  robots: { index: false, follow: false },
};

export default function WorkforceOperationsStorePage() {
  return (
    <>
      <PageHeader
        title="Store"
        description="Authorized store identity and service context. Management remains deferred."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store" },
        ]}
      />
      <OperationsWorkspaceNav />
      <OperationsStoreClient />
    </>
  );
}
