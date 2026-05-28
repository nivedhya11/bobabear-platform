"use client";

/**
 * FooterNewsletter — community signup island inside the server Footer.
 *
 * Routing logic (static-export safe — no server API):
 *   • Input looks like an email → opens the user's mail client via mailto:
 *     pre-filled to bobabear.unbothered@gmail.com with subject + body.
 *   • Anything else (mobile number, name, etc.) → opens WhatsApp with the
 *     standard "Catch the Drop" message.
 *
 * Both paths fire a GA4 event when the env var is present.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTACT, SITE_URL } from "@/lib/site";
import { trackEvent } from "@/components/Analytics";

type Status = "idle" | "redirecting";

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function FooterNewsletter() {
  const [contact, setContact] = useState("");
  const [status,  setStatus]  = useState<Status>("idle");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = contact.trim();
    if (!val) return;
    setStatus("redirecting");

    if (looksLikeEmail(val)) {
      const subject = encodeURIComponent("Boba Bear drop updates");
      const body = encodeURIComponent(
        `Please notify me about Boba Bear drops.\n\nMy email: ${val}\nPage: ${SITE_URL}/`,
      );
      trackEvent("contact_form_mailto_opened");
      window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    } else {
      trackEvent("whatsapp_click", { location: "footer_newsletter" });
      window.open(CONTACT.whatsapp, "_blank", "noopener,noreferrer");
    }
  }

  const isEmail = looksLikeEmail(contact);
  const hint = contact
    ? isEmail
      ? "Will open your mail app →"
      : "Will open WhatsApp →"
    : "Email us or drop your number";

  return (
    <div
      className={[
        "border border-[var(--border-strong)]",
        "p-5 md:p-6",
        "flex flex-col gap-5",
      ].join(" ")}
    >
      <p className="font-heading italic text-[15px] md:text-[16px] text-[var(--text-secondary)] leading-[1.45]">
        Get drop updates by email or WhatsApp. No spam.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
        <div
          className={[
            "flex items-center gap-2 p-1.5 rounded-sm",
            "border border-[var(--border-strong)]",
            "transition-[border-color,box-shadow] duration-[150ms] ease-out",
            "focus-within:border-[var(--interactive-secondary)]",
            "focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--interactive-secondary)_38%,transparent)]",
          ].join(" ")}
        >
          <input
            type="text"
            name="contact"
            required
            inputMode="email"
            autoComplete="off"
            value={contact}
            onChange={(e) => { setContact(e.target.value); setStatus("idle"); }}
            placeholder="mobile or email →"
            aria-label="Mobile number or email to join the Boba Bear community"
            disabled={status === "redirecting"}
            className={[
              "h-10 px-2.5 flex-1 min-w-0 rounded-sm",
              "bg-transparent text-[var(--text-primary)]",
              "placeholder:text-[var(--text-tertiary)] placeholder:italic placeholder:font-heading",
              "border-0 outline-none",
              "font-body text-body-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          />
          <button
            type="submit"
            disabled={status === "redirecting"}
            className={[
              "shrink-0 h-10 px-5 rounded-sm",
              "bg-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
              "font-mono text-[11px] font-bold uppercase tracking-[0.16em]",
              "hover:bg-[var(--interactive-secondary-hover)]",
              "transition-colors duration-[150ms] ease-out",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "focus-ring",
            ].join(" ")}
          >
            {status === "redirecting" ? "…" : "Notify Me"}
          </button>
        </div>

        <p
          aria-live="polite"
          className={cn(
            "font-body text-[11px] min-h-[1rem]",
            status === "redirecting"
              ? "text-firefly-400"
              : "text-[var(--text-tertiary)]",
          )}
        >
          {status === "redirecting"
            ? isEmail
              ? <>Opening your email app… or{" "}<a href={`mailto:${CONTACT.email}`} className="underline underline-offset-2 hover:text-[var(--text-primary)]">{CONTACT.email}</a></>
              : "Opening WhatsApp…"
            : hint}
        </p>
      </form>
    </div>
  );
}
