/**
 * Official Razorpay Checkout.js loader (IMP-026B).
 *
 * Browser-only. Static-export safe. Loads once. Never vendors the script.
 */
import { RAZORPAY_CHECKOUT_SCRIPT_URL, type RazorpayConstructor } from "./types";

let loadPromise: Promise<RazorpayConstructor> | null = null;

function existingScript(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`);
}

function resolveConstructor(): RazorpayConstructor | null {
  const ctor = window.Razorpay;
  return typeof ctor === "function" ? ctor : null;
}

export function loadRazorpayCheckoutScript(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout can only load in the browser."));
  }

  const already = resolveConstructor();
  if (already) return Promise.resolve(already);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const finishOk = () => {
      const ctor = resolveConstructor();
      if (!ctor) {
        loadPromise = null;
        reject(new Error("Razorpay Checkout is unavailable."));
        return;
      }
      resolve(ctor);
    };
    const finishErr = () => {
      loadPromise = null;
      const script = existingScript();
      script?.remove();
      reject(new Error("Razorpay Checkout failed to load."));
    };

    const script = existingScript() ?? document.createElement("script");
    if (!script.src) {
      script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.dataset.bobaRazorpayCheckout = "true";
    }
    script.addEventListener("load", finishOk, { once: true });
    script.addEventListener("error", finishErr, { once: true });
    if (!script.isConnected) {
      document.head.appendChild(script);
    } else if (resolveConstructor()) {
      finishOk();
    }
  });

  return loadPromise;
}

/** Test-only reset. Not used in production Payment UX. */
export function resetRazorpayCheckoutScriptForTests(): void {
  loadPromise = null;
}
