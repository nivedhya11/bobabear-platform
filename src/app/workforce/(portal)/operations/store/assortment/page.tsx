/**
 * /workforce/operations/store/assortment — Store Assortment read/escalation (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreAssortmentClient } from "@/components/operations/store/StoreAssortmentClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Assortment",
  description: "Read-only assortment context for an authorized outlet.",
  alternates: { canonical: "/workforce/operations/store/assortment" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreAssortmentPage() {
  return (
    <>
      <PageHeader
        title="Assortment"
        description="What this outlet may offer. Assortment changes stay at brand level."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Assortment" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <StoreAssortmentClient />
      </StoreShell>
    </>
  );
}
