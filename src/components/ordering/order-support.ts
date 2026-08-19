/**
 * External contextual support links — public orderNumber only.
 */

import { CONTACT } from "@/lib/site";

export function orderSupportMessage(orderNumber: string): string {
  return `Hi BOBA Bear,\nI need help with order ${orderNumber}.`;
}

export function orderSupportWhatsAppUrl(orderNumber: string): string {
  const digits = CONTACT.phoneE164.replace(/\D/g, "");
  const text = encodeURIComponent(orderSupportMessage(orderNumber));
  return `https://wa.me/${digits}?text=${text}`;
}

export function orderSupportMailtoUrl(orderNumber: string): string {
  const subject = encodeURIComponent(`Help with order ${orderNumber}`);
  const body = encodeURIComponent(orderSupportMessage(orderNumber));
  return `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
}

export function orderSupportTelUrl(): string {
  return `tel:${CONTACT.phoneE164}`;
}
