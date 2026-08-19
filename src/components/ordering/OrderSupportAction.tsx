"use client";

import {
  orderSupportMailtoUrl,
  orderSupportTelUrl,
  orderSupportWhatsAppUrl,
} from "@/components/ordering/order-support";
import { CONTACT } from "@/lib/site";

export function OrderSupportAction(props: { orderNumber: string }) {
  const { orderNumber } = props;

  return (
    <div className="flex flex-col gap-2" data-testid="order-support">
      <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">
        Need help with this order?
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={orderSupportWhatsAppUrl(orderNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp support for order ${orderNumber}`}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-md font-body font-bold text-[14px] bg-[var(--interactive-primary)] [color:#1F2C08] focus-ring"
        >
          WhatsApp
        </a>
        <a
          href={orderSupportMailtoUrl(orderNumber)}
          aria-label={`Email support for order ${orderNumber}`}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-md font-body font-bold text-[14px] border border-[var(--border-strong)] focus-ring"
        >
          Email
        </a>
        <a
          href={orderSupportTelUrl()}
          aria-label={`Call Boba Bear about order ${orderNumber}`}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-md font-body font-bold text-[14px] border border-[var(--border-strong)] focus-ring"
        >
          {CONTACT.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
