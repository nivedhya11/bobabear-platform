import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// `globals: false` (vitest.config.mts) means React Testing Library's
// auto-cleanup — which detects a global `afterEach` — never registers.
// Unmount every rendered tree after each test explicitly instead, so
// component tests stay isolated regardless of run order.
afterEach(() => {
  cleanup();
});

/**
 * Minimal, deterministic browser API stubs.
 *
 * Only added because current components actually call these APIs during
 * render (see `grep -r matchMedia|IntersectionObserver src/`):
 *   - Framer Motion's `useReducedMotion()` (used by Reveal/RevealStagger/
 *     RevealChild, AccessCTA, Hero, Artists, PolaroidCard, ThePlates, TheBar,
 *     TheSweet, SignatureDrops, StaggerWords) reads `window.matchMedia`.
 *   - `Nav`'s scrollspy effect constructs an `IntersectionObserver`.
 *
 * `matchMedia` is forced to report `prefers-reduced-motion: reduce` so
 * Framer Motion components render their plain, motion-free final state in
 * tests — deterministic output with no animation timing to wait on, and no
 * dependency on jsdom's absent IntersectionObserver for `whileInView`.
 *
 * These are plain functions/classes (not `vi.fn()`), so Vitest's
 * `restoreMocks` / `clearMocks` / `mockReset` (enabled globally in
 * vitest.config.mts) cannot reset them away between tests.
 */

if (!window.matchMedia) {
  window.matchMedia = () => {
    return {
      matches: true, // prefers-reduced-motion: reduce → deterministic renders
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}

if (!("IntersectionObserver" in window)) {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  // @ts-expect-error - jsdom has no IntersectionObserver implementation
  window.IntersectionObserver = NoopIntersectionObserver;
}

