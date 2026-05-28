"use client";

/**
 * EmailLink — a thin client wrapper around an <a href="mailto:"> that fires
 * the GA4 "email_click" event on click. Used by the server-rendered Footer so
 * that the mailto anchors can still track interactions without making the whole
 * Footer a client component.
 */

import { trackEvent } from "@/components/Analytics";

interface EmailLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function EmailLink({ href, className, children }: EmailLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackEvent("email_click", { location: "footer" })}
    >
      {children}
    </a>
  );
}
