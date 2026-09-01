/**
 * Waits until a map mount target has non-zero layout dimensions (IMP-036B UAT).
 */
export async function waitForMapContainerReady(
  container: HTMLElement,
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) return false;

  const hasDimensions = (): boolean => {
    if (container.offsetWidth > 0 && container.offsetHeight > 0) return true;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      const parent = container.parentElement;
      if (parent) {
        const parentStyle = window.getComputedStyle(parent);
        const minHeight = Number.parseFloat(parentStyle.minHeight);
        if (Number.isFinite(minHeight) && minHeight > 0) {
          return true;
        }
        if (parent.offsetWidth > 0 && parent.offsetHeight > 0) {
          return true;
        }
      }
      return false;
    }
    const style = window.getComputedStyle(container);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    return true;
  };

  if (hasDimensions()) return true;

  return new Promise<boolean>((resolve) => {
    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const finish = (ready: boolean): void => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      signal?.removeEventListener("abort", onAbort);
      resolve(ready);
    };

    const onAbort = (): void => finish(false);
    signal?.addEventListener("abort", onAbort, { once: true });

    const tick = (): void => {
      if (signal?.aborted) {
        finish(false);
        return;
      }
      if (hasDimensions()) {
        finish(true);
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (hasDimensions()) finish(true);
          })
        : null;
    observer?.observe(container);
    tick();
  });
}
