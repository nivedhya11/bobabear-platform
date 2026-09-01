import { describe, expect, it, vi } from "vitest";

import { waitForMapContainerReady } from "@/lib/customer-location/map-container-ready";

describe("waitForMapContainerReady", () => {
  it("resolves when the container has non-zero dimensions", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(container, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 320,
        height: 240,
        top: 0,
        left: 0,
        right: 320,
        bottom: 240,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      display: "block",
      visibility: "visible",
      opacity: "1",
    } as CSSStyleDeclaration);

    await expect(waitForMapContainerReady(container)).resolves.toBe(true);
    container.remove();
  });

  it("resolves false when aborted before layout settles", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(container, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      display: "block",
      visibility: "visible",
      opacity: "1",
    } as CSSStyleDeclaration);

    const controller = new AbortController();
    const promise = waitForMapContainerReady(container, controller.signal);
    controller.abort();
    await expect(promise).resolves.toBe(false);
    container.remove();
  });
});
