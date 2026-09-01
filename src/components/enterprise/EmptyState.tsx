import { enterprisePanelClass } from "./enterprise-tokens";

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}>) {
  return (
    <section className={`${enterprisePanelClass} px-6 py-10 text-center`} aria-labelledby="empty-state-title">
      <h2 id="empty-state-title" className="text-lg font-semibold text-[var(--enterprise-text-primary,#1a2210)]">
        {title}
      </h2>
      {description ? <p className="mt-2 text-sm text-[var(--enterprise-text-secondary,#4b5542)]">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
