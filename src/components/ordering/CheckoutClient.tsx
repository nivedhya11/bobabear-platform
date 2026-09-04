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
  listCustomerOrders,
  listOwnAddresses,
  readGuestCartCredential,
  readPaymentRecovery,
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
import { PreviousPaymentRecoveryView } from "@/components/ordering/PreviousPaymentRecoveryView";
import { cartChangedRecoveryPresentation } from "@/components/ordering/cart-changed-recovery-presentation";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

type Screen =
  | "loading"
  | "empty"
  | "conflict"
  | "destination"
  | "review"
  | "payment"
  | "cart_changed_unresolved"
  | "cart_changed_fresh"
  | "error";

async function waitForCustomerOrder(): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const listed = await listCustomerOrders({ limit: 5 });
    if (listed.ok && listed.data.items[0]) return listed.data.items[0].orderId;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

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
  const [resumePaymentId, setResumePaymentId] = useState<string | null>(null);
  const [cartChangedWhilePending, setCartChangedWhilePending] = useState(false);

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
      // Payment authority first — never present the old snapshot as current checkout.
      setCheckout(current);
      setSnapshot(current.activeSnapshot);
      setCartChangedWhilePending(true);
      setError(null);
      const recovery = readPaymentRecovery();
      setResumePaymentId(recovery?.checkoutId === current.id ? recovery.paymentId : null);
      setScreen("cart_changed_unresolved");
      return;
    }
    setCartChangedWhilePending(false);
    setResumePaymentId(null);
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

  async function startFreshCheckoutFromCurrentCart(): Promise<void> {
    if (pending || !cart) return;
    setPending(true);
    setError(null);
    setCartChangedWhilePending(false);
    setResumePaymentId(null);
    const started = await startCheckout({ cartId: cart.id });
    setPending(false);
    if (!started.ok) {
      // Domain may still hold PAYMENT_PENDING — keep unresolved recovery, never plain dead-end.
      if (started.code === "CHECKOUT_STATE_CONFLICT" || started.code === "CHECKOUT_CONFLICT") {
        setScreen("cart_changed_unresolved");
        return;
      }
      setScreen("error");
      setError(commerceErrorCopy(started.code));
      return;
    }
    const fresh = started.data.checkout;
    if (
      fresh.status === "PAYMENT_PENDING" &&
      fresh.sourceCartRevision !== cart.revision
    ) {
      setCheckout(fresh);
      setSnapshot(fresh.activeSnapshot);
      setCartChangedWhilePending(true);
      const recovery = readPaymentRecovery();
      setResumePaymentId(recovery?.checkoutId === fresh.id ? recovery.paymentId : null);
      setScreen("cart_changed_unresolved");
      return;
    }
    await continueWithCart(cart);
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

  function adoptCheckoutRevision(revision: string): void {
    setCheckout((current) => (current ? { ...current, revision } : current));
  }

  /**
   * Back-nav into Delivery must use authoritative server checkout revision.
   * Payment start/failure advances revision inside PaymentPanel; parent state
   * must not keep a pre-payment expectedCheckoutRevision.
   */
  async function returnToDelivery(): Promise<void> {
    if (pending || !checkout || !cart) return;
    setPending(true);
    setError(null);
    const active = await getActiveCheckout({ cartId: cart.id });
    if (!active.ok) {
      setPending(false);
      setError(commerceErrorCopy(active.code));
      return;
    }
    const current = active.data.checkout;
    if (!current || current.id !== checkout.id) {
      setPending(false);
      setError(commerceErrorCopy("CHECKOUT_NOT_FOUND"));
      return;
    }
    setCheckout(current);
    if (current.activeSnapshot) {
      setSnapshot(current.activeSnapshot);
    }
    setPending(false);
    if (current.status === "PAYMENT_PENDING") {
      // Existing domain forbids destination mutation while PAYMENT_PENDING.
      setError(commerceErrorCopy("CHECKOUT_STATE_CONFLICT"));
      return;
    }
    setScreen("destination");
  }

  useEffect(() => {
    if (screen !== "cart_changed_unresolved" || !cart) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const recovery = readPaymentRecovery();
      const active = await getActiveCheckout({ cartId: cart.id });
      if (cancelled) return;
      if (!active.ok) return;
      const current = active.data.checkout;
      if (current?.status === "COMPLETED") {
        const orderId = await waitForCustomerOrder();
        if (cancelled) return;
        if (orderId) {
          window.location.assign(`/order/confirmation/?orderId=${encodeURIComponent(orderId)}`);
        }
        return;
      }
      if (!current) {
        setCartChangedWhilePending(false);
        setScreen("cart_changed_fresh");
        return;
      }
      if (
        current.status === "PAYMENT_PENDING" &&
        current.sourceCartRevision !== cart.revision
      ) {
        setCheckout(current);
        setSnapshot(current.activeSnapshot);
        setCartChangedWhilePending(true);
        setResumePaymentId(recovery?.checkoutId === current.id ? recovery.paymentId : null);
        setScreen("cart_changed_unresolved");
        return;
      }
      if (current.sourceCartRevision !== cart.revision) {
        // READY/DRAFT after payment resolved to non-pending — safe to offer fresh checkout.
        setCartChangedWhilePending(false);
        setScreen("cart_changed_fresh");
        return;
      }
      setCartChangedWhilePending(false);
      setResumePaymentId(null);
      await continueWithCart(cart);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // continueWithCart is stable for this poll purpose; keyed by screen/cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, cart]);

  const recoveryScreens = screen === "cart_changed_unresolved" || screen === "cart_changed_fresh";
  const activeStep =
    screen === "destination" ? "delivery" : screen === "review" ? "review" : "payment";

  const freshPresentation = cartChangedRecoveryPresentation("fresh_checkout");

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
          {!recoveryScreens ? <CheckoutStepIndicator activeStep={activeStep} /> : null}
        </header>

        {screen === "loading" ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Preparing checkout…</p>
        ) : null}

        {error && screen !== "cart_changed_unresolved" && screen !== "cart_changed_fresh" ? (
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

        {screen === "cart_changed_unresolved" && cart ? (
          <PreviousPaymentRecoveryView
            cart={cart}
            catalog={props.catalog}
            previousSnapshot={snapshot}
            paymentSlot={
              checkout && snapshot ? (
                <PaymentPanel
                  checkout={checkout}
                  snapshot={snapshot}
                  resumePaymentId={resumePaymentId}
                  cartChangedWhilePending
                  embeddedInPreviousPaymentRecovery
                  onCheckoutRevisionChange={adoptCheckoutRevision}
                  onPaymentTerminalForCartChange={() => {
                    setCartChangedWhilePending(false);
                    setResumePaymentId(null);
                    setScreen("cart_changed_fresh");
                  }}
                  onOrderReady={(orderId) => {
                    window.location.assign(
                      `/order/confirmation/?orderId=${encodeURIComponent(orderId)}`,
                    );
                  }}
                />
              ) : null
            }
          />
        ) : null}

        {screen === "cart_changed_fresh" ? (
          <div className="flex flex-col gap-4" data-testid="cart-changed-fresh">
            <h2 className="font-body text-[18px] font-semibold text-[var(--text-primary)]">
              {freshPresentation.headline}
            </h2>
            <p className="font-body text-[14px] text-[var(--text-secondary)]">{freshPresentation.body}</p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="min-h-[44px]"
              data-testid={freshPresentation.primaryTestId ?? "cart-changed-start-fresh"}
              disabled={pending}
              onClick={() => void startFreshCheckoutFromCurrentCart()}
            >
              {freshPresentation.primaryActionLabel}
            </Button>
            <Button asChild variant="outline" className="min-h-[44px]">
              <a
                href={freshPresentation.secondaryHref ?? "/order/cart/"}
                data-testid={freshPresentation.secondaryTestId ?? "cart-changed-review-cart"}
              >
                {freshPresentation.secondaryActionLabel}
              </a>
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
                disabled={pending}
                onClick={() => void returnToDelivery()}
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

        {screen === "payment" && snapshot && checkout && !cartChangedWhilePending ? (
          <div className="flex flex-col gap-4" data-testid="checkout-ready">
            <CheckoutSnapshotLineList
              title="Your items"
              lines={narrowCheckoutSnapshotLines(snapshot.lines)}
            />
            <OrderMoneySummaryPanel snapshot={snapshot} title="Price summary" />
            <PaymentPanel
              checkout={checkout}
              snapshot={snapshot}
              resumePaymentId={resumePaymentId}
              onCheckoutRevisionChange={adoptCheckoutRevision}
              onBackToReview={(revision) => {
                adoptCheckoutRevision(revision);
                setScreen("review");
              }}
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
