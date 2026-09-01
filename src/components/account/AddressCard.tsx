"use client";

import { Button } from "@/components/ui/Button";
import type { CommerceAddress } from "@/lib/customer-commerce";
import { getIndiaSubdivisionName } from "@/shared/customer-addresses";

export function AddressCard(props: {
  address: CommerceAddress;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
  pending?: boolean;
}) {
  const { address, pending = false } = props;
  const stateName = getIndiaSubdivisionName(address.stateCode) ?? address.stateCode;

  return (
    <article
      className="border border-[var(--border-subtle)] p-4 flex flex-col gap-3"
      data-testid={`address-card-${address.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
            {address.recipientName}
            {address.label ? (
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {address.label}
              </span>
            ) : null}
          </p>
          {address.isDefault ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--interactive-secondary)]">
              Default
            </p>
          ) : null}
        </div>
      </div>
      <p className="font-body text-[14px] text-[var(--text-secondary)]">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        {address.landmark ? ` · ${address.landmark}` : ""}
        <br />
        {[address.locality, address.city, stateName, address.postalCode].filter(Boolean).join(", ")}
        <br />
        {address.recipientPhone}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={props.onEdit}>
          Edit
        </Button>
        {!address.isDefault ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={props.onMakeDefault}>
            Make default
          </Button>
        ) : null}
        <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={props.onDelete}>
          Delete
        </Button>
      </div>
    </article>
  );
}
