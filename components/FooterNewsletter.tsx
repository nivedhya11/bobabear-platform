"use client";

/**
 * FooterNewsletter — community signup island inside the server Footer.
 *
 * Boxed card: italic blurb on top, then a single field that accepts an
 * email OR a mobile number + a filled saffron JOIN button. Submitting opens
 * WhatsApp so the user can complete signup directly (the /api/newsletter
 * server route is unavailable in the static export).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTACT } from "@/lib/site";

type Status = "idle" | "redirecting";

export function FooterNewsletter() {
  const [contact, setContact] = useState("");
  const [status,  setStatus]  = useState<Status>("idle");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contact) return;
    setStatus("redirecting");
    window.open(CONTACT.whatsapp, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={[
        "border border-[var(--border-strong)]",
        "p-5 md:p-6",
        "flex flex-col gap-5",
      ].join(" ")}
    >
      <p className="font-heading italic text-[15px] md:text-[16px] text-[var(--text-secondary)] leading-[1.45]">
        Join the bear&rsquo;s circle. Drops, collabs, and first dibs — straight
        to your phone or inbox.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
        {/* Single bordered field (mirrors the Merch "Catch the Drop" field).
            The orange focus frame lives on this box via focus-within, so the
            indicator sits OUTSIDE the input and never overlaps the Join button. */}
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
            {status === "redirecting" ? "…" : "Join"}
          </button>
        </div>

        <p
          aria-live="polite"
          className={cn(
            "font-body text-[11px] min-h-[1rem]",
            status === "redirecting" && "text-firefly-400",
            status === "idle"        && "text-[var(--text-tertiary)]",
          )}
        >
          {status === "redirecting" && "Opening WhatsApp to complete signup…"}
          {status === "idle"        && " "}
        </p>
      </form>
    </div>
  );
}
