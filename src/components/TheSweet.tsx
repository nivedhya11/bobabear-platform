"use client";

/**
 * TheSweet — Chapter 02 · The Menu (The Sweet)
 *
 * Polaroid stage for the four signature sweets. Each dessert is a square
 * cream-bg "photo" tilted at a small fixed angle.
 *   < xl : a 2 × 2 grid — two photos per row, four in two rows. The cards are
 *          too wide to sit four-across below large-desktop widths.
 *   xl+  : a centred row of four — the inner two photos ride higher than the
 *          outer pair, which splay out with mirrored tilts. Reads hand-placed.
 *
 * Cards are draggable; they spring back to origin on release
 * (Framer Motion `dragSnapToOrigin`, handled inside PolaroidCard).
 */

import { useReducedMotion } from "framer-motion";
import { PolaroidCard } from "@/components/PolaroidCard";
import { SectionHead } from "@/components/SectionHead";
import menuData from "@/data/menu.json";
import type { MenuData } from "@/types/menu";
import { MENU_IMAGES } from "@/lib/menuImages";

const menu = menuData as MenuData;

// < xl — 2 × 2 grid; small alternating tilts so no two neighbours match.
const STACK_TILTS = [-5, 5, -3, 4];

// xl+ — centred row of four. Inner pair rides high (mt-0); the outer two drop
// and splay out with mirrored tilts.
const ROW_TILTS  = [-7, -2, 3, 7];
const ROW_NUDGES = ["mt-12", "mt-0", "mt-0", "mt-12"];

export function TheSweet() {
  const reduce = useReducedMotion() ?? false;

  const desserts =
    menu.categories
      .find((c) => c.name === "The Sweet")
      ?.subcategories.flatMap((s) => s.items)
      .slice(0, 4) ?? [];

  return (
    <section
      id="sweet"
      className="bg-[var(--bg-section)]"
    >
      <div className="mx-auto max-w-[1340px] px-5 md:px-10 lg:px-14 py-16 md:py-24 lg:py-28">
        <SectionHead
          leading="Beary"
          accent="Sweet"
          nowrap
          description="Signature sundaes & toasted marshmallows — cold, layered, sticky. Drag the polaroids; they bounce back home."
        />

        {/* < xl — 2 × 2 grid (two per row). Draggable. */}
        <div className="xl:hidden grid grid-cols-2 justify-items-center gap-4 md:gap-8 py-6 md:py-10">
          {desserts.map((item, i) => (
            <PolaroidCard
              key={item.name}
              name={item.name}
              description={item.description}
              price={item.price}
              tilt={reduce ? 0 : (STACK_TILTS[i] ?? 0)}
              img={MENU_IMAGES[item.name]}
              index={i}
              tags={item.tags}
            />
          ))}
        </div>

        {/* xl+ — centred row of four with raised inner photos. */}
        <div className="hidden xl:flex justify-center items-start gap-6 2xl:gap-10 py-12">
          {desserts.map((item, i) => (
            <div key={item.name} className={ROW_NUDGES[i]}>
              <PolaroidCard
                name={item.name}
                description={item.description}
                price={item.price}
                tilt={reduce ? 0 : (ROW_TILTS[i] ?? 0)}
                img={MENU_IMAGES[item.name]}
                index={i}
                tags={item.tags}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
