"use client";

/**
 * ThePlates — Chapter 02 · The Menu (K-Street)
 *
 * Savory section with a Toggle category tab bar above a horizontal rail
 * of plate cards (4:3). Categories pulled from menu.json (excluding
 * "Signature Boba" and "Desserts" which belong to TheBar and TheSweet).
 *
 * Tab swap restarts rail scrollLeft and stagger-fades the new cards.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MenuCard } from "@/components/MenuCard";
import { SectionHead } from "@/components/SectionHead";
import { Reveal } from "@/components/motion/Reveal";
import { Toggle } from "@/components/ui/Toggle";
import menuData from "@/data/menu.json";
import type { MenuData } from "@/types/menu";
import { MENU_IMAGES } from "@/lib/menuImages";

const menu = menuData as MenuData;

// Parents that belong to other chapters
const EXCLUDE = new Set(["The Bar", "The Sweet"]);

// Stable id per tab so the panel can point back at its controlling tab (ARIA).
const tabId = (slug: string) => `plates-tab-${slug}`;
const PANEL_ID = "plates-panel";

export function ThePlates() {
  const reduce = useReducedMotion() ?? false;

  const categories = useMemo(
    () => menu.categories.filter((c) => !EXCLUDE.has(c.name)),
    [],
  );

  const firstCat = categories[0]?.name ?? "";
  const [activeCat, setActiveCat] = useState<string>(firstCat);

  // Slug of the active category — used to link the panel back to its tab (ARIA).
  const activeSlug =
    categories.find((c) => c.name === activeCat)?.slug ?? "";

  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (railRef.current) railRef.current.scrollLeft = 0;
  }, [activeCat]);

  const items = useMemo(() => {
    const cat = categories.find((c) => c.name === activeCat);
    return cat?.subcategories.flatMap((s) => s.items) ?? [];
  }, [activeCat, categories]);

  return (
    <section
      id="plates"
      className="bg-[var(--bg-surface-sunken)]"
    >
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">
        <SectionHead
          leading="K-"
          accent="Street"
          glue
          nowrap
          description="Signature Sauces. Korean ramyun, momos, burgers, wraps, loaded fries, meals & corn dogs. Pick a category — the bear handles the rest."
        />

        {/* Mono-pill category tabs (Toggle design-system component) */}
        <Reveal
          as="div"
          y={16}
          role="tablist"
          aria-label="Plate categories"
          className="flex flex-wrap gap-2 md:gap-2.5 mb-7 md:mb-9"
        >
          {categories.map((cat) => {
            const active = cat.name === activeCat;
            return (
              <Toggle
                key={cat.slug}
                id={tabId(cat.slug)}
                role="tab"
                aria-selected={active}
                aria-controls={PANEL_ID}
                selected={active}
                onClick={() => setActiveCat(cat.name)}
              >
                {cat.name}
              </Toggle>
            );
          })}
        </Reveal>

        {/* Rail with edge fades */}
        <div className="relative">
          <EdgeFade side="left" />
          <EdgeFade side="right" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCat}
              ref={railRef}
              role="tabpanel"
              id={PANEL_ID}
              aria-labelledby={tabId(activeSlug)}
              tabIndex={0}
              className={[
                "flex gap-3.5 md:gap-[18px]",
                "overflow-x-auto scroll-smooth snap-x snap-mandatory",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                "[-webkit-overflow-scrolling:touch]",
                // Rail is clipped to the content column — cards never bleed into
                // the page side margins.
                "py-1 pb-2",
                // Keyboard-focusable scroller (arrow keys scroll it) with a
                // visible focus ring.
                "rounded-sm focus-ring",
              ].join(" ")}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            >
              {items.map((item, i) => {
                const card = (
                  <MenuCard
                    item={item}
                    index={i}
                    type="plate"
                    img={MENU_IMAGES[item.name]}
                    tags={item.tags}
                  />
                );
                return reduce ? (
                  <div key={item.name}>{card}</div>
                ) : (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      ease: [0, 0, 0.2, 1],
                      delay: Math.min(i * 0.06, 0.5),
                    }}
                    className="contents"
                  >
                    {card}
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function EdgeFade({ side }: { side: "left" | "right" }) {
  const grad = side === "left"
    ? "bg-gradient-to-r from-[var(--bg-surface-sunken)] to-transparent"
    : "bg-gradient-to-l from-[var(--bg-surface-sunken)] to-transparent";
  const pos = side === "left" ? "left-0" : "right-0";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-0 bottom-2 ${pos} w-8 md:w-12 z-[3] ${grad}`}
    />
  );
}
