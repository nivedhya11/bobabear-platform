"use client";

/**
 * MerchDrop — §2.7 Boba Bear Landing Build Guide
 *
 * Series 01 is a four-piece drop: Unbothered Tee, Bear Bottle, Boba Bear Mug
 * and Unbothered Tote. Each ships as Aurora-stage product photography in a
 * bento grid — a large flagship tee plus three product tiles and one inverted
 * brand-voice statement tile — then an inline "get notified" signup below.
 *
 * Product tiles are full-bleed photos with a bottom readability scrim and an
 * overlaid label; if a photo 404s they fall back to a solid Aurora block with
 * the product name (same pattern as MenuCard / PolaroidCard).
 *
 * The reveal transform lives on a wrapper RevealChild (the grid item, which
 * carries the span classes) so the inner <article> keeps its own CSS hover-lift
 * — inline motion transforms and Tailwind hover transforms never collide
 * because they sit on different elements.
 */

import { useState } from "react";
import { ArrowRight } from "@/components/icons";
import { SectionHead } from "@/components/SectionHead";
import { Reveal, RevealStagger, RevealChild } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { CONTACT, SITE_URL } from "@/lib/site";
import { trackEvent } from "@/components/Analytics";

const IMG_TILE_BASE =
  "group relative h-full w-full overflow-hidden " +
  "border border-[var(--border-default)] " +
  "transition-[transform,border-color] duration-[250ms] ease-out " +
  "hover:-translate-y-1 hover:border-[var(--border-strong)]";

// ── Series 01 line-up ─────────────────────────────────────────────────────────
// All four photos are 16:9. On mobile the grid uses auto rows and each tile
// carries its own aspect-ratio so nothing crops awkwardly (the flagship tee
// keeps its full 16:9 frame). From md up we switch to fixed-height rows + spans
// for the bento, so `aspect` is cleared with `md:aspect-auto`:
//   lg (6 cols): tee 4×2 · bottle 2×1 · cup 2×1 · tote 2×1 · statement 4×1
//   md (4 cols): tee 2×2 · bottle/cup/tote/statement each 2×1
//   sm (1 col):  every tile full-width 16:9 — overlay labels need the room,
//                so we never pack two product photos side by side on mobile
type Product = {
  img: string;
  name: string;
  alt: string;
  meta: string;
  span: string;
  feature?: boolean;
};

const PRODUCTS: Product[] = [
  {
    img: "/assets/merch/tee-series-01.jpg",
    name: "Unbothered Tee",
    alt: "Boba Bear ‘Unbothered’ oversized tee in two-tone green — front and back views",
    meta: "Oversized cotton · front + back print",
    span: "col-span-2 aspect-[16/9] md:aspect-auto md:col-span-2 md:row-span-2 lg:col-span-4 lg:row-span-2",
    feature: true,
  },
  {
    img: "/assets/merch/bottle-series-01.jpg",
    name: "Bear Bottle",
    alt: "Boba Bear insulated stainless-steel water bottle in forest green with a bear sticker",
    meta: "Insulated stainless steel",
    span: "col-span-2 aspect-[16/9] md:aspect-auto md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1",
  },
  {
    img: "/assets/merch/cup-series-01.jpg",
    name: "Boba Bear Mug",
    alt: "Boba Bear ceramic lidded mug in lime green with the Boba Bear wordmark",
    meta: "Ceramic · lidded",
    span: "col-span-2 aspect-[16/9] md:aspect-auto md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1",
  },
  {
    img: "/assets/merch/tote-series-01.jpg",
    name: "Unbothered Tote",
    alt: "Boba Bear ‘Unbothered’ heavy-canvas tote bag in two-tone green",
    meta: "Heavy canvas · everyday carry",
    span: "col-span-2 aspect-[16/9] md:aspect-auto md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1",
  },
];

export function MerchDrop() {
  return (
    <section id="merch" className="bg-[var(--bg-page)]">
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">
        <SectionHead
          chapter="CHAPTER 03 · THE MERCH"
          leading="The"
          accent="Merch"
          leadingOutline
          accentColor="primary"
          description="Series 01 — tee, bottle, mug & tote. Drop-limited; store opens soon."
        />

        {/* ── Bento grid ───────────────────────────────────────────────
            The wall ASSEMBLES on scroll-in: each tile grows up into its slot,
            staggered like a contact sheet being laid out. */}
        <RevealStagger
          stagger={0.07}
          className={[
            "grid gap-3 grid-cols-2 auto-rows-auto",
            "md:grid-cols-4 md:gap-3.5 md:[grid-auto-rows:200px]",
            "lg:grid-cols-6 lg:gap-4 lg:[grid-auto-rows:220px]",
          ].join(" ")}
        >
          {PRODUCTS.map((p) => (
            <MerchTile key={p.name} {...p} />
          ))}

          {/* Drop anchor — a deep-forest tile that contrasts the light product
              photos and ties the wall to the waitlist below. The dark surface
              is intentionally fixed (not theme-tracked) so it stays a premium
              anchor in both light and dark mode, lit by a firefly glow. */}
          <RevealChild
            y={24}
            scaleFrom={0.94}
            className="col-span-2 aspect-[2/1] md:aspect-auto md:col-span-2 md:row-span-1 lg:col-span-4 lg:row-span-1"
          >
            <article
              className={[
                "relative h-full w-full overflow-hidden",
                "flex flex-col justify-center gap-1.5",
                "px-5 md:px-8 text-[#FAF3E2]",
                "border border-[var(--border-default)]",
                "transition-[transform] duration-[250ms] ease-out hover:-translate-y-1",
              ].join(" ")}
              style={{
                background:
                  "linear-gradient(135deg, #20401D 0%, #142B14 58%, #0D1F0D 100%)",
              }}
            >
              {/* Firefly glow — blooms from the top-right */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(168,216,50,0.32) 0%, transparent 70%)",
                }}
              />
              <span className="relative font-mono text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[#A8D832]">
                Series 01 · The Drop
              </span>
              <p className="relative font-display leading-[0.92] text-[30px] md:text-[50px]">
                Wear the <span className="text-[#A8D832]">bear.</span>
              </p>
              <p className="relative font-body text-[12px] md:text-[13px] text-[#FAF3E2]/65 max-w-[80%]">
                Four pieces, one unbothered bear. Drop-limited — first access below.
              </p>
            </article>
          </RevealChild>
        </RevealStagger>

        {/* ── Newsletter capture ───────────────────────────────────── */}
        <Reveal y={24}>
          <NewsletterBlock />
        </Reveal>
      </div>
    </section>
  );
}

// ── Single merch product tile ──────────────────────────────────────────────────

function MerchTile({ img, name, alt, meta, span, feature }: Product) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <RevealChild y={24} scaleFrom={0.94} className={span}>
      <article className={IMG_TILE_BASE}>
        {/* Photo — fills the tile; falls back to a solid Aurora block + name */}
        {!imgFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={img}
            alt={alt}
            onError={() => setImgFailed(true)}
            loading="lazy"
            decoding="async"
            className={[
              "absolute inset-0 w-full h-full object-cover select-none",
              "transition-transform duration-[450ms] ease-out group-hover:scale-[1.04]",
            ].join(" ")}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-aurora-rose px-4 text-center">
            <span className="font-display text-[#1B1408] opacity-70 text-[clamp(18px,3vw,28px)]">
              {name}
            </span>
          </div>
        )}

        {/* Readability scrim under the label */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Series chip */}
        <span className="absolute top-3 left-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/95 bg-black/35 backdrop-blur-sm px-2 py-1">
          Series 01
        </span>

        {/* Label */}
        <div className="absolute inset-x-0 bottom-0 p-[18px]">
          <p
            className={[
              "font-display leading-none text-white",
              feature ? "text-[30px] md:text-[40px]" : "text-[20px] md:text-[24px]",
            ].join(" ")}
          >
            {name}
          </p>
          <p className="font-body text-[11px] text-white/80 mt-1">{meta}</p>
        </div>
      </article>
    </RevealChild>
  );
}

// ── Newsletter signup block ──────────────────────────────────────────────────

function NewsletterBlock() {
  const [email,  setEmail]  = useState("");
  const [status, setStatus] = useState<"idle" | "redirecting">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = email.trim();
    if (!val) return;
    setStatus("redirecting");
    const subject = encodeURIComponent("Boba Bear drop updates");
    const body = encodeURIComponent(
      `Please notify me about Boba Bear drops.\n\nMy email: ${val}\nPage: ${SITE_URL}/`,
    );
    trackEvent("contact_form_mailto_opened");
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div
      className={[
        "mt-8 border border-[var(--border-default)] bg-[var(--bg-section)]",
        "p-6 md:p-8",
        "flex flex-col md:flex-row md:items-center gap-5 md:gap-10",
      ].join(" ")}
    >
      {/* Left — heading */}
      <div className="md:flex-1">
        <p className="font-display text-[36px] md:text-[44px] leading-none text-[var(--text-primary)]">
          Catch the Drop.
        </p>
        <p className="font-heading text-[14px] md:text-[16px] mt-2 text-[var(--text-secondary)] opacity-85">
          First access. No spam.
        </p>
      </div>

      {/* Right — email form */}
      <form
        onSubmit={onSubmit}
        className="md:flex-1 md:max-w-[420px] w-full"
        noValidate
      >
        <div className="flex items-center gap-2 border border-[var(--border-strong)] p-2">
          <label htmlFor="merch-email" className="sr-only">
            Email address
          </label>
          <input
            id="merch-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="your@email.com"
            disabled={status === "redirecting"}
            className={[
              "flex-1 min-w-0 bg-transparent py-2 outline-none rounded-sm",
              "font-body text-[13px] text-[var(--text-primary)]",
              "placeholder:text-[var(--text-tertiary)]",
              "focus-ring",
            ].join(" ")}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={status === "redirecting"}
            className="shrink-0"
          >
            <>
              {status === "redirecting" ? "…" : "Notify Me"}
              {status === "idle" && <ArrowRight size={16} strokeWidth={2.5} aria-hidden />}
            </>
          </Button>
        </div>

        {/* Status line */}
        <p
          aria-live="polite"
          className="font-mono text-[10px] uppercase tracking-[0.14em] mt-2 min-h-[14px]"
        >
          {status === "redirecting" && (
            <span className="text-[var(--interactive-primary)] normal-case">
              Opening your email app… or{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="underline underline-offset-2"
              >
                {CONTACT.email}
              </a>
            </span>
          )}
        </p>
      </form>
    </div>
  );
}
