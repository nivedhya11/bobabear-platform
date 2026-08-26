/**
 * /workforce/operations — read-only workforce Operations order list (IMP-030).
 *
 * Static export page shell. All list transport and session handling occur
 * client-side via same-origin requests to `/api/operations/v1/orders`.
 */
import type { Metadata } from "next";

import { OperationsOrderListClient } from "@/components/operations/OperationsOrderListClient";

export const metadata: Metadata = {
  title: "Operations Orders",
  description: "Workforce operations order list for Boba Bear.",
  alternates: { canonical: "/workforce/operations" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkforceOperationsPage() {
  return <OperationsOrderListClient />;
}
