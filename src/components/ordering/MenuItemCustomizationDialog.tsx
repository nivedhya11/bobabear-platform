"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/components/ordering/format-money";
import type { CartModifierSelectionInput } from "@/shared/cart/types";
import type { CustomerMenuItem, CustomerMenuModifierGroup } from "@/shared/customer-menu/types";

export type CustomizationDialogMode = "add" | "edit";

type Quantities = Record<string, number>;

function selectionKey(groupId: string, optionId: string): string {
  return `${groupId}:${optionId}`;
}

function initialQuantitiesForAdd(item: CustomerMenuItem): Quantities {
  const quantities: Quantities = {};
  for (const group of item.modifierGroups ?? []) {
    let groupTotal = 0;
    for (const option of group.options) {
      if (option.displayPriceDeltaPaise > 0) continue;
      const quantity = Math.min(
        option.defaultQuantity,
        option.maxQuantity,
        group.maxTotalQuantity - groupTotal,
      );
      if (quantity > 0) {
        quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] =
          quantity;
        groupTotal += quantity;
      }
    }
  }
  return quantities;
}

function initialQuantitiesForEdit(
  modifiers: readonly CartModifierSelectionInput[],
): Quantities {
  const quantities: Quantities = {};
  for (const modifier of modifiers) {
    quantities[
      selectionKey(modifier.variantModifierGroupId, modifier.modifierGroupOptionId)
    ] = modifier.quantity;
  }
  return quantities;
}

function resolveInitialQuantities(
  mode: CustomizationDialogMode,
  item: CustomerMenuItem,
  initialModifiers?: readonly CartModifierSelectionInput[],
): Quantities {
  if (mode === "edit" && initialModifiers) {
    return initialQuantitiesForEdit(initialModifiers);
  }
  return initialQuantitiesForAdd(item);
}

function groupError(group: CustomerMenuModifierGroup, quantities: Quantities): string | null {
  const total = group.options.reduce(
    (sum, option) =>
      sum +
      (quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ?? 0),
    0,
  );
  if (total < group.minTotalQuantity) {
    return `${group.name} requires at least ${group.minTotalQuantity} selection${group.minTotalQuantity === 1 ? "" : "s"}.`;
  }
  if (total > group.maxTotalQuantity) {
    return `${group.name} allows at most ${group.maxTotalQuantity} selections.`;
  }
  const invalidOption = group.options.find((option) => {
    const quantity =
      quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ?? 0;
    return quantity > 0 && (quantity < option.minQuantity || quantity > option.maxQuantity);
  });
  return invalidOption
    ? `${invalidOption.name} requires between ${invalidOption.minQuantity} and ${invalidOption.maxQuantity} selections.`
    : null;
}

type MenuItemCustomizationDialogProps = {
  item: CustomerMenuItem;
  mode?: CustomizationDialogMode;
  initialModifiers?: readonly CartModifierSelectionInput[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onAdd?: (modifiers: readonly CartModifierSelectionInput[]) => void;
  onSave?: (modifiers: readonly CartModifierSelectionInput[]) => void;
};

export function MenuItemCustomizationDialog(props: MenuItemCustomizationDialogProps) {
  const mode = props.mode ?? "add";
  const initializationKey = JSON.stringify({
    mode,
    item: props.item,
    initialModifiers: props.initialModifiers ?? [],
  });

  return (
    <MenuItemCustomizationDialogContents
      key={initializationKey}
      {...props}
    />
  );
}

function MenuItemCustomizationDialogContents(props: MenuItemCustomizationDialogProps) {
  const mode = props.mode ?? "add";
  const { item } = props;
  const [quantities, setQuantities] = useState<Quantities>(() =>
    resolveInitialQuantities(mode, item, props.initialModifiers),
  );

  const groups = useMemo(
    () => [...(item.modifierGroups ?? [])].sort((a, b) => a.position - b.position),
    [item.modifierGroups],
  );
  const errors = groups
    .map((group) => groupError(group, quantities))
    .filter((error): error is string => error !== null);
  const valid = errors.length === 0;

  function setQuantity(
    group: CustomerMenuModifierGroup,
    optionId: string,
    nextQuantity: number,
  ): void {
    setQuantities((current) => {
      const key = selectionKey(group.variantModifierGroupId, optionId);
      const otherTotal = group.options.reduce(
        (sum, option) =>
          option.modifierGroupOptionId === optionId
            ? sum
            : sum +
              (current[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ??
                0),
        0,
      );
      const option = group.options.find((candidate) => candidate.modifierGroupOptionId === optionId)!;
      const quantity = Math.max(
        0,
        Math.min(nextQuantity, option.maxQuantity, group.maxTotalQuantity - otherTotal),
      );
      return quantity === 0
        ? Object.fromEntries(Object.entries(current).filter(([entry]) => entry !== key))
        : { ...current, [key]: quantity };
    });
  }

  const modifiers = groups.flatMap((group) =>
    group.options.flatMap((option) => {
      const quantity =
        quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ?? 0;
      return quantity > 0
        ? [
            {
              variantModifierGroupId: group.variantModifierGroupId,
              modifierGroupOptionId: option.modifierGroupOptionId,
              quantity,
            },
          ]
        : [];
    }),
  );
  const itemTotalPaise = item.displayPricePaise + groups.reduce(
    (groupSum, group) => groupSum + group.options.reduce(
      (optionSum, option) => optionSum +
        (quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ?? 0) *
          option.displayPriceDeltaPaise,
      0,
    ),
    0,
  );

  const dialogTitle =
    mode === "edit" ? `Edit customization for ${item.name}` : `Customize ${item.name}`;
  const submitLabel = mode === "edit" ? "Save changes" : `Add to cart · ${formatPaise(itemTotalPaise)}`;
  const pendingLabel = mode === "edit" ? "Saving…" : "Adding…";

  function handleSubmit(): void {
    if (mode === "edit") {
      props.onSave?.(modifiers);
      return;
    }
    props.onAdd?.(modifiers);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customization-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 md:py-10"
    >
      <div className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-page)] shadow-xl">
        <div className="min-h-0 overflow-y-auto p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            {item.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagePath} alt="" width={112} height={112} className="hidden h-28 w-28 shrink-0 rounded-lg object-cover sm:block" />
            ) : null}
            <div>
            <h2
              id="customization-title"
              className="font-display text-[28px] text-[var(--text-primary)]"
            >
              {dialogTitle}
            </h2>
            <p className="font-body text-[14px] text-[var(--text-secondary)]">
              Base price {formatPaise(item.displayPricePaise)}
            </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close customization"
            onClick={props.onClose}
            disabled={props.pending}
          >
            Close
          </Button>
        </div>
        {groups.map((group) => {
          const total = group.options.reduce(
            (sum, option) =>
              sum +
              (quantities[selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)] ??
                0),
            0,
          );
          return (
            <fieldset
              key={group.variantModifierGroupId}
              className="flex flex-col gap-3 border-t border-[var(--border-default)] pt-4"
            >
              <legend className="font-body font-bold text-[16px] text-[var(--text-primary)]">
                {group.name}{" "}
                <span className="font-normal text-[var(--text-secondary)]">
                  ({group.required ? "Required" : "Optional"})
                </span>
              </legend>
              <p className="font-body text-[13px] text-[var(--text-secondary)]">
                Choose {group.minTotalQuantity}–{group.maxTotalQuantity}.
              </p>
              {[...group.options]
                .sort((a, b) => a.position - b.position)
                .map((option) => {
                  const quantity =
                    quantities[
                      selectionKey(group.variantModifierGroupId, option.modifierGroupOptionId)
                    ] ?? 0;
                  if (option.maxQuantity <= 1) {
                    return (
                      <label
                        key={option.modifierGroupOptionId}
                        className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 transition-colors ${quantity > 0 ? "border-[var(--interactive-primary)] bg-[var(--interactive-ghost-hover)]" : "border-[var(--border-default)] bg-[var(--bg-section)]"}`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={quantity > 0}
                            disabled={
                              props.pending || (quantity === 0 && total >= group.maxTotalQuantity)
                            }
                            onChange={(event) =>
                              setQuantity(
                                group,
                                option.modifierGroupOptionId,
                                event.target.checked ? 1 : 0,
                              )
                            }
                          />
                          <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full border text-[12px] ${quantity > 0 ? "border-[var(--interactive-primary)] bg-[var(--interactive-primary)] text-[var(--text-on-primary)]" : "border-[var(--border-strong)]"}`}>{quantity > 0 ? "✓" : ""}</span>
                          <span className="font-body text-[15px] text-[var(--text-primary)]">
                            {option.name}
                          </span>
                          {quantity > 0 && option.displayPriceDeltaPaise === 0 ? <span className="font-body text-[12px] font-semibold text-[var(--interactive-primary-pressed)]">Included</span> : null}
                        </span>
                        {option.displayPriceDeltaPaise !== 0 ? (
                          <span className="font-body text-[14px] text-[var(--text-secondary)]">
                            {option.displayPriceDeltaPaise > 0 ? "+" : ""}
                            {formatPaise(option.displayPriceDeltaPaise)}
                          </span>
                        ) : null}
                      </label>
                    );
                  }
                  return (
                    <div
                      key={option.modifierGroupOptionId}
                      className="flex min-h-[44px] items-center justify-between gap-3"
                    >
                      <span className="font-body text-[15px] text-[var(--text-primary)]">
                        {option.name}
                        {option.displayPriceDeltaPaise !== 0
                          ? ` (${option.displayPriceDeltaPaise > 0 ? "+" : ""}${formatPaise(option.displayPriceDeltaPaise)})`
                          : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] md:min-h-8 md:min-w-8"
                          aria-label={`Decrease ${option.name}`}
                          disabled={props.pending || quantity === 0}
                          onClick={() =>
                            setQuantity(group, option.modifierGroupOptionId, quantity - 1)
                          }
                        >
                          −
                        </Button>
                        <span aria-live="polite">{quantity}</span>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] md:min-h-8 md:min-w-8"
                          aria-label={`Increase ${option.name}`}
                          disabled={
                            props.pending ||
                            quantity >= option.maxQuantity ||
                            total >= group.maxTotalQuantity
                          }
                          onClick={() =>
                            setQuantity(group, option.modifierGroupOptionId, quantity + 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </fieldset>
          );
        })}
        {errors.length > 0 ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {errors[0]}
          </p>
        ) : null}
        {props.error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {props.error}
          </p>
        ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border-default)] bg-[var(--bg-section)] p-4 md:px-6">
          <div>
            <span className="block font-body text-[12px] text-[var(--text-secondary)]">Item total</span>
            <strong className="font-body text-[20px] text-[var(--text-primary)]">{formatPaise(itemTotalPaise)}</strong>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px] min-w-[13rem]"
            disabled={!valid || props.pending}
            onClick={handleSubmit}
          >
            {props.pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
