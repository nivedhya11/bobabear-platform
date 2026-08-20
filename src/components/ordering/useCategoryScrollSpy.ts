"use client";

import { useEffect, useMemo, useState } from "react";

export type UseCategoryScrollSpyOptions = Readonly<{
  sectionIds: readonly string[];
  enabled?: boolean;
  /** CSS rootMargin accounting for sticky Nav + optional sticky category bar. */
  rootMargin?: string;
}>;

export type UseCategoryScrollSpyResult = Readonly<{
  activeSectionId: string | null;
}>;

/**
 * IntersectionObserver-based category spy. Updates active root category from
 * which Menu section is in view — no scroll-event polling.
 */
export function useCategoryScrollSpy(
  options: UseCategoryScrollSpyOptions,
): UseCategoryScrollSpyResult {
  const { sectionIds, enabled = true, rootMargin = "-25% 0px -55% 0px" } = options;
  const sectionKey = sectionIds.join("\0");
  const stableSectionIds = useMemo(
    () => sectionIds.slice(),
    // sectionKey is the intentional content identity for sectionIds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionKey],
  );
  const [observedSectionId, setObservedSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || stableSectionIds.length === 0) return;
    if (typeof IntersectionObserver === "undefined") return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio);
          } else {
            visible.delete(id);
          }
        }

        if (visible.size === 0) return;

        let bestId: string | null = null;
        let bestRatio = -1;
        for (const id of stableSectionIds) {
          const ratio = visible.get(id);
          if (ratio !== undefined && ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setObservedSectionId(bestId);
      },
      { root: null, rootMargin, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const id of stableSectionIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin, stableSectionIds]);

  const activeSectionId =
    observedSectionId && stableSectionIds.includes(observedSectionId)
      ? observedSectionId
      : (stableSectionIds[0] ?? null);

  return { activeSectionId };
}
