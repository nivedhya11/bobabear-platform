"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account/AccountShell";
import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  addressFormFromCommerceAddress,
  addressFormToCreateInput,
  addressFormToUpdateInput,
  type AddressFormValues,
} from "@/components/account/AddressForm";
import { AddressCard } from "@/components/account/AddressCard";
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
import { consumeAddressPrefillDraft } from "@/lib/customer-location/address-prefill";

type Screen = "list" | "add" | "edit";

export function AddressesClient() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<readonly CommerceAddress[]>([]);
  const [screen, setScreen] = useState<Screen>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);

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
      if (cancelled) return;
      const prefill = consumeAddressPrefillDraft();
      if (prefill) {
        setEditingId(null);
        setForm({
          ...EMPTY_ADDRESS_FORM,
          addressLine1: prefill.addressLine1,
          locality: prefill.locality,
          city: prefill.city || prefill.locality,
          stateCode: prefill.stateCode,
          postalCode: prefill.postalCode,
        });
        setScreen("add");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startAdd(): void {
    setError(null);
    setEditingId(null);
    setForm(EMPTY_ADDRESS_FORM);
    setScreen("add");
  }

  function startEdit(address: CommerceAddress): void {
    setError(null);
    setEditingId(address.id);
    setForm(addressFormFromCommerceAddress(address));
    setScreen("edit");
  }

  function backToList(): void {
    setScreen("list");
    setEditingId(null);
    setForm(EMPTY_ADDRESS_FORM);
    setError(null);
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    if (screen === "add") {
      const created = await createOwnAddress({
        ...addressFormToCreateInput(form),
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
    if (screen === "edit" && editingId) {
      const updated = await updateOwnAddress(editingId, addressFormToUpdateInput(form));
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

      {!loading && (screen === "add" || screen === "edit") ? (
        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4 max-w-md">
          <p className="font-body text-[15px] text-[var(--text-secondary)]">
            {screen === "add" ? "Add a saved delivery address." : "Update this saved address."}
          </p>
          <AddressForm values={form} onChange={setForm} disabled={pending} idPrefix={screen} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save address"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={backToList}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </AccountShell>
  );
}
