import type { Metadata } from "next";

import { AdministrationAppShell } from "@/components/administration/AdministrationAppShell";

export const metadata: Metadata = {
  title: "Administration",
  description: "Boba Bear platform administration.",
  robots: { index: false, follow: false },
};

export default function AdministrationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdministrationAppShell>{children}</AdministrationAppShell>;
}
