/**
 * /workforce/admin/system — Ops status compose + hand-off (IMP-036G).
 */
import type { Metadata } from "next";

import { AdministrationSystemClient } from "@/components/administration/AdministrationSystemClient";

export const metadata: Metadata = {
  title: "System · Administration",
  description: "Operational status composition and Operations hand-off.",
  alternates: { canonical: "/workforce/admin/system" },
  robots: { index: false, follow: false },
};

export default function WorkforceAdminSystemPage() {
  return <AdministrationSystemClient />;
}
