"use client";

import type { MutableRefObject } from "react";

import { INDIA_SUBDIVISIONS, getIndiaSubdivisionName } from "@/shared/customer-addresses";
import { normalizeIndianMobileNumber } from "@/shared/customer-auth/phone";
import { cn } from "@/lib/utils";

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

export type AddressFormFieldKey = keyof AddressFormValues;

export type AddressFormFieldErrors = Partial<Record<AddressFormFieldKey, string>>;

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

const FIELD_INVALID_CLASS = "border-[var(--danger, #b42318)]";

const MOBILE_ERROR = "Enter a valid 10-digit mobile number.";

export function validateAddressFormValues(
  values: AddressFormValues,
  options: { requireAdministrativeFields: boolean },
): AddressFormFieldErrors {
  const errors: AddressFormFieldErrors = {};

  if (values.addressLine1.trim().length === 0) {
    errors.addressLine1 = "Flat / house / building is required.";
  }
  if (values.recipientName.trim().length === 0) {
    errors.recipientName = "Recipient name is required.";
  }
  if (values.recipientPhone.trim().length === 0) {
    errors.recipientPhone = MOBILE_ERROR;
  } else if (!normalizeIndianMobileNumber(values.recipientPhone).ok) {
    errors.recipientPhone = MOBILE_ERROR;
  }

  if (options.requireAdministrativeFields) {
    if (values.city.trim().length === 0) {
      errors.city = "City is required.";
    }
    if (values.stateCode.trim().length === 0) {
      errors.stateCode = "State is required.";
    }
    if (!/^[1-9][0-9]{5}$/.test(values.postalCode.trim())) {
      errors.postalCode = "Enter a valid 6-digit PIN code.";
    }
  }

  return errors;
}

export function firstInvalidAddressField(
  errors: AddressFormFieldErrors,
  order: readonly AddressFormFieldKey[] = [
    "addressLine1",
    "addressLine2",
    "landmark",
    "locality",
    "city",
    "stateCode",
    "postalCode",
    "recipientName",
    "recipientPhone",
    "label",
  ],
): AddressFormFieldKey | null {
  for (const key of order) {
    if (errors[key]) return key;
  }
  return null;
}

function FieldLabel(props: {
  htmlFor: string;
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label htmlFor={props.htmlFor} className="font-body text-[13px] font-semibold">
      {props.label}
      {props.required ? (
        <span className="text-[var(--text-secondary)]"> (required)</span>
      ) : null}
      {props.optional ? (
        <span className="font-normal text-[var(--text-secondary)]"> (Optional)</span>
      ) : null}
    </label>
  );
}

function FieldError(props: { id: string; message?: string }) {
  if (!props.message) return null;
  return (
    <p id={props.id} role="alert" className="mt-1 font-body text-[12px] text-[var(--danger, #b42318)]">
      {props.message}
    </p>
  );
}

export function AddressForm(props: {
  values: AddressFormValues;
  onChange: (values: AddressFormValues) => void;
  idPrefix?: string;
  disabled?: boolean;
  /** Map-first flows supply city/state/PIN from reverse geocode; hide manual entry. */
  hideAdministrativeFields?: boolean;
  /** McDelivery-style labels and Home/Work/Other selector for map-first flows. */
  mapFirstMode?: boolean;
  fieldErrors?: AddressFormFieldErrors;
  fieldRefs?: MutableRefObject<Partial<Record<AddressFormFieldKey, HTMLElement | null>>>;
}) {
  const prefix = props.idPrefix ?? "address";
  const {
    values,
    onChange,
    disabled = false,
    hideAdministrativeFields = false,
    mapFirstMode = false,
    fieldErrors = {},
  } = props;

  function patch(field: AddressFormFieldKey, value: string): void {
    onChange({ ...values, [field]: value });
  }

  function bindRef(field: AddressFormFieldKey) {
    return (node: HTMLElement | null) => {
      if (props.fieldRefs) props.fieldRefs.current[field] = node;
    };
  }

  function inputProps(field: AddressFormFieldKey) {
    const errorId = `${prefix}-${field}-error`;
    const invalid = Boolean(fieldErrors[field]);
    return {
      id: `${prefix}-${field}`,
      ref: bindRef(field),
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? errorId : undefined,
      className: cn(FIELD_CLASS, invalid && FIELD_INVALID_CLASS),
    };
  }

  const line1Label = mapFirstMode ? "Flat / House / Building" : "Address line 1";
  const line2Label = mapFirstMode ? "Floor / Block / Unit" : "Address line 2";
  const landmarkLabel = mapFirstMode ? "Landmark / How to reach" : "Landmark";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <FieldLabel
          htmlFor={`${prefix}-addressLine1`}
          label={line1Label}
          required
        />
        <input
          required
          disabled={disabled}
          {...inputProps("addressLine1")}
          value={values.addressLine1}
          autoComplete="address-line1"
          onChange={(event) => patch("addressLine1", event.target.value)}
        />
        <FieldError id={`${prefix}-addressLine1-error`} message={fieldErrors.addressLine1} />
      </div>
      <div>
        <FieldLabel
          htmlFor={`${prefix}-addressLine2`}
          label={line2Label}
          optional
        />
        <input
          disabled={disabled}
          {...inputProps("addressLine2")}
          value={values.addressLine2}
          autoComplete="address-line2"
          onChange={(event) => patch("addressLine2", event.target.value)}
        />
        <FieldError id={`${prefix}-addressLine2-error`} message={fieldErrors.addressLine2} />
      </div>
      <div>
        <FieldLabel
          htmlFor={`${prefix}-landmark`}
          label={landmarkLabel}
          optional
        />
        <input
          disabled={disabled}
          {...inputProps("landmark")}
          value={values.landmark}
          onChange={(event) => patch("landmark", event.target.value)}
        />
        <FieldError id={`${prefix}-landmark-error`} message={fieldErrors.landmark} />
      </div>
      {!hideAdministrativeFields ? (
        <div>
          <FieldLabel htmlFor={`${prefix}-locality`} label="Locality" optional />
          <input
            disabled={disabled}
            {...inputProps("locality")}
            value={values.locality}
            onChange={(event) => patch("locality", event.target.value)}
          />
          <FieldError id={`${prefix}-locality-error`} message={fieldErrors.locality} />
        </div>
      ) : null}
      {hideAdministrativeFields ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)] p-3 font-body text-[13px] text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">Area details from map</p>
          <p className="whitespace-pre-line">
            {formatReadOnlyAreaSummary(values)}
          </p>
        </div>
      ) : (
        <>
          <div>
            <FieldLabel htmlFor={`${prefix}-city`} label="City" required />
            <input
              required
              disabled={disabled}
              {...inputProps("city")}
              value={values.city}
              autoComplete="address-level2"
              onChange={(event) => patch("city", event.target.value)}
            />
            <FieldError id={`${prefix}-city-error`} message={fieldErrors.city} />
          </div>
          <div>
            <FieldLabel htmlFor={`${prefix}-stateCode`} label="State" required />
            <select
              required
              disabled={disabled}
              {...inputProps("stateCode")}
              className={cn(
                FIELD_CLASS,
                "bg-[var(--bg-page)]",
                fieldErrors.stateCode && FIELD_INVALID_CLASS,
              )}
              value={values.stateCode}
              onChange={(event) => patch("stateCode", event.target.value)}
            >
              <option value="">Select state</option>
              {INDIA_SUBDIVISIONS.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.name}
                </option>
              ))}
            </select>
            <FieldError id={`${prefix}-stateCode-error`} message={fieldErrors.stateCode} />
          </div>
          <div>
            <FieldLabel htmlFor={`${prefix}-postalCode`} label="PIN code" required />
            <input
              required
              disabled={disabled}
              {...inputProps("postalCode")}
              value={values.postalCode}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                patch("postalCode", event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <FieldError id={`${prefix}-postalCode-error`} message={fieldErrors.postalCode} />
          </div>
        </>
      )}
      <div>
        <FieldLabel htmlFor={`${prefix}-recipientName`} label="Recipient name" required />
        <input
          required
          disabled={disabled}
          {...inputProps("recipientName")}
          value={values.recipientName}
          autoComplete="name"
          onChange={(event) => patch("recipientName", event.target.value)}
        />
        <FieldError id={`${prefix}-recipientName-error`} message={fieldErrors.recipientName} />
      </div>
      <div>
        <FieldLabel htmlFor={`${prefix}-recipientPhone`} label="Mobile number" required />
        <input
          required
          disabled={disabled}
          {...inputProps("recipientPhone")}
          value={values.recipientPhone}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={13}
          onChange={(event) => patch("recipientPhone", event.target.value)}
        />
        <FieldError id={`${prefix}-recipientPhone-error`} message={fieldErrors.recipientPhone} />
      </div>
      {mapFirstMode ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-[13px] font-semibold">
            Save this address as
            <span className="font-normal text-[var(--text-secondary)]"> (Optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {ADDRESS_LABEL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                className={cn(
                  "rounded-full border px-4 py-2 font-body text-[14px] focus-ring",
                  values.label === option
                    ? "border-[var(--interactive-primary)] bg-[var(--interactive-primary)] text-[var(--text-on-primary)]"
                    : "border-[var(--border-strong)] bg-transparent text-[var(--text-primary)]",
                )}
                onClick={() => patch("label", option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="flex flex-col">
          <FieldLabel htmlFor={`${prefix}-label`} label="Label" optional />
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
      )}
    </div>
  );
}

function formatReadOnlyAreaSummary(values: AddressFormValues): string {
  const stateName = values.stateCode
    ? (getIndiaSubdivisionName(values.stateCode) ?? values.stateCode)
    : null;
  const cityLine = [values.city, stateName, values.postalCode].filter(Boolean).join(", ");
  const lines = [values.locality, cityLine].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "Confirmed from your map selection";
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
