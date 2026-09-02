"use client";

import { useState } from "react";

import {
  CustomerDeliveryAddressFlow,
  type CustomerDeliveryAddressFlowResult,
} from "@/components/location/CustomerDeliveryAddressFlow";
import { savedAddressCardCopy } from "@/components/location/location-flow-helpers";
import { savedAddressReconfirmationCopy } from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import {
  evaluateDeliveryServiceability,
  type CommerceAddress,
} from "@/lib/customer-commerce";
import { addressFormToCreateInput } from "@/components/account/AddressForm";

export type CheckoutDestinationDraft =
  | Readonly<{ kind: "SAVED_ADDRESS"; savedAddressId: string }>
  | Readonly<{
      kind: "ONE_TIME_ADDRESS";
      recipientName: string;
      recipientPhone: string;
      addressLine1: string;
      addressLine2?: string | null;
      landmark?: string | null;
      locality?: string | null;
      city: string;
      stateCode: string;
      postalCode: string;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
      label?: string | null;
    }>
  | Readonly<{
      kind: "NEW_SAVED_ADDRESS";
      createInput: ReturnType<typeof addressFormToCreateInput> & {
        coordinates: Readonly<{ latitude: string; longitude: string }>;
      };
    }>
  | Readonly<{
      kind: "UPDATE_SAVED_COORDINATES";
      savedAddressId: string;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
    }>;

type CheckoutScreen = "select" | "add" | "reconfirm";

export function CheckoutDestinationFlow(props: {
  brandId: string;
  addresses: readonly CommerceAddress[];
  pending: boolean;
  onComplete: (draft: CheckoutDestinationDraft) => void;
}) {
  const { brandId, addresses, pending, onComplete } = props;
  const [screen, setScreen] = useState<CheckoutScreen>("select");
  const [flowPending, setFlowPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reconfirmAddress, setReconfirmAddress] = useState<CommerceAddress | null>(null);

  const busy = pending || flowPending;

  async function handleSavedAddress(address: CommerceAddress): Promise<void> {
    setStatusMessage(null);
    if (address.coordinates) {
      setFlowPending(true);
      const evaluated = await evaluateDeliveryServiceability(
        brandId,
        address.coordinates,
        address.postalCode,
      );
      setFlowPending(false);
      if (!evaluated.ok) {
        setStatusMessage("We couldn't confirm delivery right now.");
        return;
      }
      if (evaluated.data.decision.status !== "SERVICEABLE") {
        setStatusMessage("We don't deliver to this location yet.");
        return;
      }
      onComplete({ kind: "SAVED_ADDRESS", savedAddressId: address.id });
      return;
    }

    setReconfirmAddress(address);
    setScreen("reconfirm");
  }

  function handleSharedFlowComplete(result: CustomerDeliveryAddressFlowResult): void {
    if (result.kind === "CREATE") {
      onComplete({ kind: "NEW_SAVED_ADDRESS", createInput: result.input });
      return;
    }
    if (result.kind === "RECONFIRM_COORDINATES") {
      onComplete({
        kind: "UPDATE_SAVED_COORDINATES",
        savedAddressId: result.addressId,
        coordinates: result.coordinates,
      });
    }
  }

  if (screen === "add") {
    return (
      <CustomerDeliveryAddressFlow
        brandId={brandId}
        mode={{ kind: "add" }}
        pending={busy}
        testIdPrefix="checkout-destination"
        onCancel={() => setScreen("select")}
        onComplete={handleSharedFlowComplete}
      />
    );
  }

  if (screen === "reconfirm" && reconfirmAddress) {
    return (
      <CustomerDeliveryAddressFlow
        brandId={brandId}
        mode={{ kind: "reconfirm", address: reconfirmAddress }}
        pending={busy}
        testIdPrefix="checkout-destination"
        onCancel={() => {
          setReconfirmAddress(null);
          setScreen("select");
        }}
        onComplete={handleSharedFlowComplete}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="checkout-destination-select">
      <h2 className="font-display text-[22px] text-[var(--text-primary)]">Choose a delivery address</h2>

      {addresses.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="checkout-saved-addresses">
          {addresses.map((address) => {
            const card = savedAddressCardCopy(address);
            return (
              <li key={address.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-3 text-left font-body hover:bg-[var(--interactive-ghost-hover)] focus-ring"
                  onClick={() => void handleSavedAddress(address)}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    {card.title}
                  </p>
                  {card.line1 ? (
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{card.line1}</p>
                  ) : null}
                  {card.line2 ? (
                    <p className="text-[13px] text-[var(--text-secondary)]">{card.line2}</p>
                  ) : null}
                  <p className="text-[13px] text-[var(--text-secondary)]">{card.locationLine}</p>
                  {!address.coordinates ? (
                    <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                      {savedAddressReconfirmationCopy()}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-body text-[15px] text-[var(--text-secondary)]">
          You don&apos;t have any saved addresses yet.
        </p>
      )}

      <Button type="button" variant="primary" disabled={busy} onClick={() => setScreen("add")}>
        Add new address
      </Button>

      {statusMessage ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
