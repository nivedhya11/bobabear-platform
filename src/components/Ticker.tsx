"use client";

/**
 * Ticker — Rainbow brand strip
 *
 * Full-bleed animated gradient background with scrolling brand phrases.
 * Rainbow gradient animates across 18 s; phrase track scrolls over 32 s.
 * Hover pauses both animations. prefers-reduced-motion freezes everything.
 *
 * Loop technique: the phrases array is rendered twice so the track can
 * translateX(-50%) seamlessly — when the first copy exits left the second
 * copy is exactly where the first started.
 */

import { useState } from "react";

const PHRASES = [
  "FOR THE UNBOTHERED",
  "BOBA TEA · INDO-KOREAN STREET FOOD",
  "S-TIER SIPS · K-STREET DRIP",
  "BEAR SUPPORTS ART",
  "CATCH THE DROP",
] as const;

interface TickerProps {
  direction?: "left" | "right";
}

export function Ticker({ direction = "left" }: TickerProps) {
  const [paused, setPaused] = useState(false);

  const scrollAnim = direction === "left"
    ? "tickerScrollLeft 32s linear infinite"
    : "tickerScrollRight 32s linear infinite";

  return (
    <>
      {/* Keyframes — scoped inside no-preference so reduced-motion gets no animation */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes tickerGrad {
            0%   { background-position: 0%   50%; }
            100% { background-position: 200% 50%; }
          }
          @keyframes tickerScrollLeft {
            from { transform: translateX(0);    }
            to   { transform: translateX(-50%); }
          }
          @keyframes tickerScrollRight {
            from { transform: translateX(-50%); }
            to   { transform: translateX(0);    }
          }
        }
      `}</style>

      {/* Outer strip — gradient background */}
      <div
        role="marquee"
        aria-label="Boba Bear brand slogans"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          position:         "relative",
          zIndex:           30,
          height:           40,
          overflow:         "hidden",
          whiteSpace:       "nowrap",
          background:       "linear-gradient(90deg, #FFB347, #FF8FA3, #C77DFF, #80B3FF, #7CE08C, #FFD93D, #FFB347)",
          backgroundSize:   "200% 100%",
          borderBottom:     "1px solid rgba(0,0,0,0.15)",
          animation:        "tickerGrad 18s linear infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {/* Scrolling track — duplicated for seamless loop */}
        <div
          style={{
            display:            "inline-flex",
            alignItems:         "center",
            height:             "100%",
            animation:          scrollAnim,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {[0, 1].map((copy) => (
            <span key={copy} style={{ display: "inline-flex", alignItems: "center" }}>
              {PHRASES.map((phrase, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily:    "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize:      10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color:         "#1B1408",
                      padding:       "0 18px",
                    }}
                  >
                    {phrase}
                  </span>
                  {/* Dot separator */}
                  <span
                    aria-hidden
                    style={{
                      display:       "inline-block",
                      width:         4,
                      height:        4,
                      borderRadius:  "50%",
                      background:    "#1B1408",
                      opacity:       0.6,
                      margin:        "0 48px",
                      flexShrink:    0,
                    }}
                  />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
