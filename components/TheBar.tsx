"use client";

/**
 * TheBar — Chapter 02 · The Menu (The Bar)
 *
 * Beverages split into two categories — Milk Base and Water Base — shown via a
 * Toggle tab bar above a horizontal rail of drink cards (3:4 image), mirroring
 * ThePlates. Milk Base = boba milk teas, matcha & iced coffees; Water Base =
 * iced teas & refreshers. Both pull from the "The Bar" parent category in
 * menu.json (Milk Base = the milky subcategories, Water Base = the rest).
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

// Which "The Bar" subcategories are milk-based. Everything else is water-based.
const MILK_SUBS = new Set(["Signature Boba", "Matcha Studio", "Iced Coffees"]);

// Stable id per tab so the panel can point back at its controlling tab (ARIA).
const tabId = (name: string) => `bar-tab-${name.toLowerCase().replace(/\s+/g, "-")}`;
const PANEL_ID = "bar-panel";

export function TheBar() {
  const reduce = useReducedMotion() ?? false;

  // Two derived tabs from the single "The Bar" parent category.
  const groups = useMemo(() => {
    const subs = menu.categories.find((c) => c.name === "The Bar")?.subcategories ?? [];
    return [
      {
        name: "Milk Base",
        items: subs.filter((s) => MILK_SUBS.has(s.name)).flatMap((s) => s.items),
      },
      {
        name: "Water Base",
        items: subs.filter((s) => !MILK_SUBS.has(s.name)).flatMap((s) => s.items),
      },
    ];
  }, []);

  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.name ?? "");

  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (railRef.current) railRef.current.scrollLeft = 0;
  }, [activeGroup]);

  const items = useMemo(
    () => groups.find((g) => g.name === activeGroup)?.items ?? [],
    [activeGroup, groups],
  );

  return (
    <section
      id="bar"
      className="bg-[var(--bg-page)]"
    >
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">
        <SectionHead
          chapter="CHAPTER 02 · THE MENU"
          leading="Boba"
          accent="Drinks"
          nowrap
          description="Boba milk teas, layered-matcha, iced coffees, iced teas & refreshers. Premium ingredients, pearls cooked fresh every morning."
        />

        {/* Mono-pill category tabs (Toggle design-system component) */}
        <Reveal
          as="div"
          y={16}
          role="tablist"
          aria-label="Drink categories"
          className="flex flex-wrap gap-2 md:gap-2.5 mb-7 md:mb-9"
        >
          {groups.map((group) => {
            const active = group.name === activeGroup;
            return (
              <Toggle
                key={group.name}
                id={tabId(group.name)}
                role="tab"
                aria-selected={active}
                aria-controls={PANEL_ID}
                selected={active}
                onClick={() => setActiveGroup(group.name)}
              >
                {group.name}
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
              key={activeGroup}
              ref={railRef}
              role="tabpanel"
              id={PANEL_ID}
              aria-labelledby={tabId(activeGroup)}
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
                    type="drink"
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
    ? "bg-gradient-to-r from-[var(--bg-page)] to-transparent"
    : "bg-gradient-to-l from-[var(--bg-page)] to-transparent";
  const pos = side === "left" ? "left-0" : "right-0";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-0 bottom-2 ${pos} w-8 md:w-12 z-[3] ${grad}`}
    />
  );
}
