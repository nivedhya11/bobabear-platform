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
  return <AdministrationHubClient />;
}
