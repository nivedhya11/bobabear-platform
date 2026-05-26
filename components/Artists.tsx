"use client";

/**
 * Artists — Chapter 04 · The Artists
 *
 * Single full-bleed tease card. The image area is a placeholder for the
 * upcoming collab teaser (cinematic shot / video loop). A bottom-aligned
 * overlay carries the saffron pill, big display title, and italic sub.
 *
 * No CTAs by design — the bear shows when it's ready, not before.
 *
 * Motion: the card grows up into place on scroll-in, the placeholder content
 * drifts on a slow scroll parallax (so the empty frame still feels alive, like
 * a held shot), and the overlay reveals last — pill, then the big
 * "Something's coming." line, then the sub — a deliberate, unhurried beat that
 * matches the copy's "not a second sooner" tone. The reveal transform sits on a
 * wrapper so the card keeps its own CSS hover-lift. Reduced motion renders the
 * final state and drops the parallax.
 */

import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { SectionHead } from "@/components/SectionHead";
import { Reveal, RevealStagger, RevealChild } from "@/components/motion/Reveal";

export function Artists() {
  const reduce = useReducedMotion() ?? false;

  // Teaser photo falls back to the placeholder label if it 404s.
  const [artFailed, setArtFailed] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const placeholderParallax = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [28, -28],
  );

  return (
    <section
      ref={sectionRef}
      id="artists"
      className="relative bg-[var(--bg-section)]"
    >
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">
        <SectionHead
          chapter="CHAPTER 04 · THE ARTISTS · ALL FORMS WELCOME"
          leading="The"
          accent="Artists"
          leadingOutline
          accentColor="primary"
          description="The bear high-key supports artists. Sip the boba and express your heart out."
        />

        {/* ── Tease card ───────────────────────────────────────────── */}
        <Reveal y={28} scaleFrom={0.97} duration={0.7}>
          <article
            className={[
              "relative overflow-hidden cursor-pointer",
              "bg-[var(--bg-surface)]",
              "border border-[var(--border-default)]",
              "transition-[transform,border-color] duration-[400ms] ease-out",
              "hover:-translate-y-1 hover:border-[var(--border-strong)]",
            ].join(" ")}
          >
            {/* Teaser image — a sunlit rehearsal studio (the bear is rehearsing
                with someone). Sits within a small mat and drifts on a slow
                scroll parallax; the image is over-scaled so the drift never
                reveals an edge. Mobile uses a tall 4:5 poster crop so the photo
                fills the frame with the caption overlaid; md+ keeps 16:9. */}
            <div
              className={[
                "relative aspect-[4/5] md:aspect-[16/9]",
                "md:min-h-[380px] lg:min-h-[480px]",
                "overflow-hidden",
              ].join(" ")}
            >
              {!artFailed ? (
                <motion.img
                  src="/assets/artists/the-artists.jpg"
                  alt="A sunlit dance and rehearsal studio — deep green walls, a mirrored barre and a worn wooden floor"
                  onError={() => setArtFailed(true)}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={reduce ? undefined : { y: placeholderParallax }}
                  className="absolute left-0 top-[-15%] w-full h-[130%] object-cover select-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center px-6 border border-dashed border-[var(--border-default)]">
                  <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] opacity-80 leading-relaxed">
                    UPCOMING COLLAB · BIG VISUAL TEASE · PLACEHOLDER FOR IMAGE ·
                    CINEMATIC TEASER SHOT · VIDEO LOOP OPTIONAL
                  </span>
                </div>
              )}
            </div>

            {/* Caption block — poster overlay at the bottom of the image on all
                breakpoints (the liked desktop treatment). A tall gradient scrim
                keeps the text legible while the upper photo stays clear. */}
            <RevealStagger
              as="div"
              stagger={0.12}
              className={[
                "absolute inset-x-0 bottom-0",
                // mobile: extra top padding gives the tall scrim room to fade in.
                // md+ keeps the locked desktop padding (px-10 py-9).
                "px-6 pb-7 pt-20 md:px-10 md:py-9",
                "flex flex-col gap-3",
                // mobile: taller/stronger poster scrim so overlaid text stays legible.
                "bg-[linear-gradient(to_top,var(--bg-page)_6%,color-mix(in_srgb,var(--bg-page)_80%,transparent)_42%,transparent)]",
                // md+ : the exact locked desktop gradient.
                "md:bg-[linear-gradient(to_top,color-mix(in_srgb,var(--bg-page)_92%,transparent),transparent)]",
              ].join(" ")}
            >
              {/* Saffron pill */}
              <RevealChild
                as="span"
                y={14}
                className={[
                  "self-start",
                  "px-2.5 py-1 md:px-3 md:py-1.5",
                  "font-mono font-semibold uppercase",
                  "text-[9px] tracking-[0.12em] md:text-[10px] md:tracking-[0.16em]",
                  "bg-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
                ].join(" ")}
              >
                ↳ Next collab · Revealed soon
              </RevealChild>

              {/* Title */}
              <RevealChild
                as="p"
                y={22}
                duration={0.65}
                className={[
                  "font-display leading-[0.95]",
                  "text-[clamp(36px,6vw,80px)]",
                  "text-[var(--text-primary)]",
                ].join(" ")}
              >
                Something&rsquo;s coming.
              </RevealChild>

              {/* Sub */}
              <RevealChild
                as="p"
                y={14}
                className={[
                  "font-heading leading-[1.45]",
                  "text-[14px] md:text-[16px]",
                  "text-[var(--text-primary)] opacity-80",
                  "max-w-[560px]",
                ].join(" ")}
              >
                The bear is rehearsing with someone interesting. We&rsquo;ll show
                you when it&rsquo;s ready — not a second sooner.
              </RevealChild>
            </RevealStagger>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
