"use client";

/**
 * Hero — §2.2 Boba Bear Landing Build Guide
 *
 * Three vertical blocks:
 *   A — hero-meta bar  (mono kicker row, border-bottom)
 *   B — hero-main      (two-col desktop: text + CTAs left | video stage right)
 *
 * Left column:  "00" chapter number · "For The / Unbothered" headline ·
 *               "S-Tier Sips · K-STREET DRIP" subtitle · two CTAs.
 * Right column: the featured video edit — a static square stage
 *               (autoplay/loop/muted at 1.3×) on every breakpoint.
 *
 * StaggerWords animates the two headline lines on mount.
 * useReducedMotion() short-circuits all motion to final-state renders.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StaggerWords } from "@/components/motion/StaggerWords";
import { Reveal, EASE_OUT } from "@/components/motion/Reveal";

// ── Video stage ─────────────────────────────────────────────────────────────

const PLAYBACK_RATE = 1.3;

// A static square stage on every breakpoint (no idle float / hover tilt).
// `autoplay` is off under reduced motion — the video holds on its first frame.
function VideoStage({ autoplay }: { autoplay: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Prime the element imperatively because two things can't be done via JSX:
  //   1. HTML5 has no playbackRate attribute (1.3× must be set on the node).
  //   2. React doesn't emit the `muted` attribute in SSR HTML, so the browser
  //      blocks the pre-hydration autoplay as "unmuted" — force-mute + replay.
  // Re-run on loadedmetadata/canplay since browsers reset rate on media load.
  const prime = useCallback(
    (v: HTMLVideoElement | null) => {
      if (!v) return;
      v.muted = true;
      v.playbackRate = PLAYBACK_RATE;
      if (autoplay) v.play().catch(() => {});
    },
    [autoplay],
  );
  useEffect(() => {
    prime(videoRef.current);
  }, [prime]);

  const bgStyle = {
    background:
      // Aurora peach soft radial top-left @ 10 %
      "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-aurora-peach) 10%, transparent), transparent 55%), " +
      // Firefly-800 soft radial bottom-right @ 8 %
      "radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--color-firefly-800) 8%, transparent), transparent 55%)",
  };

  return (
    <div
      className="relative overflow-hidden w-full aspect-square border border-[var(--border-default)]"
      style={bgStyle}
    >
      <video
        ref={videoRef}
        src="/assets/video/hero-featured.mp4"
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay={autoplay}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Boba Bear featured video edit"
        onLoadedMetadata={(e) => prime(e.currentTarget)}
        onCanPlay={(e) => prime(e.currentTarget)}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Hero() {
  const reduce = useReducedMotion() ?? false;

  // Desktop-only parallax. On mobile the stage and the subtitle/CTAs are stacked,
  // so a drifting stage overlaps ("cuts") the "S-Tier Sips" line below it — keep
  // the mobile stage planted. SSR defaults false; desktop opts in after mount.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Scroll parallax — the video stage lags the page as the hero scrolls away,
  // reading as depth (the focal art sits "behind the glass"). Disabled under
  // reduced motion. offset: progress 0 at top, 1 once the hero clears the top.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const stageParallax = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [0, 56],
  );

  return (
    <section
      ref={sectionRef}
      className={[
        "relative w-full bg-page",
        "px-5 md:px-10 lg:px-14",
        "pt-7 md:pt-10 lg:pt-12 pb-16 lg:pb-24",
        "mx-auto max-w-[1340px]",
      ].join(" ")}
    >
      {/* ── A — hero-meta bar ────────────────────────────────────────────── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 0.7, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className={[
          "flex flex-wrap justify-between items-center gap-x-4 gap-y-1",
          "pb-4 md:pb-6 border-b border-[var(--border-subtle)]",
          "font-mono text-[10px] uppercase tracking-[0.18em]",
          "text-[var(--text-primary)]",
        ].join(" ")}
      >
        <span>Chapter 00 · Boba Bear / Dehradun</span>
        <span>IST 2026 · Season 01</span>
      </motion.div>

      {/* ── B — hero-main ────────────────────────────────────────────────── */}
      <div
        className={[
          "mt-7 lg:mt-10",
          "flex flex-col gap-8 lg:gap-10",
          "lg:grid lg:grid-cols-[1fr_minmax(0,1fr)] lg:items-center",
        ].join(" ")}
      >
        {/* Left — headline (tagline + CTAs rejoin here on desktop only).
            Mobile centres everything; desktop returns to left-align. */}
        <div className="flex flex-col gap-2 items-center text-center lg:items-start lg:text-left">
          <h1
            className={[
              "font-display leading-[0.88] mt-1",
              "text-[clamp(56px,8vw,104px)]",
              "text-[var(--text-primary)]",
            ].join(" ")}
          >
            {/* sr-only prefix so the H1 reads "Boba Bear — For The Unbothered"
                to search engines while the visual headline stays unchanged. */}
            <span className="sr-only">Boba Bear — </span>
            <StaggerWords text="For The" className="block" />
            <StaggerWords
              text="Unbothered"
              delay={0.18}
              className="block text-[var(--interactive-secondary)]"
            />
          </h1>

          {/* SEO copy — read by crawlers, hidden from layout. Carries the
              primary location + menu keywords that back up the H1 signal. */}
          <p className="sr-only">
            Boba tea and Korean street food in Dehradun. Bubble tea, matcha,
            milk tea, ramyun noodles, momos, loaded fries, corn dogs and
            desserts. Order directly with Boba Bear. Aggregators remain a
            secondary option.
          </p>

          {/* Desktop only: tagline + CTAs live in the left column.
              `lg:contents` keeps the exact desktop stack; hidden on mobile.
              Both cascade in after the headline has finished staggering. */}
          <div className="hidden lg:contents">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.55 }}
              className={[
                "font-heading leading-[1.15] mt-8",
                "text-[clamp(22px,3.4vw,38px)]",
                "text-[var(--interactive-primary)]",
              ].join(" ")}
            >
              S-Tier Sips · K-Street Drip
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.72 }}
              className="flex flex-row gap-4 flex-wrap mt-14"
            >
              <Button asChild variant="primary" size="lg">
                <a href="/order/">Order Now</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#access">Access Drop</a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Right — video stage.
            Mobile: full-bleed (negative margins cancel the section padding so
            the card spans the whole screen width). Desktop: normal grid cell.
            Outer wrapper carries the scroll parallax; inner wrapper plays the
            mount entrance (scale + rise). The stage itself is static. */}
        <motion.div
          className="flex flex-col -mx-5 md:-mx-10 lg:mx-0"
          style={reduce || !isDesktop ? undefined : { y: stageParallax }}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.25 }}
          >
            <VideoStage autoplay={!reduce} />
          </motion.div>
        </motion.div>

        {/* Mobile only: tagline then full-width stacked CTAs, after the video.
            Hidden on desktop, where the block above handles them. Revealed on
            scroll-in since they sit below the stage on small screens. */}
        <Reveal y={18} className="lg:hidden flex flex-col gap-5">
          <p
            className={[
              "font-heading leading-[1.1] text-center",
              "text-[clamp(20px,3vw,32px)]",
              "text-[var(--interactive-primary)]",
            ].join(" ")}
          >
            S-Tier Sips · K-Street Drip
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild variant="primary" size="lg" className="w-full">
              <a href="/order/">Order Now</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href="#access">Access Drop</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
