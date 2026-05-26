import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our @theme type-scale classes (text-body-md, text-h1, etc.) are unknown to
// tailwind-merge by default, so it groups them with text-color utilities and
// removes whichever appears first in a cn() call. Registering them as
// font-size keeps them in a separate group so they coexist with color classes.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display-2xl",
        "text-display-xl",
        "text-display-lg",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-h5",
        "text-body-lg",
        "text-body-md",
        "text-body-sm",
        "text-body-xs",
        "text-label-lg",
        "text-label-md",
        "text-label-sm",
        "text-caption-md",
        "text-caption-sm",
        "text-code-md",
        "text-code-sm",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
