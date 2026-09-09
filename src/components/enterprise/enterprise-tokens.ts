/** Shared Tailwind class bundles for enterprise surfaces (IMP-036A / IMP-036E).
 *  Fallbacks match the dark-only Night Forest enterprise tokens in globals.css.
 */

export const enterpriseSurfaceClass =
  "min-h-full bg-[var(--enterprise-bg-page,#1A2210)] text-[var(--enterprise-text-primary,#FAF3E2)]";

export const enterprisePanelClass =
  "rounded-lg border border-[var(--enterprise-border,#3D6026)] bg-[var(--enterprise-bg-panel,#22361A)] shadow-sm";

export const enterpriseFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]";

/** Shared control chrome for Store Operations forms/selects on dark surfaces. */
export const enterpriseFieldClass =
  "min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)] disabled:cursor-not-allowed disabled:opacity-60";
