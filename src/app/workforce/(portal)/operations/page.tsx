/**
 * /workforce/operations — Today workspace (IMP-036D).
 *
 * Static export page shell. Experience composition over accepted authorities.
 */
import type { Metadata } from "next";

import { OperationsTodayClient } from "@/components/operations/OperationsTodayClient";
import { OperationsWorkspaceNav } from "@/components/operations/OperationsWorkspaceNav";
import { PageHeader } from "@/components/enterprise/PageHeader";

export const metadata: Metadata = {
  title: "Operations Today",
  description: "Workforce operations today workspace for Boba Bear.",
  alternates: { canonical: "/workforce/operations" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkforceOperationsTodayPage() {
  return (
    <>
      <PageHeader
        title="Today"
        description="Open work and safe operational context for the current shift."
        breadcrumbs={[
          { label: "Workforce", href: "/workforce/" },
          { label: "Operations" },
        ]}
      />
      <OperationsWorkspaceNav />
      <OperationsTodayClient />
    </>
  );
}
