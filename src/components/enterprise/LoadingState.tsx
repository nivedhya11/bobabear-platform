export function LoadingState({ label = "Loading…" }: Readonly<{ label?: string }>) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="enterprise-loading-state"
      className="flex items-center gap-3 text-sm text-[var(--enterprise-text-secondary,#4b5542)]"
    >
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--enterprise-border,#d8ddd0)] border-t-[var(--enterprise-focus,#4a6741)] motion-reduce:animate-none"
      />
      {label}
    </div>
  );
}
