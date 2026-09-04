import { describe, expect, it } from "vitest";

import {
  firstInvalidAddressField,
  validateAddressFormValues,
  type AddressFormValues,
} from "./AddressForm";

const base: AddressFormValues = {
  recipientName: "Founder",
  recipientPhone: "9876543210",
  addressLine1: "C-802",
  addressLine2: "",
  landmark: "",
  locality: "",
  city: "Dehradun",
  stateCode: "IN-UT",
  postalCode: "248002",
  label: "",
};

describe("AddressForm field validation", () => {
  it("rejects a 9-digit mobile with a field-level 10-digit message", () => {
    const errors = validateAddressFormValues(
      { ...base, recipientPhone: "987654321" },
      { requireAdministrativeFields: true },
    );
    expect(errors.recipientPhone).toBe("Enter a valid 10-digit mobile number.");
    expect(firstInvalidAddressField(errors)).toBe("recipientPhone");
  });

  it("clears mobile error for a valid Indian mobile", () => {
    const errors = validateAddressFormValues(base, { requireAdministrativeFields: true });
    expect(errors.recipientPhone).toBeUndefined();
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("marks required address and recipient fields when empty", () => {
    const errors = validateAddressFormValues(
      {
        ...base,
        recipientName: "",
        addressLine1: "  ",
        recipientPhone: "",
      },
      { requireAdministrativeFields: false },
    );
    expect(errors.addressLine1).toMatch(/required/i);
    expect(errors.recipientName).toMatch(/required/i);
    expect(errors.recipientPhone).toBe("Enter a valid 10-digit mobile number.");
    expect(firstInvalidAddressField(errors)).toBe("addressLine1");
  });
});
