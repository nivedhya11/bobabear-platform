"use client";

import { LocationSelector, NavLocationSelector } from "@/components/location/LocationSelector";

export function DeliverToOrientation(props: {
  variant?: "page-strip" | "header-pill";
  serviceabilityNote?: string | null;
}) {
  return (
    <LocationSelector
      variant={props.variant ?? "page-strip"}
      serviceabilityNote={props.serviceabilityNote ?? null}
    />
  );
}

export function NavDeliverToOrientation() {
  return <NavLocationSelector />;
}
