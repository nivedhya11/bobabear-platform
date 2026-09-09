import { cn } from "@/lib/utils";

import { enterprisePanelClass } from "./enterprise-tokens";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE_CLASS: Record<AlertTone, string> = {
  info: "border-sky-500/50 bg-sky-950/50 text-sky-100",
  success: "border-emerald-500/50 bg-emerald-950/40 text-emerald-100",
  warning: "border-amber-500/50 bg-amber-950/40 text-amber-100",
  danger: "border-rose-500/50 bg-rose-950/45 text-rose-100",
};

const TONE_LABEL: Record<AlertTone, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

export function Alert({
  title,
  children,
  tone = "info",
  className,
}: Readonly<{
  title?: string;
  children: React.ReactNode;
  tone?: AlertTone;
  className?: string;
}>) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(enterprisePanelClass, "px-4 py-3", TONE_CLASS[tone], className)}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-90">{TONE_LABEL[tone]}</p>
      {title ? <p className="mb-1 text-sm font-semibold">{title}</p> : null}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
