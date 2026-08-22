"use client";

import { Trash } from "@/components/icons";
import { QuantityStepper } from "@/components/ordering/QuantityStepper";
import {
  formatModifierPriceDelta,
  STALE_MODIFIER_OPTION_LABEL,
  type CartLinePresentation,
} from "@/components/ordering/cart-presentation";
import { formatPaise } from "@/components/ordering/format-money";

const ORANGE_LINK =
  "font-body text-[13px] font-semibold text-[var(--interactive-secondary)] underline-offset-2 hover:underline focus-ring";

export type CartLineListProps = Readonly<{
  lines: readonly CartLinePresentation[];
  pending?: boolean;
  compact?: boolean;
  onChangeQuantity: (lineId: string, quantity: number) => void;
  onEdit?: (lineId: string) => void;
  onRemove?: (lineId: string) => void;
}>;

function ModifierSummary(props: { presentation: CartLinePresentation; compact?: boolean }) {
  const { presentation, compact = false } = props;

  return (
    <>
      {presentation.modifiers.length > 0 ? (
        <ul className={compact ? "mt-0.5 flex flex-col gap-0.5" : "mt-1 flex flex-col gap-0.5"} role="list">
          {presentation.modifiers.map((modifier) => (
            <li
              key={`${modifier.variantModifierGroupId}:${modifier.modifierGroupOptionId}`}
              className="font-body text-[12px] leading-snug text-[var(--text-secondary)]"
            >
              {modifier.stale ? (
                <span>
                  {STALE_MODIFIER_OPTION_LABEL}
                  {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                </span>
              ) : (
                <>
                  {modifier.groupName ? (
                    <span className="text-[var(--text-tertiary)]">{modifier.groupName}</span>
                  ) : null}
                  {modifier.groupName && modifier.optionName ? (
                    <span className="text-[var(--text-tertiary)]"> / </span>
                  ) : null}
                  <span>
                    {modifier.optionName}
                    {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                    {modifier.displayPriceDeltaPaise !== null &&
                    modifier.displayPriceDeltaPaise !== 0 ? (
                      <span className="ml-1">
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
        <p className={compact ? "mt-1 font-body text-[12px] text-[var(--text-tertiary)]" : "mt-1.5 font-body text-[12px] text-[var(--text-tertiary)]"}>
          Bundle configuration preserved — component details appear at checkout.
        </p>
      ) : null}
    </>
  );
}

function RemoveButton(props: {
  itemName: string;
  pending: boolean;
  onRemove: () => void;
  className?: string;
}) {
  const { itemName, pending, onRemove, className } = props;
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${itemName} from cart`}
      onClick={onRemove}
      className={
        className ??
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring"
      }
    >
      <Trash size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

/**
 * Presentation-only Cart line list. Mutations stay with the parent controller.
 */
export function CartLineList(props: CartLineListProps) {
  const { lines, pending = false, compact = false, onChangeQuantity, onEdit, onRemove } = props;

  if (lines.length === 0) {
    return (
      <p className="font-body text-[14px] text-[var(--text-secondary)]">Your cart is empty.</p>
    );
  }

  return (
    <ul className={compact ? "flex flex-col" : "flex flex-col gap-3"} role="list">
      {lines.map((presentation) => (
        <li
          key={presentation.lineId}
          className={
            compact
              ? "border-b border-[var(--border-default)] py-3 first:pt-0 last:border-b-0 last:pb-0"
              : "rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.14)] sm:p-3.5"
          }
        >
          <div className="flex items-start gap-2.5 sm:gap-3">
            {presentation.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={presentation.imagePath}
                alt=""
                width={compact ? 56 : 72}
                height={compact ? 56 : 72}
                loading="lazy"
                decoding="async"
                className={
                  compact
                    ? "h-14 w-14 shrink-0 rounded-lg object-cover bg-[var(--bg-surface-sunken)]"
                    : "h-[72px] w-[72px] shrink-0 rounded-lg object-cover bg-[var(--bg-surface-sunken)] sm:h-16 sm:w-16"
                }
              />
            ) : (
              <div
                aria-hidden="true"
                className={
                  compact
                    ? "h-14 w-14 shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-sunken)]"
                    : "h-[72px] w-[72px] shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-sunken)] sm:h-16 sm:w-16"
                }
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={
                    compact
                      ? "font-body text-[14px] font-bold leading-tight text-[var(--text-primary)]"
                      : "font-body text-[15px] font-bold leading-tight text-[var(--text-primary)] sm:text-[16px]"
                  }
                >
                  {presentation.itemName}
                </p>
                {presentation.fullyResolvable ? (
                  <p className="shrink-0 font-body text-[14px] font-semibold text-[var(--text-primary)]">
                    {formatPaise(presentation.lineTotalPaise)}
                  </p>
                ) : null}
              </div>

              {!compact && presentation.fullyResolvable ? (
                <p className="mt-0.5 font-body text-[12px] text-[var(--text-tertiary)]">
                  {formatPaise(presentation.unitPricePaise)} each
                </p>
              ) : null}

              <div className="mt-0.5">
                <ModifierSummary presentation={presentation} compact={compact} />
              </div>

              {!compact && presentation.editEligible && onEdit ? (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Edit customization for ${presentation.itemName}`}
                  onClick={() => onEdit(presentation.lineId)}
                  className={`${ORANGE_LINK} mt-1`}
                >
                  Edit
                </button>
              ) : null}

              <div
                className={
                  compact
                    ? "mt-1 flex items-end justify-between gap-2"
                    : "mt-1.5 flex items-center justify-between gap-3 sm:mt-1"
                }
              >
                <div className="min-w-0 flex items-center gap-2">
                  {compact && presentation.editEligible && onEdit ? (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Edit customization for ${presentation.itemName}`}
                      onClick={() => onEdit(presentation.lineId)}
                      className={ORANGE_LINK}
                    >
                      Edit
                    </button>
                  ) : null}
                  {!compact && onRemove ? (
                    <RemoveButton
                      itemName={presentation.itemName}
                      pending={pending}
                      onRemove={() => onRemove(presentation.lineId)}
                    />
                  ) : null}
                </div>
                <QuantityStepper
                  quantity={presentation.quantity}
                  disabled={pending}
                  ariaLabel={`${presentation.itemName} quantity ${presentation.quantity}`}
                  decrementLabel={`Decrease ${presentation.itemName} quantity`}
                  incrementLabel={`Increase ${presentation.itemName} quantity`}
                  onDecrement={() =>
                    onChangeQuantity(presentation.lineId, presentation.quantity - 1)
                  }
                  onIncrement={() =>
                    onChangeQuantity(presentation.lineId, presentation.quantity + 1)
                  }
                />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
