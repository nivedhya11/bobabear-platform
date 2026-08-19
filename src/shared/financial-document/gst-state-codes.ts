/**
 * Local GST 2-digit State/UT code → legal name registry (IMP-028 C1 correction).
 *
 * Authority for place-of-supply State name projection when the sealed statutory
 * State code is already on the Financial Document. Not an external/API lookup.
 * Unknown codes fail closed at issuance / projection boundaries.
 *
 * Includes current GST portal codes plus retained historical codes still seen
 * on GSTIN prefixes (e.g. 25, 28) so sealed historical codes remain mappable.
 */

export type GstStateCodeEntry = Readonly<{
  code: string;
  name: string;
}>;

/**
 * Complete supported GST State/UT code domain for Financial Document
 * place-of-supply projection. Codes are exactly two decimal digits.
 */
export const GST_STATE_CODES: readonly GstStateCodeEntry[] = Object.freeze([
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman and Diu" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
]);

const BY_CODE: ReadonlyMap<string, string> = new Map(
  GST_STATE_CODES.map((entry) => [entry.code, entry.name]),
);

export function isGstStateCode(value: unknown): value is string {
  return typeof value === "string" && BY_CODE.has(value);
}

export function getGstStateName(code: string): string | undefined {
  return BY_CODE.get(code);
}

/**
 * Resolve statutory State name from an already-sealed GST 2-digit code.
 * Returns null when the code is absent or outside the supported domain.
 */
export function resolveGstStateNameFromCode(
  code: string | null | undefined,
): string | null {
  if (typeof code !== "string" || !/^[0-9]{2}$/.test(code)) {
    return null;
  }
  return getGstStateName(code) ?? null;
}
