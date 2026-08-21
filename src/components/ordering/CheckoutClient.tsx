"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import {
  claimGuestCart,
  clearGuestCartCredential,
  createOwnAddress,
  evaluateCheckout,
  getActiveCart,
  getActiveCheckout,
  listOwnAddresses,
  readGuestCartCredential,
  reconcileGuestCart,
  setCheckoutDestination,
  startCheckout,
  type CartReconciliationResolution,
  type CommerceAddress,
  type CommerceCart,
  type CommerceCheckout,
  type CommerceCheckoutSnapshot,
} from "@/lib/customer-commerce";
import { INDIA_SUBDIVISIONS } from "@/shared/customer-addresses";
import { ReconcileConflictDialog } from "@/components/ordering/ReconcileConflictDialog";
import { PaymentPanel } from "@/components/ordering/PaymentPanel";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

type Screen =
  | "loading"
  | "empty"
  | "conflict"
  | "destination"
  | "ready"
  | "error";

/** One-time destination fields start empty. PIN/state are not implied. */
export const EMPTY_ONE_TIME_ADDRESS = {
  recipientName: "",
  recipientPhone: "",
  addressLine1: "",
  city: "",
  stateCode: "",
  postalCode: "",
};

export function CheckoutClient(props: { catalog: OrderingCatalog }) {
  const brandId = props.catalog.brandId;
  const [screen, setScreen] = useState<Screen>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [checkout, setCheckout] = useState<CommerceCheckout | null>(null);
  const [snapshot, setSnapshot] = useState<CommerceCheckoutSnapshot | null>(null);
  const [addresses, setAddresses] = useState<readonly CommerceAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | "one-time">("new");
  const [form, setForm] = useState(EMPTY_ONE_TIME_ADDRESS);
  const [guestRevision, setGuestRevision] = useState<string | null>(null);
  const [customerRevision, setCustomerRevision] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/order/checkout/"));
        return;
      }
      await bootstrap();
    })();
    return () => {
      cancelled = true;
    };
    // bootstrap is intentionally invoked once on mount after auth check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap(): Promise<void> {
    setError(null);
    const guest = readGuestCartCredential();
    const customerCartResult = await getActiveCart(brandId, { guestToken: false });
    if (!customerCartResult.ok && customerCartResult.code !== "CART_NOT_FOUND") {
      if (customerCartResult.code === "NETWORK_ERROR") {
        setScreen("error");
        setError(commerceErrorCopy(customerCartResult.code));
        return;
      }
      if (customerCartResult.code === "CUSTOMER_AUTH_REQUIRED") {
        window.location.assign(loginUrlWithReturn("/order/checkout/"));
        return;
      }
    }
    const customerCart = customerCartResult.ok ? customerCartResult.data.cart : null;

    if (guest && !customerCart) {
      const claimed = await claimGuestCart({
        brandId,
        expectedGuestRevision: guest.revision,
      });
      if (!claimed.ok) {
        if (claimed.code === "CART_RECONCILIATION_CONFLICT") {
          const again = await getActiveCart(brandId, { guestToken: false });
          const existing = again.ok ? again.data.cart : null;
          if (existing) {
            setGuestRevision(guest.revision);
            setCustomerRevision(existing.revision);
            setScreen("conflict");
            return;
          }
        }
        if (claimed.code === "CART_EXPIRED" || claimed.code === "CART_NOT_FOUND") {
          clearGuestCartCredential();
        } else {
          setScreen("error");
          setError(commerceErrorCopy(claimed.code));
          return;
        }
      } else {
        clearGuestCartCredential();
        setCart(claimed.data.cart);
        await continueWithCart(claimed.data.cart);
        return;
      }
    }

    if (guest && customerCart) {
      setGuestRevision(guest.revision);
      setCustomerRevision(customerCart.revision);
      const reconciled = await reconcileGuestCart({
        brandId,
        expectedGuestRevision: guest.revision,
        expectedCustomerRevision: customerCart.revision,
      });
      if (!reconciled.ok) {
        if (reconciled.code === "CART_RECONCILIATION_CONFLICT") {
          setScreen("conflict");
          return;
        }
        setScreen("error");
        setError(commerceErrorCopy(reconciled.code));
        return;
      }
      clearGuestCartCredential();
      setCart(reconciled.data.cart);
      await continueWithCart(reconciled.data.cart);
      return;
    }

    if (!customerCart || customerCart.lines.length === 0) {
      setCart(customerCart);
      setScreen("empty");
      return;
    }
    setCart(customerCart);
    await continueWithCart(customerCart);
  }

  async function continueWithCart(ownedCart: CommerceCart): Promise<void> {
    const active = await getActiveCheckout({ cartId: ownedCart.id });
    if (!active.ok) {
      setScreen("error");
      setError(commerceErrorCopy(active.code));
      return;
    }
    let current = active.data.checkout;
    if (!current) {
      const started = await startCheckout({ cartId: ownedCart.id });
      if (!started.ok) {
        setScreen("error");
        setError(commerceErrorCopy(started.code));
        return;
      }
      current = started.data.checkout;
    }
    setCheckout(current);

    const listed = await listOwnAddresses();
    if (listed.ok) {
      setAddresses(listed.data.addresses);
      const defaultAddress = listed.data.addresses.find((address) => address.isDefault);
      if (defaultAddress) setSelectedAddressId(defaultAddress.id);
      else if (listed.data.addresses[0]) setSelectedAddressId(listed.data.addresses[0].id);
      else setSelectedAddressId("one-time");
    } else {
      setSelectedAddressId("one-time");
    }

    if (current.status === "READY_FOR_PAYMENT" && current.activeSnapshot) {
      setSnapshot(current.activeSnapshot);
      setScreen("ready");
      return;
    }
    setScreen("destination");
  }

  async function chooseResolution(resolution: CartReconciliationResolution): Promise<void> {
    if (pending || !guestRevision || !customerRevision) return;
    setPending(true);
    setError(null);
    const reconciled = await reconcileGuestCart({
      brandId,
      expectedGuestRevision: guestRevision,
      expectedCustomerRevision: customerRevision,
      resolution,
    });
    setPending(false);
    if (!reconciled.ok) {
      setError(commerceErrorCopy(reconciled.code));
      return;
    }
    clearGuestCartCredential();
    setCart(reconciled.data.cart);
    await continueWithCart(reconciled.data.cart);
  }

  async function handleDestination(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || !checkout || !cart) return;
    setPending(true);
    setError(null);

    let destinationCheckout = checkout;
    if (selectedAddressId !== "one-time" && selectedAddressId !== "new") {
      const dest = await setCheckoutDestination({
        checkoutId: checkout.id,
        expectedCheckoutRevision: checkout.revision,
        destination: { kind: "SAVED_ADDRESS", savedAddressId: selectedAddressId },
      });
      if (!dest.ok) {
        setPending(false);
        setError(commerceErrorCopy(dest.code));
        return;
      }
      destinationCheckout = dest.data.checkout;
    } else {
      if (selectedAddressId === "new") {
        const created = await createOwnAddress({
          ...form,
          makeDefault: addresses.length === 0,
        });
        if (!created.ok) {
          setPending(false);
          setError(commerceErrorCopy(created.code));
          return;
        }
        const dest = await setCheckoutDestination({
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: created.data.address.id },
        });
        if (!dest.ok) {
          setPending(false);
          setError(commerceErrorCopy(dest.code));
          return;
        }
        destinationCheckout = dest.data.checkout;
      } else {
        const dest = await setCheckoutDestination({
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: {
            kind: "ONE_TIME_ADDRESS",
            recipientName: form.recipientName,
            recipientPhone: form.recipientPhone,
            addressLine1: form.addressLine1,
            city: form.city,
            stateCode: form.stateCode,
            postalCode: form.postalCode,
          },
        });
        if (!dest.ok) {
          setPending(false);
          setError(commerceErrorCopy(dest.code));
          return;
        }
        destinationCheckout = dest.data.checkout;
      }
    }

    setCheckout(destinationCheckout);
    const evaluated = await evaluateCheckout({
      checkoutId: destinationCheckout.id,
      expectedCheckoutRevision: destinationCheckout.revision,
    });
    setPending(false);
    if (!evaluated.ok) {
      setError(commerceErrorCopy(evaluated.code));
      return;
    }
    setCheckout(evaluated.data.checkout);
    setSnapshot(evaluated.data.snapshot);
    setScreen("ready");
  }

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      {screen === "conflict" ? (
        <ReconcileConflictDialog pending={pending} onChoose={(choice) => void chooseResolution(choice)} />
      ) : null}

      <div className="mx-auto max-w-[640px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Checkout
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Checkout
          </h1>
        </header>

        {screen === "loading" ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Preparing checkout…</p>
        ) : null}

        {error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        {screen === "empty" ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Your cart is empty. Add something before checkout.
            </p>
            <Button asChild variant="primary">
              <a href="/order/">Back to menu</a>
            </Button>
          </div>
        ) : null}

        {screen === "destination" && checkout ? (
          <form onSubmit={(event) => void handleDestination(event)} className="flex flex-col gap-4">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Choose where this order should be delivered.
            </p>

            {addresses.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
                  Saved addresses
                </legend>
                {addresses.map((address) => (
                  <label key={address.id} className="flex items-start gap-2 font-body text-[14px]">
                    <input
                      type="radio"
                      name="destination"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <span>
                      {address.recipientName} · {address.addressLine1}, {address.city} {address.postalCode}
                    </span>
                  </label>
                ))}
                <label className="flex items-start gap-2 font-body text-[14px]">
                  <input
                    type="radio"
                    name="destination"
                    checked={selectedAddressId === "new"}
                    onChange={() => setSelectedAddressId("new")}
                  />
                  <span>Save a new address</span>
                </label>
                <label className="flex items-start gap-2 font-body text-[14px]">
                  <input
                    type="radio"
                    name="destination"
                    checked={selectedAddressId === "one-time"}
                    onChange={() => setSelectedAddressId("one-time")}
                  />
                  <span>Use a one-time destination</span>
                </label>
              </fieldset>
            ) : null}

            {(selectedAddressId === "new" || selectedAddressId === "one-time" || addresses.length === 0) && (
              <div className="flex flex-col gap-3">
                <label className="font-body text-[13px] font-semibold">
                  Recipient name
                  <input
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                    value={form.recipientName}
                    onChange={(event) => setForm((prev) => ({ ...prev, recipientName: event.target.value }))}
                  />
                </label>
                <label className="font-body text-[13px] font-semibold">
                  Mobile number
                  <input
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                    value={form.recipientPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, recipientPhone: event.target.value }))}
                  />
                </label>
                <label className="font-body text-[13px] font-semibold">
                  Address line 1
                  <input
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                    value={form.addressLine1}
                    onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                  />
                </label>
                <label className="font-body text-[13px] font-semibold">
                  City
                  <input
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  />
                </label>
                <div className="flex flex-col">
                  <label htmlFor="checkout-state" className="font-body text-[13px] font-semibold">
                    State
                  </label>
                  <select
                    id="checkout-state"
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-[var(--bg-page)] px-3"
                    value={form.stateCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, stateCode: event.target.value }))}
                  >
                    <option value="">Select state</option>
                    {INDIA_SUBDIVISIONS.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="font-body text-[13px] font-semibold">
                  PIN code
                  <input
                    required
                    className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                    value={form.postalCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                  />
                </label>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={pending}>
              {pending ? "Evaluating…" : "Evaluate checkout"}
            </Button>
          </form>
        ) : null}

        {screen === "ready" && snapshot && checkout ? (
          <div className="flex flex-col gap-4" data-testid="checkout-ready">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--interactive-secondary)]">
              Ready for payment
            </p>
            <PaymentPanel
              checkout={checkout}
              snapshot={snapshot}
              onOrderReady={(orderId) => {
                window.location.assign(`/order/confirmation/?orderId=${encodeURIComponent(orderId)}`);
              }}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
