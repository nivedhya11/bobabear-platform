/**
 * /workforce — permission-aware workforce application hub (IMP-036A).
 */
import type { Metadata } from "next";

import { WorkforceHubClient } from "@/components/workforce/WorkforceHubClient";

export const metadata: Metadata = {
  title: "Workforce Applications",
  description: "Authorized workforce applications for Boba Bear.",
  alternates: { canonical: "/workforce" },
  robots: { index: false, follow: false },
};

export default function WorkforceHubPage() {
  return <WorkforceHubClient />;
}
