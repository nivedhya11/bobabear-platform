import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryScrollSpy } from "./useCategoryScrollSpy";

type ObserverCallback = IntersectionObserverCallback;

let latestCallback: ObserverCallback | null = null;
let observedElements: Element[] = [];

class MockIntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    latestCallback = callback;
    this.root = (options?.root as Element | Document | null) ?? null;
    this.rootMargin = options?.rootMargin ?? "";
    const threshold = options?.threshold;
    this.thresholds = Array.isArray(threshold)
      ? threshold
      : [typeof threshold === "number" ? threshold : 0];
  }

  observe(element: Element): void {
    observedElements.push(element);
  }

  unobserve(element: Element): void {
    observedElements = observedElements.filter((entry) => entry !== element);
  }

  disconnect(): void {
    observedElements = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function fireIntersecting(ids: string[]): void {
  if (!latestCallback) throw new Error("IntersectionObserver callback missing");
  const entries = ids.map((id) => {
    const target = document.getElementById(id);
    if (!target) throw new Error(`Missing section ${id}`);
    return {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: 0,
    } satisfies IntersectionObserverEntry;
  });
  act(() => {
    latestCallback!(entries, {} as IntersectionObserver);
  });
}

describe("useCategoryScrollSpy", () => {
  beforeEach(() => {
    latestCallback = null;
    observedElements = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    document.body.innerHTML = `
      <section id="cat-a"></section>
      <section id="cat-b"></section>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("updates active category from IntersectionObserver events", () => {
    const { result } = renderHook(() =>
      useCategoryScrollSpy({
        sectionIds: ["cat-a", "cat-b"],
        enabled: true,
      }),
    );

    expect(observedElements.map((el) => el.id)).toEqual(["cat-a", "cat-b"]);
    expect(result.current.activeSectionId).toBe("cat-a");

    fireIntersecting(["cat-b"]);
    expect(result.current.activeSectionId).toBe("cat-b");

    fireIntersecting(["cat-a"]);
    expect(result.current.activeSectionId).toBe("cat-a");
  });
});
