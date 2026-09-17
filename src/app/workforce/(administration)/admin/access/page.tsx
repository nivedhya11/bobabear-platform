/**
 * /workforce/admin/access — managed-subject access diagnostic (IMP-036G).
 */
import type { Metadata } from "next";

import { AdministrationAccessClient } from "@/components/administration/AdministrationAccessClient";

export const metadata: Metadata = {
  title: "Access · Administration",
  description: "Managed-subject effective permissions diagnostic.",
  alternates: { canonical: "/workforce/admin/access" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminAccessPage() {
  return <AdministrationAccessClient />;
}
