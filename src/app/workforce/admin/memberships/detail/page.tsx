import type { Metadata } from "next";

import { AdministrationMembershipDetailClient } from "@/components/administration/AdministrationMembershipDetailClient";

export const metadata: Metadata = {
  title: "Admin Membership Detail",
  description: "Workforce membership detail and role assignment.",
  alternates: { canonical: "/workforce/admin/memberships/detail" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminMembershipDetailPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Membership</h1>
      <AdministrationMembershipDetailClient />
    </main>
  );
}
