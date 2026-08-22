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

function ModifierSummary(props: { presentation: CartLinePresentation }) {
  const { presentation } = props;

  return (
    <>
      {presentation.modifiers.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1" role="list">
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
                    <span className="block text-[var(--text-tertiary)]">{modifier.groupName}</span>
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
    </>
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
    <ul className="flex flex-col gap-3" role="list">
      {lines.map((presentation) => (
        <li
          key={presentation.lineId}
          className={
            compact
              ? "border-b border-[var(--border-default)] pb-4 last:border-b-0 last:pb-0"
              : "flex flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
          }
        >
          <div className="flex items-start gap-3">
            {presentation.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={presentation.imagePath}
                alt=""
                width={72}
                height={72}
                loading="lazy"
                decoding="async"
                className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover bg-[var(--bg-surface-sunken)] sm:h-16 sm:w-16"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-[72px] w-[72px] shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-sunken)] sm:h-16 sm:w-16"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={
                    compact
                      ? "font-body text-[14px] font-bold leading-tight text-[var(--text-primary)]"
                      : "font-body text-[16px] font-bold leading-tight text-[var(--text-primary)]"
                  }
                >
                  {presentation.itemName}
                </p>
                <div className="flex shrink-0 items-start gap-2">
                  {presentation.fullyResolvable ? (
                    <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">
                      {formatPaise(presentation.lineTotalPaise)}
                    </p>
                  ) : null}
                </div>
              </div>

              {!compact && presentation.fullyResolvable ? (
                <p className="mt-0.5 font-body text-[12px] text-[var(--text-tertiary)]">
                  {formatPaise(presentation.unitPricePaise)} each
                </p>
              ) : null}

              <ModifierSummary presentation={presentation} />

              {presentation.editEligible && onEdit ? (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Edit customization for ${presentation.itemName}`}
                  onClick={() => onEdit(presentation.lineId)}
                  className={`${ORANGE_LINK} mt-2`}
                >
                  Edit
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={
              compact
                ? "flex justify-end pt-1"
                : "flex items-center justify-between gap-3 border-t border-[var(--border-default)] pt-3"
            }
          >
            {!compact && onRemove ? (
              <button
                type="button"
                disabled={pending}
                aria-label={`Remove ${presentation.itemName} from cart`}
                onClick={() => onRemove(presentation.lineId)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring"
              >
                <Trash size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
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
              className={compact ? undefined : "ml-auto"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
