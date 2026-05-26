"use client";

/**
 * SignatureDrops — §2.4 Boba Bear Landing Build Guide
 *
 * Teaser for the drop(s). Two-column desktop (text left · drop-art right),
 * single-column mobile. Background is --bg-surface-sunken (deepest forest)
 * so the section reads as a recessed well between Drops and Menu.
 *
 * ── Three drop states (per entry, author-set via `state`) ────────────────────
 *   soon    → countdown ticks toward `launchAt`. Chip + digits SAFFRON.
 *             Chip label "New Drop Soon".
 *   live    → countdown frozen at 00:00:00:00 (no ticking, no flourish).
 *             Chip + digits FIREFLY GREEN. Chip label "New Drop Live".
 *   limited → countdown ticks toward `launchAt`. Chip + digits CRIMSON RED
 *             (≈4:1 on the sunken bg — AA-large). Chip label "Limited Time Drop".
 *
 * ── Carousel ─────────────────────────────────────────────────────────────────
 * Edit DROPS (max MAX_DROPS) to drive the carousel. Each entry carries its own
 * state, launchAt (ISO datetime, IST), image, alt and blurb — add an entry and
 * it joins the rotation. The countdown is computed in real time from `launchAt`.
 * With ONE entry the section is static; with 2+ it auto-advances every DWELL_MS,
 * the art CROSS-FADES into the next, and chip / blurb / countdown swap with it.
 * Same behaviour on mobile and desktop. No CTA in this section.
 *
 * Motion: the left column unfolds top-down on scroll-in (eyebrow, the big
 * two-line title, blurb, the rule DRAWS across, then the countdown digits POP
 * in). The right drop-art scales up out of its mint glow and drifts on a slow
 * scroll parallax. Reduced motion renders the final state, kills the parallax,
 * and hard-cuts carousel swaps.
 */

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Tag } from "@/components/ui/Tag";
import {
  RevealStagger,
  RevealChild,
  EASE_OUT,
} from "@/components/motion/Reveal";

// ── Carousel config ──────────────────────────────────────────────────────────
const MAX_DROPS = 5;        // hard cap on carousel entries
const DWELL_MS  = 5000;     // each frame holds 5s before it cross-fades

type DropState = "soon" | "live" | "limited";

interface Drop {
  id: string;
  /** Drop name — used for aria/alt + image fallback label. */
  name: string;
  /** The descriptive line that swaps per drop. */
  blurb: string;
  img: string;
  alt: string;
  state: DropState;
  /**
   * ISO datetime the countdown targets (write it with the IST offset, e.g.
   * "2026-06-01T10:00:00+05:30"). Used by `soon` + `limited`; ignored by `live`.
   */
  launchAt: string;
}

// ── Edit the carousel here ───────────────────────────────────────────────────
// Add up to MAX_DROPS entries. One entry → static (no rotation), as below.
const DROPS: Drop[] = [
  {
    id: "purple-rain",
    name: "Purple Rain Drop",
    blurb:
      "The Purple Rain Combo — taro-matcha-layered-boba, a jumbo burger & large fries. Limited batch, available until it sells out.",
    img: "/assets/drops/purple-rain-combo.jpg",
    alt: "The Purple Rain Combo — layered matcha boba with a jumbo burger, and large fries.",
    state: "soon",
    launchAt: "2026-06-01T10:00:00+05:30", // 1 June 2026, 10:00 AM IST
  },
];

// ── Per-state styling + behaviour ────────────────────────────────────────────
const STATE_CONFIG: Record<
  DropState,
  { chipLabel: string; chipClass: string; color: string; frozen: boolean }
> = {
  soon: {
    chipLabel: "New Drop Soon",
    chipClass:
      "bg-[var(--interactive-secondary)] border-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
    color: "var(--interactive-secondary)",
    frozen: false,
  },
  live: {
    chipLabel: "New Drop Live",
    chipClass:
      "bg-[var(--interactive-primary)] border-[var(--interactive-primary)] text-[var(--text-on-primary)]",
    color: "var(--interactive-primary)",
    frozen: true,
  },
  limited: {
    chipLabel: "Limited Time Drop",
    chipClass:
      "bg-[var(--interactive-destructive)] border-[var(--interactive-destructive)] text-white",
    color: "var(--interactive-destructive)",
    frozen: false,
  },
};

type Remaining = { days: string; hours: string; minutes: string; seconds: string };

const ZERO: Remaining = { days: "00", hours: "00", minutes: "00", seconds: "00" };
// Static first-paint seed so SSR and hydration match; the mount effect then
// replaces it with the real time remaining (a one-frame correction).
const SEED: Remaining = { days: "07", hours: "00", minutes: "00", seconds: "00" };

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

function diff(target: number): Remaining {
  const ms = Math.max(0, target - Date.now()); // clamp — never goes negative
  return {
    days: pad(Math.floor(ms / 86_400_000)),
    hours: pad(Math.floor((ms % 86_400_000) / 3_600_000)),
    minutes: pad(Math.floor((ms % 3_600_000) / 60_000)),
    seconds: pad(Math.floor((ms % 60_000) / 1_000)),
  };
}

const SWAP = { duration: 0.45, ease: EASE_OUT };

export function SignatureDrops() {
  const reduce = useReducedMotion() ?? false;

  const drops = DROPS.slice(0, MAX_DROPS);
  const count = drops.length;

  // Active carousel frame.
  const [index, setIndex] = useState(0);
  const active = drops[Math.min(index, count - 1)] ?? drops[0];
  const cfg = STATE_CONFIG[active.state];

  // ── Countdown ──────────────────────────────────────────────────────────────
  const [remaining, setRemaining] = useState<Remaining>(SEED);

  useEffect(() => {
    // "live" → hold a frozen 00:00:00:00, no ticking, no flourish.
    if (cfg.frozen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemaining(ZERO);
      return;
    }
    const target = new Date(active.launchAt).getTime();
    const tick = () => setRemaining(diff(target));
    tick(); // sync immediately from the SSR seed to the real remaining time
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active.launchAt, cfg.frozen]);

  // ── Carousel rotation — only when there are 2+ entries ───────────────────────
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), DWELL_MS);
    return () => clearInterval(id);
  }, [count]);

  // ── Slow scroll parallax for the drop-art panel ──────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const artParallax = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [48, -48],
  );

  const timerLabel =
    active.state === "live"
      ? "The drop is now live"
      : `Next drop in ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`;

  return (
    <section
      ref={sectionRef}
      id="drops"
      className="relative bg-[var(--bg-surface-sunken)] text-[var(--text-primary)]"
    >
      <div
        className={[
          "mx-auto max-w-[1340px]",
          "px-5 md:px-10 lg:px-14",
          "py-20 md:py-[120px] lg:py-[140px]",
          "flex flex-col gap-10",
          "lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:items-center",
        ].join(" ")}
      >
        {/* ── LEFT — text column ─────────────────────────────────────── */}
        <RevealStagger className="flex flex-col" stagger={0.1}>

          {/* Eyebrow row — label + state chip (chip swaps per drop) */}
          <RevealChild as="div" y={14} className="flex items-center gap-3.5 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70 text-[var(--text-primary)]">
              CHAPTER 01 · SIGNATURE DROPS
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={active.id + active.state}
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                transition={SWAP}
                className="inline-flex"
              >
                <Tag pulse className={cfg.chipClass}>
                  {cfg.chipLabel}
                </Tag>
              </motion.span>
            </AnimatePresence>
          </RevealChild>

          {/* Title — Upcoming / Drop (static section identity) */}
          <RevealChild
            as="h2"
            y={30}
            duration={0.65}
            className={[
              "font-display leading-[1.03] mt-3.5",
              "text-[clamp(56px,12vw,120px)]",
            ].join(" ")}
          >
            <span
              className="block"
              style={{
                WebkitTextStroke: "1.5px var(--text-primary)",
                color: "transparent",
              }}
            >
              Upcoming
            </span>
            <span className="block">Drop</span>
          </RevealChild>

          {/* Blurb — swaps per drop */}
          <RevealChild
            as="div"
            y={18}
            className={[
              "font-heading leading-[1.45] mt-[18px]",
              "text-[17px] md:text-[22px]",
              "max-w-[460px] opacity-85",
              "min-h-[3lh]",
            ].join(" ")}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={active.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={SWAP}
              >
                {active.blurb}
              </motion.p>
            </AnimatePresence>
          </RevealChild>

          {/* Divider — draws left → right */}
          <motion.div
            className="mt-8 h-px w-full bg-[var(--border-subtle)] origin-left"
            variants={
              reduce
                ? undefined
                : {
                    hidden: { scaleX: 0, opacity: 0 },
                    show: {
                      scaleX: 1,
                      opacity: 1,
                      transition: { duration: 0.7, ease: EASE_OUT },
                    },
                  }
            }
          />

          {/* Countdown — digits pop in on scroll; recolour + values swap per drop */}
          <RevealStagger
            as="div"
            stagger={0.09}
            role="timer"
            aria-label={timerLabel}
            className="mt-6 flex items-start gap-3 md:gap-5"
          >
            <CountdownCell value={remaining.days} label="Days" color={cfg.color} />
            <CountdownSep color={cfg.color} />
            <CountdownCell value={remaining.hours} label="Hours" color={cfg.color} />
            <CountdownSep color={cfg.color} />
            <CountdownCell value={remaining.minutes} label="Minutes" color={cfg.color} />
            <CountdownSep color={cfg.color} />
            <CountdownCell value={remaining.seconds} label="Seconds" color={cfg.color} />
          </RevealStagger>
        </RevealStagger>

        {/* ── RIGHT — drop-art (cross-fades between drops) ──────────────── */}
        <motion.div style={reduce ? undefined : { y: artParallax }}>
          <motion.div
            className={[
              "relative overflow-hidden",
              "aspect-square w-full",
              "bg-[var(--bg-surface)]",
              "border border-[var(--border-default)]",
            ].join(" ")}
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            {/* Aurora mint glow — blooms behind the art */}
            <motion.div
              aria-hidden
              className="absolute inset-0 z-[1] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-aurora-mint) 12%, transparent) 0%, transparent 60%)",
              }}
              initial={reduce ? false : { opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -12% 0px" }}
              transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
            />

            {/* Image stack — old fades out as new fades in (cross-fade) */}
            <AnimatePresence initial={false}>
              <motion.div
                key={active.id}
                className="absolute inset-0 z-[2]"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT }}
              >
                <DropArt drop={active} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Drop art — one image instance with its own 404 fallback ──────────────────
function DropArt({ drop }: { drop: Drop }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-center px-4 bg-[var(--bg-surface)]">
        <span className="font-display text-[clamp(28px,4vw,48px)] leading-[1.05] text-[var(--text-tertiary)]">
          {drop.name}
        </span>
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={drop.img}
      alt={drop.alt}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover select-none"
      draggable={false}
    />
  );
}

// ── Countdown sub-components ─────────────────────────────────────────────────
// Each cell/sep is a RevealChild so the parent RevealStagger pops them in on
// scroll-in. `color` recolours the digits per state with a smooth transition.

const COLOR_TWEEN = "color 300ms cubic-bezier(0,0,0.2,1)";

function CountdownCell({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <RevealChild
      as="div"
      y={12}
      spring
      aria-hidden
      className="flex flex-1 flex-col items-center gap-1"
    >
      <span
        className="font-display leading-[1.03] text-[clamp(38px,7vw,60px)] tabular-nums"
        style={{ color, transition: COLOR_TWEEN }}
      >
        {value}
      </span>
      <span className="font-mono text-[11px] md:text-[14px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
        {label}
      </span>
    </RevealChild>
  );
}

function CountdownSep({ color }: { color: string }) {
  return (
    <RevealChild
      as="span"
      y={12}
      spring
      aria-hidden
      className="font-display leading-[1.03] text-[clamp(38px,7vw,60px)] self-start"
      style={{ color, transition: COLOR_TWEEN }}
    >
      :
    </RevealChild>
  );
}
