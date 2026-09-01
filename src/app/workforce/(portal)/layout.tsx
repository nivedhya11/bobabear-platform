import type { Metadata } from "next";

import { WorkforceAppShell } from "@/components/workforce/WorkforceAppShell";

export const metadata: Metadata = {
  title: "Workforce",
  description: "Boba Bear workforce applications.",
  robots: { index: false, follow: false },
};

export default function WorkforcePortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkforceAppShell>{children}</WorkforceAppShell>;
}
