import type { Metadata } from "next";

import { AdministrationResourcesClient } from "@/components/administration/AdministrationResourcesClient";

export const metadata: Metadata = {
  title: "Admin Resources",
  description: "Workforce resource hierarchy administration.",
  alternates: { canonical: "/workforce/admin/resources" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminResourcesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Resources</h1>
      <AdministrationResourcesClient />
    </main>
  );
}
