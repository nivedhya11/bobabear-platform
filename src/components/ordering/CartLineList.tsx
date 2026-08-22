"use client";

import { Button } from "@/components/ui/Button";
import {
  formatModifierPriceDelta,
  STALE_MODIFIER_OPTION_LABEL,
  type CartLinePresentation,
} from "@/components/ordering/cart-presentation";
import { formatPaise } from "@/components/ordering/format-money";

const QTY_BUTTON_CLASS = "min-h-[44px] min-w-[44px]";

export type CartLineListProps = Readonly<{
  lines: readonly CartLinePresentation[];
  pending?: boolean;
  compact?: boolean;
  onChangeQuantity: (lineId: string, quantity: number) => void;
  onEdit?: (lineId: string) => void;
  onRemove?: (lineId: string) => void;
}>;

/**
 * Presentation-only Cart line list. Mutations stay with the parent controller.
 */
export function CartLineList(props: CartLineListProps) {
  const { lines, pending = false, compact = false, onChangeQuantity, onEdit, onRemove } =
    props;

  if (lines.length === 0) {
    return (
      <p className="font-body text-[14px] text-[var(--text-secondary)]">Your cart is empty.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" role="list">
      {lines.map((presentation) => (
        <li
          key={presentation.lineId}
          className={
            compact
              ? "border-b border-[var(--border-default)] pb-3 last:border-b-0 last:pb-0"
              : "border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex flex-col gap-3"
          }
        >
          <div className="flex items-start gap-3">
            {presentation.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={presentation.imagePath}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="h-16 w-16 shrink-0 object-cover"
              />
            ) : (
              <div aria-hidden="true" className="h-16 w-16 shrink-0 bg-[var(--bg-page)] border border-[var(--border-default)]" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  compact
                    ? "font-body font-bold text-[14px] leading-tight text-[var(--text-primary)]"
                    : "font-display text-[20px] text-[var(--text-primary)]"
                }
              >
                {presentation.itemName}
              </p>
              {presentation.fullyResolvable ? (
                <p className="font-body text-[13px] text-[var(--text-tertiary)]">
                  {formatPaise(presentation.unitPricePaise)} each
                </p>
              ) : null}
              {presentation.modifiers.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5" role="list">
                  {presentation.modifiers.map((modifier) => (
                    <li
                      key={`${modifier.variantModifierGroupId}:${modifier.modifierGroupOptionId}`}
                      className="font-body text-[12px] text-[var(--text-secondary)]"
                    >
                      {modifier.stale ? (
                        <span>
                          {STALE_MODIFIER_OPTION_LABEL}
                          {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                        </span>
                      ) : (
                        <>
                          {modifier.groupName ? (
                            <span className="block text-[var(--text-tertiary)]">
                              {modifier.groupName}
                            </span>
                          ) : null}
                          <span className="flex items-center justify-between gap-2">
                            <span>
                              {modifier.optionName}
                              {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                            </span>
                            {modifier.displayPriceDeltaPaise !== null &&
                            modifier.displayPriceDeltaPaise !== 0 ? (
                              <span>
                                {formatModifierPriceDelta(
                                  modifier.displayPriceDeltaPaise * modifier.quantity,
                                )}
                              </span>
                            ) : null}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {presentation.hasBundleSelections ? (
                <p className="mt-2 font-body text-[12px] text-[var(--text-tertiary)]">
                  Bundle configuration preserved — component details appear at checkout.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {presentation.fullyResolvable ? (
                <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">
                  {formatPaise(presentation.lineTotalPaise)}
                </p>
              ) : null}
              <div className="inline-flex items-stretch overflow-hidden rounded-md border border-[var(--border-default)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${QTY_BUTTON_CLASS} rounded-none border-0 text-[var(--text-secondary)]`}
                  disabled={pending}
                  aria-label={`Decrease ${presentation.itemName} quantity`}
                  onClick={() => onChangeQuantity(presentation.lineId, presentation.quantity - 1)}
                >
                  −
                </Button>
                <span
                  className="flex min-w-[2.5rem] items-center justify-center border-x border-[var(--border-default)] px-2 font-mono text-[13px] text-center"
                  aria-live="polite"
                >
                  {presentation.quantity}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={`${QTY_BUTTON_CLASS} rounded-none border-0`}
                  disabled={pending}
                  aria-label={`Increase ${presentation.itemName} quantity`}
                  onClick={() => onChangeQuantity(presentation.lineId, presentation.quantity + 1)}
                >
                  +
                </Button>
                {onRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    disabled={pending}
                    aria-label={`Remove ${presentation.itemName} from cart`}
                    onClick={() => onRemove(presentation.lineId)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {presentation.editEligible && onEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={pending}
                  aria-label={`Edit customization for ${presentation.itemName}`}
                  onClick={() => onEdit(presentation.lineId)}
                >
                  Edit
                </Button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
