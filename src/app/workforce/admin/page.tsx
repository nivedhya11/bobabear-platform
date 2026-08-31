/**
 * /workforce/admin — Initial Administration hub (IMP-035).
 */
import type { Metadata } from "next";

import { AdministrationHubClient } from "@/components/administration/AdministrationHubClient";

export const metadata: Metadata = {
  title: "Administration",
  description: "Workforce administration for Boba Bear.",
  alternates: { canonical: "/workforce/admin" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Administration</h1>
      <AdministrationHubClient />
    </main>
  );
}
