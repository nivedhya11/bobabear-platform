"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Subscribe to the `light` class on <html> via MutationObserver so the toggle
// reflects the DOM without a setState-in-effect, and SSR always defaults to
// dark. Mirrors the production Nav theme store.
function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const getThemeSnapshot = () => document.documentElement.classList.contains("light");
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const isLight = React.useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  function toggle() {
    document.documentElement.classList.toggle("light", !isLight);
  }

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 h-8",
        "font-body text-body-sm font-semibold",
        "bg-transparent text-primary border border-border-strong",
        "hover:border-interactive-primary hover:text-interactive-primary",
        "transition-[border-color,color] duration-[150ms] ease-out",
        "cursor-pointer focus-ring",
        className,
      )}
    >
      <span aria-hidden>{isLight ? "🌙" : "☀️"}</span>
      {isLight ? "Dark" : "Light"}
    </button>
  );
}
