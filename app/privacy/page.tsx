/**
 * /privacy — Privacy Policy
 *
 * Plain-language policy for the Boba Bear landing page. The only personal data
 * the site itself collects is the email/phone submitted to the community signup
 * form (POST /api/newsletter). Ordering happens off-site on Zomato / Swiggy /
 * WhatsApp, each under its own policy. Company + contact details are pulled from
 * lib/site.ts so they never drift from the footer and structured data.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_LEGAL_NAME,
  SITE_NAME,
  CONTACT,
  BUSINESS,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Boba Bear (Nivedhya11 Hospitality Private Limited) collects, uses and protects the contact details you share with us.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "23 May 2026";

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-[22px] md:text-[26px] leading-tight text-[var(--text-primary)]">
        {heading}
      </h2>
      <div className="font-body text-[15px] md:text-[16px] leading-[1.7] text-[var(--text-secondary)] flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[760px] px-5 md:px-10 py-16 md:py-24 flex flex-col gap-10">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Legal
          </p>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] leading-[0.95] text-[var(--text-primary)]">
            Privacy Policy
          </h1>
          <p className="font-body text-[14px] text-[var(--text-tertiary)]">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <Section heading="Who we are">
          <p>
            {SITE_NAME} is a boba bar &amp; Indo-Korean kitchen operated by{" "}
            <strong className="text-[var(--text-primary)] font-semibold">
              {SITE_LEGAL_NAME}
            </strong>
            , {BUSINESS.street}, {BUSINESS.locality} {BUSINESS.postalCode},{" "}
            {BUSINESS.region}, India (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;). This policy explains what personal information we
            collect through this website and how we use and protect it.
          </p>
        </Section>

        <Section heading="Information we collect">
          <p>
            <strong className="text-[var(--text-primary)] font-semibold">
              Contact details you give us.
            </strong>{" "}
            When you join our community list, we collect the email address or
            mobile number you submit — and nothing more. We do not ask for your
            name, payment details or address on this site.
          </p>
          <p>
            <strong className="text-[var(--text-primary)] font-semibold">
              Basic technical data.
            </strong>{" "}
            Like most websites, our servers may briefly process standard request
            data (such as IP address and browser type) to keep the site secure
            and rate-limit abuse of our forms. We do not use advertising or
            third-party tracking cookies, and we do not build advertising
            profiles of you.
          </p>
        </Section>

        <Section heading="How we use your information">
          <p>We use the contact detail you share only to:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>send you drop announcements, offers and first-access news;</li>
            <li>respond to enquiries you send us; and</li>
            <li>operate, secure and improve the website.</li>
          </ul>
          <p>
            We rely on your consent (which you give by submitting the form) and
            our legitimate interest in running the site. You can withdraw consent
            at any time — see &ldquo;Your choices&rdquo; below.
          </p>
        </Section>

        <Section heading="Ordering on Zomato, Swiggy & WhatsApp">
          <p>
            Placing an order happens off this website, on third-party platforms
            (Zomato, Swiggy and WhatsApp / Meta). When you tap through to those
            services, the information you share there is governed by{" "}
            <em>their</em> privacy policies, not ours. We receive order details
            from these platforms only to prepare and fulfil your order.
          </p>
        </Section>

        <Section heading="Sharing your information">
          <p>
            We do not sell or rent your personal information. We may share it
            with service providers who help us send messages or run the site
            (for example, an email or messaging provider), bound to use it only
            on our instructions, or where required by law.
          </p>
        </Section>

        <Section heading="Data retention">
          <p>
            We keep your contact detail for as long as you remain on our
            community list, and remove it on request or once it is no longer
            needed for the purpose it was collected.
          </p>
        </Section>

        <Section heading="Your choices & rights">
          <p>
            You can ask us to access, correct or delete your information, or to
            stop contacting you, at any time. Just email{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-[var(--interactive-secondary)] hover:underline break-all"
            >
              {CONTACT.email}
            </a>
            {" "}and we&rsquo;ll take care of it.
          </p>
        </Section>

        <Section heading="Security">
          <p>
            We take reasonable technical and organisational measures to protect
            your information. No method of transmission or storage is completely
            secure, but we work to keep what you share with us safe.
          </p>
        </Section>

        <Section heading="Children">
          <p>
            This site is not directed at children under 13, and we do not
            knowingly collect their personal information.
          </p>
        </Section>

        <Section heading="Changes to this policy">
          <p>
            We may update this policy from time to time. We&rsquo;ll revise the
            &ldquo;Last updated&rdquo; date above when we do, and material
            changes will be reflected on this page.
          </p>
        </Section>

        <Section heading="Contact us">
          <p>Questions about this policy or your data? Reach us at:</p>
          <address className="not-italic font-body text-[15px] leading-[1.7] text-[var(--text-secondary)]">
            <span className="block text-[var(--text-primary)] font-semibold">
              {SITE_LEGAL_NAME}
            </span>
            <span className="block">
              {BUSINESS.street}, {BUSINESS.locality} {BUSINESS.postalCode},{" "}
              {BUSINESS.region}, India
            </span>
            <span className="block">
              Email:{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-[var(--interactive-secondary)] hover:underline break-all"
              >
                {CONTACT.email}
              </a>
            </span>
            <span className="block">
              Phone:{" "}
              <a
                href={`tel:${CONTACT.phoneE164}`}
                className="text-[var(--interactive-secondary)] hover:underline"
              >
                {CONTACT.phoneDisplay}
              </a>
            </span>
          </address>
          <p className="text-[var(--text-tertiary)] text-[14px]">
            This policy is governed by the laws of India.
          </p>
        </Section>

        {/* Back link */}
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] hover:text-[var(--interactive-secondary)] transition-colors duration-[150ms] ease-out focus-ring rounded-sm self-start"
        >
          ← Back to Boba Bear
        </Link>
      </div>
    </main>
  );
}
