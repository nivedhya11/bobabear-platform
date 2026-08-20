"use client";

import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/components/ordering/format-money";
import type { CustomerMenuItem } from "@/shared/customer-menu/types";

const QTY_BUTTON_CLASS = "min-h-[44px] min-w-[44px] xl:min-h-8 xl:min-w-8";

export type MenuItemRowProps = Readonly<{
  item: CustomerMenuItem;
  layout?: "card" | "row";
  quantityInCart?: number;
  busy?: boolean;
  onAdd: (item: CustomerMenuItem) => void;
  onDecrement: (item: CustomerMenuItem) => void;
  onCustomize: (item: CustomerMenuItem) => void;
}>;

/**
 * Presentation-only Menu item. Does not fetch Menu or mutate Cart.
 */
export function MenuItemRow(props: MenuItemRowProps) {
  const {
    item,
    layout = "card",
    quantityInCart,
    busy = false,
    onAdd,
    onDecrement,
    onCustomize,
  } = props;
  const customizable = (item.modifierGroups?.length ?? 0) > 0;
  const isRow = layout === "row";

  return (
    <li
      className={
        isRow
          ? "border-b border-[var(--border-default)] py-3 flex gap-4 items-start"
          : "border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex gap-4"
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
              : "h-20 w-20 object-cover shrink-0 aspect-square"
          }
        />
      ) : (
        <div
          aria-hidden="true"
          className={
            isRow
              ? "h-16 w-16 shrink-0 aspect-square bg-[var(--bg-page)] border border-[var(--border-default)]"
              : "h-20 w-20 shrink-0 aspect-square bg-[var(--bg-page)] border border-[var(--border-default)]"
          }
        />
      )}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h4
            className={
              isRow
                ? "font-display text-[18px] leading-tight text-[var(--text-primary)]"
                : "font-display text-[20px] leading-tight text-[var(--text-primary)]"
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
                : "font-heading text-[13px] text-[var(--text-secondary)] line-clamp-2"
            }
          >
            {item.description}
          </p>
        ) : null}
        {customizable ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start mt-auto min-h-[44px] xl:min-h-8"
            disabled={busy}
            aria-label={`Customize ${item.name}`}
            onClick={() => onCustomize(item)}
          >
            Customize
          </Button>
        ) : quantityInCart ? (
          <div className="flex items-center gap-2 mt-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={QTY_BUTTON_CLASS}
              disabled={busy}
              aria-label={`Decrease ${item.name} quantity`}
              onClick={() => onDecrement(item)}
            >
              −
            </Button>
            <span
              className="font-mono text-[13px] min-w-[1.5rem] text-center"
              aria-live="polite"
              aria-atomic="true"
            >
              {quantityInCart}
              <span className="sr-only"> {item.name} in cart</span>
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={QTY_BUTTON_CLASS}
              disabled={busy}
              aria-label={`Increase ${item.name} quantity`}
              onClick={() => onAdd(item)}
            >
              +
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start mt-auto min-h-[44px] xl:min-h-8"
            disabled={busy}
            aria-label={`Add ${item.name} to cart`}
            onClick={() => onAdd(item)}
          >
            {busy ? "Adding…" : "Add to cart"}
          </Button>
        )}
      </div>
    </li>
  );
}
