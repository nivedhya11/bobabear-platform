"use client";

import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/components/ordering/format-money";
import type { CustomerMenuItem } from "@/shared/customer-menu/types";

export type MenuItemRowProps = Readonly<{
  item: CustomerMenuItem;
  layout?: "card" | "row";
  busy?: boolean;
  onAdd: (item: CustomerMenuItem) => void;
  onCustomize: (item: CustomerMenuItem) => void;
}>;

/**
 * Presentation-only Menu item. Does not fetch Menu or mutate Cart.
 */
export function MenuItemRow(props: MenuItemRowProps) {
  const { item, layout = "card", busy = false, onAdd, onCustomize } = props;
  const customizable = (item.modifierGroups?.length ?? 0) > 0;
  const isRow = layout === "row";

  return (
    <li
      className={
        isRow
          ? "border-b border-[var(--border-default)] py-3 flex gap-4 items-start"
          : "overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-section)] p-3 flex flex-col gap-3 h-full"
      }
    >
      {item.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imagePath}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className={
            isRow
              ? "h-16 w-16 object-cover shrink-0 aspect-square"
              : "w-full aspect-[4/3] md:max-xl:aspect-[5/3] object-cover shrink-0"
          }
        />
      ) : (
        <div
          aria-hidden="true"
          className={
            isRow
              ? "h-16 w-16 shrink-0 aspect-square bg-[var(--bg-page)] border border-[var(--border-default)]"
              : "w-full aspect-[4/3] md:max-xl:aspect-[5/3] shrink-0 bg-[var(--bg-page)] border border-[var(--border-default)]"
          }
        />
      )}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h4
            className={
              isRow
                ? "font-body font-bold text-[16px] leading-tight text-[var(--text-primary)]"
                : "font-body font-bold text-[16px] leading-tight text-[var(--text-primary)] line-clamp-2"
            }
          >
            {item.name}
          </h4>
          <span className="font-body font-bold text-[14px] text-[var(--interactive-secondary)] shrink-0">
            {formatPaise(item.displayPricePaise)}
          </span>
        </div>
        {item.description ? (
          <p
            className={
              isRow
                ? "font-heading text-[12px] text-[var(--text-secondary)] line-clamp-1"
                : "font-body text-[13px] text-[var(--text-secondary)] line-clamp-2"
            }
          >
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-[44px] w-full"
            disabled={busy}
            aria-label={`Add ${item.name}`}
            onClick={() => (customizable ? onCustomize(item) : onAdd(item))}
          >
            {busy ? "Adding…" : "Add +"}
          </Button>
          {customizable ? <span className="text-center font-body text-[12px] font-semibold text-[var(--interactive-primary-pressed)]">Customisable</span> : null}
        </div>
      </div>
    </li>
  );
}
