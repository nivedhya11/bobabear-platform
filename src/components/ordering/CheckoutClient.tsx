"use client";

import { useEffect, useState } from "react";

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
  updateOwnAddress,
  type CartReconciliationResolution,
  type CommerceAddress,
  type CommerceCart,
  type CommerceCheckout,
  type CommerceCheckoutSnapshot,
} from "@/lib/customer-commerce";
import { ReconcileConflictDialog } from "@/components/ordering/ReconcileConflictDialog";
import {
  CheckoutDestinationFlow,
  type CheckoutDestinationDraft,
} from "@/components/ordering/CheckoutDestinationFlow";
import {
  CheckoutSnapshotLineList,
  CheckoutStepIndicator,
} from "@/components/ordering/CheckoutReviewSections";
import { OrderMoneySummaryPanel } from "@/components/ordering/OrderMoneySummaryPanel";
import { narrowCheckoutSnapshotLines } from "@/components/ordering/checkout-line-presentation";
import { PaymentPanel } from "@/components/ordering/PaymentPanel";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

type Screen =
  | "loading"
  | "empty"
  | "conflict"
  | "destination"
  | "review"
  | "payment"
  | "error";

function destinationSummary(snapshot: CommerceCheckoutSnapshot | null): string | null {
  const destination = snapshot?.destination;
  if (!destination) return null;
  return [destination.recipientName, destination.addressLine1, destination.city, destination.postalCode]
    .filter(Boolean)
    .join(" · ");
}

export function CheckoutClient(props: { catalog: OrderingCatalog }) {
  const brandId = props.catalog.brandId;
  const [screen, setScreen] = useState<Screen>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [checkout, setCheckout] = useState<CommerceCheckout | null>(null);
  const [snapshot, setSnapshot] = useState<CommerceCheckoutSnapshot | null>(null);
  const [addresses, setAddresses] = useState<readonly CommerceAddress[]>([]);
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
    if (
      current &&
      current.sourceCartRevision !== ownedCart.revision &&
      (current.status === "DRAFT" || current.status === "READY_FOR_PAYMENT")
    ) {
      // Server getActiveCheckout should already hide these; belt-and-braces.
      current = null;
    }
    if (
      current &&
      current.sourceCartRevision !== ownedCart.revision &&
      current.status === "PAYMENT_PENDING"
    ) {
      setCheckout(current);
      setScreen("error");
      setError(commerceErrorCopy("CHECKOUT_CART_CHANGED"));
      return;
    }
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
    if (listed.ok) setAddresses(listed.data.addresses);

    if (
      current.status === "READY_FOR_PAYMENT" &&
      current.activeSnapshot &&
      current.sourceCartRevision === ownedCart.revision
    ) {
      setSnapshot(current.activeSnapshot);
      setScreen("payment");
      return;
    }
    setSnapshot(current.activeSnapshot);
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

  async function applyDestinationDraft(draft: CheckoutDestinationDraft): Promise<void> {
    if (pending || !checkout) return;
    setPending(true);
    setError(null);

    let destinationCheckout = checkout;

    if (draft.kind === "UPDATE_SAVED_COORDINATES") {
      const updated = await updateOwnAddress(draft.savedAddressId, { coordinates: draft.coordinates });
      if (!updated.ok) {
        setPending(false);
        setError(commerceErrorCopy(updated.code));
        return;
      }
      const dest = await setCheckoutDestination({
        checkoutId: checkout.id,
        expectedCheckoutRevision: checkout.revision,
        destination: { kind: "SAVED_ADDRESS", savedAddressId: draft.savedAddressId },
      });
      if (!dest.ok) {
        setPending(false);
        setError(commerceErrorCopy(dest.code));
        return;
      }
      destinationCheckout = dest.data.checkout;
    } else if (draft.kind === "SAVED_ADDRESS") {
      const dest = await setCheckoutDestination({
        checkoutId: checkout.id,
        expectedCheckoutRevision: checkout.revision,
        destination: { kind: "SAVED_ADDRESS", savedAddressId: draft.savedAddressId },
      });
      if (!dest.ok) {
        setPending(false);
        setError(commerceErrorCopy(dest.code));
        return;
      }
      destinationCheckout = dest.data.checkout;
    } else if (draft.kind === "NEW_SAVED_ADDRESS") {
      const created = await createOwnAddress({
        ...draft.createInput,
        makeDefault: addresses.length === 0,
      });
      if (!created.ok) {
        setPending(false);
        setError(commerceErrorCopy(created.code));
        return;
      }
      setAddresses((current) => [...current, created.data.address]);
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
          recipientName: draft.recipientName,
          recipientPhone: draft.recipientPhone,
          addressLine1: draft.addressLine1,
          addressLine2: draft.addressLine2,
          landmark: draft.landmark,
          locality: draft.locality,
          city: draft.city,
          stateCode: draft.stateCode,
          postalCode: draft.postalCode,
          coordinates: draft.coordinates,
          label: draft.label,
        },
      });
      if (!dest.ok) {
        setPending(false);
        setError(commerceErrorCopy(dest.code));
        return;
      }
      destinationCheckout = dest.data.checkout;
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
    setScreen("review");
  }

  const activeStep =
    screen === "destination" ? "delivery" : screen === "review" ? "review" : "payment";

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      {screen === "conflict" ? (
        <ReconcileConflictDialog pending={pending} onChoose={(choice) => void chooseResolution(choice)} />
      ) : null}

      <div className="mx-auto max-w-[640px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Checkout
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Checkout
          </h1>
          <CheckoutStepIndicator activeStep={activeStep} />
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
          <CheckoutDestinationFlow
            brandId={brandId}
            addresses={addresses}
            pending={pending}
            onComplete={(draft) => void applyDestinationDraft(draft)}
          />
        ) : null}

        {screen === "review" && snapshot && checkout ? (
          <div className="flex flex-col gap-4" data-testid="checkout-review">
            <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4">
              <h2 className="mb-2 font-body text-[15px] font-semibold text-[var(--text-primary)]">
                Delivery destination
              </h2>
              <p className="font-body text-[14px] text-[var(--text-secondary)]">
                {destinationSummary(snapshot) ?? "Delivery destination confirmed"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-[44px]"
                data-testid="checkout-back-to-delivery"
                onClick={() => setScreen("destination")}
              >
                Edit delivery
              </Button>
            </section>
            <CheckoutSnapshotLineList
              title="Your items"
              lines={narrowCheckoutSnapshotLines(snapshot.lines)}
            />
            <OrderMoneySummaryPanel snapshot={snapshot} title="Price summary" />
            <Button type="button" variant="primary" size="lg" onClick={() => setScreen("payment")}>
              Continue to payment
            </Button>
          </div>
        ) : null}

        {screen === "payment" && snapshot && checkout ? (
          <div className="flex flex-col gap-4" data-testid="checkout-ready">
            <CheckoutSnapshotLineList
              title="Your items"
              lines={narrowCheckoutSnapshotLines(snapshot.lines)}
            />
            <OrderMoneySummaryPanel snapshot={snapshot} title="Price summary" />
            <PaymentPanel
              checkout={checkout}
              snapshot={snapshot}
              onBackToReview={() => setScreen("review")}
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
