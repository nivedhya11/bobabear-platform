export function LoadingState({ label = "Loading…" }: Readonly<{ label?: string }>) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="enterprise-loading-state"
      className="flex items-center gap-3 text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]"
    >
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--enterprise-border,#3D6026)] border-t-[var(--enterprise-focus,#A8D832)] motion-reduce:animate-none"
      />
      {label}
    </div>
  );
}
