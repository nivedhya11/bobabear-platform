"use client";

const CART_COUNT_EVENT = "boba-bear:cart-count";

export function publishCartCount(itemCount: number): void {
  window.dispatchEvent(new CustomEvent<number>(CART_COUNT_EVENT, { detail: itemCount }));
}

export function subscribeToCartCount(onChange: (itemCount: number) => void): () => void {
  const listener = (event: Event) => onChange((event as CustomEvent<number>).detail);
  window.addEventListener(CART_COUNT_EVENT, listener);
  return () => window.removeEventListener(CART_COUNT_EVENT, listener);
}
