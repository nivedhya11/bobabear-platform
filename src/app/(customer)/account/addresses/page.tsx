import type { Metadata } from "next";

import { AddressesClient } from "@/components/account/AddressesClient";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your Boba Bear delivery addresses.",
  alternates: { canonical: "/account/addresses" },
  robots: { index: false, follow: false },
};

export default function AccountAddressesPage() {
  return <AddressesClient />;
}
