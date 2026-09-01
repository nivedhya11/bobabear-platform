import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileWelcomeClient } from "@/components/account/ProfileWelcomeClient";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Complete your Boba Bear profile.",
  alternates: { canonical: "/account/welcome" },
  robots: { index: false, follow: false },
};

export default function AccountWelcomePage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 font-body text-[15px]">Loading…</p>}>
      <ProfileWelcomeClient />
    </Suspense>
  );
}
