import { cn } from "@/lib/utils";

import { enterprisePanelClass } from "./enterprise-tokens";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE_CLASS: Record<AlertTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
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
      {title ? <p className="mb-1 text-sm font-semibold">{title}</p> : null}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
