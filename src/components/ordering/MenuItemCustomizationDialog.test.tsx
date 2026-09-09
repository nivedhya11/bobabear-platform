import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MenuItemCustomizationDialog } from "./MenuItemCustomizationDialog";
import type { CustomerMenuItem } from "@/shared/customer-menu/types";

const baseItem: CustomerMenuItem = {
  productId: "prod-1",
  variantId: "var-1",
  sectionId: "sec-1",
  name: "Classic Milk Tea",
  description: null,
  imagePath: null,
  displayPricePaise: 19900,
  currency: "INR",
  modifierGroups: [
    {
      modifierGroupId: "group-1",
      variantModifierGroupId: "vmg-1",
      name: "Toppings",
      required: false,
      minTotalQuantity: 0,
      maxTotalQuantity: 3,
      position: 0,
      options: [
        {
          modifierOptionId: "opt-pearl",
          modifierGroupOptionId: "mgo-pearl",
          name: "Pearl",
          minQuantity: 0,
          maxQuantity: 3,
          defaultQuantity: 0,
          position: 0,
          displayPriceDeltaPaise: 2000,
          currency: "INR",
        },
        {
          modifierOptionId: "opt-jelly",
          modifierGroupOptionId: "mgo-jelly",
          name: "Jelly",
          minQuantity: 0,
          maxQuantity: 3,
          defaultQuantity: 0,
          position: 1,
          displayPriceDeltaPaise: 1500,
          currency: "INR",
        },
      ],
    },
  ],
};

describe("MenuItemCustomizationDialog stale / unavailable modifier recovery", () => {
  it("A: sold_out/unavailable selection omitted from projection stays editable for decrease only", async () => {
    const onSave = vi.fn();
    // Projection omitted the previously selected Pearl (sold_out) — only Jelly remains.
    const itemWithoutPearl: CustomerMenuItem = {
      ...baseItem,
      modifierGroups: [
        {
          ...baseItem.modifierGroups![0]!,
          options: [baseItem.modifierGroups![0]!.options[1]!],
        },
      ],
    };

    render(
      <MenuItemCustomizationDialog
        item={itemWithoutPearl}
        mode="edit"
        initialModifiers={[
          {
            variantModifierGroupId: "vmg-1",
            modifierGroupOptionId: "mgo-pearl",
            quantity: 2,
          },
        ]}
        pending={false}
        error={null}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    expect(screen.getByTestId("stale-modifier-recovery")).toBeInTheDocument();
    expect(
      screen.getByText(/Previously selected option is no longer available/),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const increase = screen.getByRole("button", {
      name: /Increase Previously selected option is no longer available/i,
    });
    expect(increase).toBeDisabled();

    const save = screen.getByRole("button", { name: /Save changes/i });
    expect(save).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", {
        name: /Remove Previously selected option is no longer available/i,
      }),
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(save).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", {
        name: /Remove Previously selected option is no longer available/i,
      }),
    );
    expect(screen.queryByTestId("stale-modifier-recovery")).not.toBeInTheDocument();
    expect(save).toBeEnabled();

    await userEvent.click(save);
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it("B: excluded/absent persisted selection blocks Save until explicitly removed", async () => {
    const onSave = vi.fn();
    render(
      <MenuItemCustomizationDialog
        item={baseItem}
        mode="edit"
        initialModifiers={[
          {
            variantModifierGroupId: "vmg-1",
            modifierGroupOptionId: "mgo-pearl",
            quantity: 1,
          },
          {
            variantModifierGroupId: "vmg-missing",
            modifierGroupOptionId: "mgo-missing",
            quantity: 1,
          },
        ]}
        pending={false}
        error={null}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    expect(screen.getByTestId("stale-modifier-recovery")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: /Save changes/i });
    expect(save).toBeDisabled();

    // Attempting Save while unresolved must not fire (and payload would retain stale).
    await userEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", {
        name: /Remove Previously selected option is no longer available/i,
      }),
    );
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(onSave).toHaveBeenCalledWith([
      {
        variantModifierGroupId: "vmg-1",
        modifierGroupOptionId: "mgo-pearl",
        quantity: 1,
      },
    ]);
  });
});
