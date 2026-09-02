"use client";

import { Button } from "@/components/ui/Button";
import type { CommerceAddress } from "@/lib/customer-commerce";
import { savedAddressCardCopy } from "@/components/location/location-flow-helpers";

export function AddressCard(props: {
  address: CommerceAddress;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
  pending?: boolean;
}) {
  const { address, pending = false } = props;
  const card = savedAddressCardCopy(address);

  return (
    <article
      className="border border-[var(--border-subtle)] p-4 flex flex-col gap-3"
      data-testid={`address-card-${address.id}`}
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {card.title}
        </p>
        {address.isDefault ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--interactive-secondary)]">
            Default
          </p>
        ) : null}
        {card.line1 ? (
          <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">{card.line1}</p>
        ) : null}
        {card.line2 ? (
          <p className="font-body text-[13px] text-[var(--text-secondary)]">{card.line2}</p>
        ) : null}
        <p className="font-body text-[13px] text-[var(--text-secondary)]">{card.locationLine}</p>
      </div>
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
