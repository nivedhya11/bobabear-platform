import type { Metadata } from "next";

import { ProfileClient } from "@/components/account/ProfileClient";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Boba Bear profile.",
  alternates: { canonical: "/account/profile" },
  robots: { index: false, follow: false },
};

export default function AccountProfilePage() {
  return <ProfileClient />;
}
