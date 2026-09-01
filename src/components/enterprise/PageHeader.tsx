import { cn } from "@/lib/utils";

import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: Readonly<{
  title: string;
  description?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}>) {
  return (
    <header className={cn("mb-6 space-y-3", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--enterprise-text-primary,#1a2210)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--enterprise-text-secondary,#4b5542)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
