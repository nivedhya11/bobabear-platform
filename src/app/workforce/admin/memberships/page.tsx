import type { Metadata } from "next";

import { AdministrationMembershipsClient } from "@/components/administration/AdministrationMembershipsClient";

export const metadata: Metadata = {
  title: "Admin Memberships",
  description: "Workforce membership administration.",
  alternates: { canonical: "/workforce/admin/memberships" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminMembershipsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Memberships</h1>
      <AdministrationMembershipsClient />
    </main>
  );
}
