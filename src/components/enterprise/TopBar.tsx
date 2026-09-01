"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { enterpriseFocusRingClass } from "./enterprise-tokens";

export function TopBar({
  productLabel,
  contextLabel,
  workforceUserId,
  onSignOut,
  onOpenNavigation,
  showMenuButton,
  secondaryAction,
}: Readonly<{
  productLabel: string;
  contextLabel?: string;
  workforceUserId?: string;
  onSignOut?: () => void;
  onOpenNavigation?: () => void;
  showMenuButton?: boolean;
  secondaryAction?: React.ReactNode;
}>) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--enterprise-border,#d8ddd0)] bg-[var(--enterprise-bg-panel,#ffffff)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {showMenuButton ? (
          <button
            type="button"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--enterprise-border,#d8ddd0)] lg:hidden",
              enterpriseFocusRingClass,
            )}
            aria-label="Open navigation"
            onClick={onOpenNavigation}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ☰
            </span>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--enterprise-text-primary,#1a2210)]">
            {productLabel}
          </p>
          {contextLabel ? (
            <p className="truncate text-xs text-[var(--enterprise-text-secondary,#4b5542)]">{contextLabel}</p>
          ) : null}
        </div>
        {secondaryAction}
        {workforceUserId ? (
          <p className="hidden text-xs text-[var(--enterprise-text-secondary,#4b5542)] sm:block" title={workforceUserId}>
            {workforceUserId}
          </p>
        ) : null}
        {onSignOut ? (
          <Button type="button" variant="secondary" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>
    </header>
  );
}
