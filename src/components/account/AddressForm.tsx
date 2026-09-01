"use client";

import { INDIA_SUBDIVISIONS } from "@/shared/customer-addresses";

export const ADDRESS_LABEL_OPTIONS = ["Home", "Work", "Other"] as const;

export type AddressFormValues = Readonly<{
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  locality: string;
  city: string;
  stateCode: string;
  postalCode: string;
  label: string;
}>;

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  recipientName: "",
  recipientPhone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  locality: "",
  city: "",
  stateCode: "",
  postalCode: "",
  label: "",
};

const FIELD_CLASS =
  "mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3 font-body text-[15px]";

export function AddressForm(props: {
  values: AddressFormValues;
  onChange: (values: AddressFormValues) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const prefix = props.idPrefix ?? "address";
  const { values, onChange, disabled = false } = props;

  function patch(field: keyof AddressFormValues, value: string): void {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="font-body text-[13px] font-semibold">
        Recipient name
        <input
          required
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.recipientName}
          autoComplete="name"
          onChange={(event) => patch("recipientName", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        Mobile number
        <input
          required
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.recipientPhone}
          autoComplete="tel"
          inputMode="tel"
          onChange={(event) => patch("recipientPhone", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        Address line 1
        <input
          required
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.addressLine1}
          autoComplete="address-line1"
          onChange={(event) => patch("addressLine1", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        Address line 2
        <input
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.addressLine2}
          autoComplete="address-line2"
          onChange={(event) => patch("addressLine2", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        Landmark
        <input
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.landmark}
          onChange={(event) => patch("landmark", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        Locality
        <input
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.locality}
          onChange={(event) => patch("locality", event.target.value)}
        />
      </label>
      <label className="font-body text-[13px] font-semibold">
        City
        <input
          required
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.city}
          autoComplete="address-level2"
          onChange={(event) => patch("city", event.target.value)}
        />
      </label>
      <div className="flex flex-col">
        <label htmlFor={`${prefix}-state`} className="font-body text-[13px] font-semibold">
          State
        </label>
        <select
          id={`${prefix}-state`}
          required
          disabled={disabled}
          className={`${FIELD_CLASS} bg-[var(--bg-page)]`}
          value={values.stateCode}
          autoComplete="address-level1"
          onChange={(event) => patch("stateCode", event.target.value)}
        >
          <option value="">Select state</option>
          {INDIA_SUBDIVISIONS.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>
      <label className="font-body text-[13px] font-semibold">
        PIN code
        <input
          required
          disabled={disabled}
          className={FIELD_CLASS}
          value={values.postalCode}
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) =>
            patch("postalCode", event.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
      </label>
      <div className="flex flex-col">
        <label htmlFor={`${prefix}-label`} className="font-body text-[13px] font-semibold">
          Label
        </label>
        <select
          id={`${prefix}-label`}
          disabled={disabled}
          className={`${FIELD_CLASS} bg-[var(--bg-page)]`}
          value={values.label}
          onChange={(event) => patch("label", event.target.value)}
        >
          <option value="">No label</option>
          {ADDRESS_LABEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function addressFormFromCommerceAddress(
  address: import("@/lib/customer-commerce").CommerceAddress,
): AddressFormValues {
  return {
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    landmark: address.landmark ?? "",
    locality: address.locality ?? "",
    city: address.city,
    stateCode: address.stateCode,
    postalCode: address.postalCode,
    label: address.label ?? "",
  };
}

export function addressFormToCreateInput(values: AddressFormValues) {
  return {
    recipientName: values.recipientName,
    recipientPhone: values.recipientPhone,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2 || null,
    landmark: values.landmark || null,
    locality: values.locality || null,
    city: values.city,
    stateCode: values.stateCode,
    postalCode: values.postalCode,
    label: values.label || null,
  };
}

export function addressFormToUpdateInput(values: AddressFormValues) {
  return addressFormToCreateInput(values);
}
