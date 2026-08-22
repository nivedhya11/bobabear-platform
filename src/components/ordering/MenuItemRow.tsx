"use client";

import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ordering/QuantityStepper";
import { formatPaise } from "@/components/ordering/format-money";
import type { CustomerMenuItem } from "@/shared/customer-menu/types";

export type MenuItemRowProps = Readonly<{
  item: CustomerMenuItem;
  layout?: "card" | "row" | "responsive";
  busy?: boolean;
  quantity?: number;
  onAdd: (item: CustomerMenuItem) => void;
  onDecrement?: (item: CustomerMenuItem) => void;
  onCustomize: (item: CustomerMenuItem) => void;
}>;

/**
 * Presentation-only Menu item. Does not fetch Menu or mutate Cart.
 */
export function MenuItemRow(props: MenuItemRowProps) {
  const { item, layout = "responsive", busy = false, quantity = 0, onAdd, onCustomize, onDecrement } =
    props;
  const customizable = (item.modifierGroups?.length ?? 0) > 0;
  const isRow = layout === "row";
  const isResponsive = layout === "responsive";

  return (
    <li
      className={
        isRow
          ? "flex items-start gap-3 border-b border-[var(--border-default)] py-3"
          : isResponsive
            ? "flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.16)] xl:flex-col xl:gap-3 xl:h-full"
            : "flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
      }
    >
      {item.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imagePath}
          alt=""
          width={112}
          height={112}
          loading="lazy"
          decoding="async"
          className={
            isRow
              ? "h-[104px] w-[104px] shrink-0 rounded-lg object-cover aspect-square bg-[var(--bg-surface-sunken)]"
              : isResponsive
                ? "h-[104px] w-[104px] shrink-0 rounded-lg object-cover aspect-square bg-[var(--bg-surface-sunken)] xl:h-auto xl:w-full xl:aspect-[4/3]"
                : "w-full aspect-[4/3] shrink-0 rounded-lg object-cover bg-[var(--bg-surface-sunken)]"
          }
        />
      ) : (
        <div
          aria-hidden="true"
          className={
            isRow
              ? "h-[104px] w-[104px] shrink-0 rounded-lg aspect-square border border-[var(--border-default)] bg-[var(--bg-surface-sunken)]"
              : isResponsive
                ? "h-[104px] w-[104px] shrink-0 rounded-lg aspect-square border border-[var(--border-default)] bg-[var(--bg-surface-sunken)] xl:h-auto xl:w-full xl:aspect-[4/3]"
                : "w-full aspect-[4/3] shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-sunken)]"
          }
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-body text-[16px] font-bold leading-tight text-[var(--text-primary)] line-clamp-2">
            {item.name}
          </h4>
          <span className="shrink-0 font-body text-[14px] font-bold text-[var(--interactive-secondary)]">
            {formatPaise(item.displayPricePaise)}
          </span>
        </div>
        {item.description ? (
          <p className="font-body text-[13px] text-[var(--text-secondary)] line-clamp-2">
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-end gap-2 xl:justify-between">
          {quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              disabled={busy}
              ariaLabel={`${item.name} quantity ${quantity}`}
              decrementLabel={`Remove one ${item.name}`}
              incrementLabel={`Add one ${item.name}`}
              onDecrement={() => onDecrement?.(item)}
              onIncrement={() => (customizable ? onCustomize(item) : onAdd(item))}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-[44px] min-w-[7.5rem] rounded-lg"
              disabled={busy}
              aria-label={`Add ${item.name}`}
              onClick={() => (customizable ? onCustomize(item) : onAdd(item))}
            >
              {busy ? "Adding…" : "Add +"}
            </Button>
          )}
          {customizable ? (
            <span className="hidden font-body text-[12px] font-semibold text-[var(--interactive-primary)] xl:inline">
              Customisable
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
