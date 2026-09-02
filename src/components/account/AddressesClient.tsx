"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account/AccountShell";
import { AddressCard } from "@/components/account/AddressCard";
import {
  CustomerDeliveryAddressFlow,
  type CustomerDeliveryAddressFlowResult,
} from "@/components/location/CustomerDeliveryAddressFlow";
import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import {
  createOwnAddress,
  deleteOwnAddress,
  listOwnAddresses,
  setDefaultOwnAddress,
  updateOwnAddress,
  type CommerceAddress,
} from "@/lib/customer-commerce";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

type Screen = "list" | "add" | "edit";

export function AddressesClient() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<readonly CommerceAddress[]>([]);
  const [screen, setScreen] = useState<Screen>("list");
  const [editingAddress, setEditingAddress] = useState<CommerceAddress | null>(null);

  async function reload(): Promise<void> {
    const listed = await listOwnAddresses();
    if (!listed.ok) {
      setError(commerceErrorCopy(listed.code));
      return;
    }
    setAddresses(listed.data.addresses);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/account/addresses/"));
        return;
      }
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startAdd(): void {
    setError(null);
    setEditingAddress(null);
    setScreen("add");
  }

  function startEdit(address: CommerceAddress): void {
    setError(null);
    setEditingAddress(address);
    setScreen("edit");
  }

  function backToList(): void {
    setScreen("list");
    setEditingAddress(null);
    setError(null);
  }

  async function handleFlowComplete(result: CustomerDeliveryAddressFlowResult): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);

    if (result.kind === "CREATE") {
      const created = await createOwnAddress({
        ...result.input,
        makeDefault: addresses.length === 0,
      });
      setPending(false);
      if (!created.ok) {
        setError(commerceErrorCopy(created.code));
        return;
      }
      await reload();
      backToList();
      return;
    }

    if (result.kind === "UPDATE") {
      const updated = await updateOwnAddress(result.addressId, {
        ...result.input,
        coordinates: result.coordinates,
      });
      setPending(false);
      if (!updated.ok) {
        setError(commerceErrorCopy(updated.code));
        return;
      }
      await reload();
      backToList();
    }
  }

  async function handleDelete(addressId: string): Promise<void> {
    if (pending) return;
    const confirmed = window.confirm("Delete this saved address?");
    if (!confirmed) return;
    setPending(true);
    setError(null);
    const result = await deleteOwnAddress(addressId);
    setPending(false);
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      return;
    }
    await reload();
  }

  async function handleMakeDefault(addressId: string): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await setDefaultOwnAddress(addressId);
    setPending(false);
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      return;
    }
    await reload();
  }

  const brandId = DIRECT_ORDERING_BRAND_ID;

  return (
    <AccountShell title="Addresses">
      {loading ? (
        <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading addresses…</p>
      ) : null}

      {error ? (
        <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
          {error}
        </p>
      ) : null}

      {!loading && screen === "list" ? (
        <div className="flex flex-col gap-4">
          <p className="font-body text-[15px] text-[var(--text-secondary)]">
            Save delivery addresses for faster checkout.
          </p>
          <Button type="button" variant="primary" onClick={startAdd}>
            Add address
          </Button>
          {addresses.length === 0 ? (
            <p className="font-body text-[15px] text-[var(--text-secondary)]" data-testid="addresses-empty">
              You don&apos;t have any saved addresses yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-4" data-testid="addresses-list">
              {addresses.map((address) => (
                <li key={address.id}>
                  <AddressCard
                    address={address}
                    pending={pending}
                    onEdit={() => startEdit(address)}
                    onDelete={() => void handleDelete(address.id)}
                    onMakeDefault={() => void handleMakeDefault(address.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!loading && screen === "add" ? (
        <CustomerDeliveryAddressFlow
          brandId={brandId}
          mode={{ kind: "add" }}
          pending={pending}
          testIdPrefix="account-address"
          onCancel={backToList}
          onComplete={(result) => void handleFlowComplete(result)}
        />
      ) : null}

      {!loading && screen === "edit" && editingAddress ? (
        <CustomerDeliveryAddressFlow
          brandId={brandId}
          mode={{ kind: "edit", address: editingAddress }}
          pending={pending}
          testIdPrefix="account-address"
          onCancel={backToList}
          onComplete={(result) => void handleFlowComplete(result)}
        />
      ) : null}
    </AccountShell>
  );
}
