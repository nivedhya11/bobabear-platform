import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-800 border-neutral-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200",
  info: "bg-sky-50 text-sky-900 border-sky-200",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: Readonly<{
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
