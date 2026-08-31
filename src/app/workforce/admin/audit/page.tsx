import type { Metadata } from "next";

import { AdministrationAuditClient } from "@/components/administration/AdministrationAuditClient";

export const metadata: Metadata = {
  title: "Admin Access Audit",
  description: "Workforce access-control audit visibility.",
  alternates: { canonical: "/workforce/admin/audit" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminAuditPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Access audit</h1>
      <AdministrationAuditClient />
    </main>
  );
}
