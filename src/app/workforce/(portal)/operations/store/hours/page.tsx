/**
 * /workforce/operations/store/hours — Operating hours (IMP-036E).
 */
import type { Metadata } from "next";

import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { StoreHoursClient } from "@/components/operations/store/StoreHoursClient";
import { StoreSchedulingProfileClient } from "@/components/operations/store/StoreSchedulingProfileClient";
import { StoreShell } from "@/components/operations/store/StoreShell";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Store Hours",
  description:
    "Edit weekly operating hours and scheduled fulfilment lead times for an authorized outlet.",
  alternates: { canonical: "/workforce/operations/store/hours" },
  robots: { index: false, follow: false },
};

export default function WorkforceStoreHoursPage() {
  return (
    <>
      <PageHeader
        title="Hours"
        description="Set the weekly open intervals, timezone, and scheduled fulfilment lead times for this outlet."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations", href: "/workforce/operations/" },
          { label: "Store", href: "/workforce/operations/store/" },
          { label: "Hours" },
        ]}
      />
      <OperationsWorkspaceNav />
      <StoreShell>
        <div className="flex flex-col gap-8">
          <StoreHoursClient />
          <StoreSchedulingProfileClient />
        </div>
      </StoreShell>
    </>
  );
}
