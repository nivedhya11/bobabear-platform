/**
 * ISO 3166-2:IN subdivision registry for Address state_code (IMP-018).
 *
 * Complete canonical codes for Indian States and Union Territories.
 * Display names are derived from this registry — never persisted on Address.
 * Not a GST 2-digit mapping; GST tax profiles remain separate.
 */

export type IndiaSubdivisionCode =
  | "IN-AN"
  | "IN-AP"
  | "IN-AR"
  | "IN-AS"
  | "IN-BR"
  | "IN-CH"
  | "IN-CT"
  | "IN-DH"
  | "IN-DL"
  | "IN-GA"
  | "IN-GJ"
  | "IN-HP"
  | "IN-HR"
  | "IN-JH"
  | "IN-JK"
  | "IN-KA"
  | "IN-KL"
  | "IN-LA"
  | "IN-LD"
  | "IN-MH"
  | "IN-ML"
  | "IN-MN"
  | "IN-MP"
  | "IN-MZ"
  | "IN-NL"
  | "IN-OR"
  | "IN-PB"
  | "IN-PY"
  | "IN-RJ"
  | "IN-SK"
  | "IN-TG"
  | "IN-TN"
  | "IN-TR"
  | "IN-UP"
  | "IN-UT"
  | "IN-WB";

export type IndiaSubdivision = Readonly<{
  code: IndiaSubdivisionCode;
  name: string;
  kind: "state" | "union_territory";
}>;

/**
 * Authoritative ISO 3166-2:IN registry (36 subdivisions).
 * Odisha uses IN-OR (ISO), Uttarakhand uses IN-UT (ISO).
 * Dadra and Nagar Haveli and Daman and Diu uses the merged IN-DH code.
 */
export const INDIA_SUBDIVISIONS: readonly IndiaSubdivision[] = Object.freeze([
  { code: "IN-AN", name: "Andaman and Nicobar Islands", kind: "union_territory" },
  { code: "IN-AP", name: "Andhra Pradesh", kind: "state" },
  { code: "IN-AR", name: "Arunachal Pradesh", kind: "state" },
  { code: "IN-AS", name: "Assam", kind: "state" },
  { code: "IN-BR", name: "Bihar", kind: "state" },
  { code: "IN-CH", name: "Chandigarh", kind: "union_territory" },
  { code: "IN-CT", name: "Chhattisgarh", kind: "state" },
  {
    code: "IN-DH",
    name: "Dadra and Nagar Haveli and Daman and Diu",
    kind: "union_territory",
  },
  { code: "IN-DL", name: "Delhi", kind: "union_territory" },
  { code: "IN-GA", name: "Goa", kind: "state" },
  { code: "IN-GJ", name: "Gujarat", kind: "state" },
  { code: "IN-HP", name: "Himachal Pradesh", kind: "state" },
  { code: "IN-HR", name: "Haryana", kind: "state" },
  { code: "IN-JH", name: "Jharkhand", kind: "state" },
  { code: "IN-JK", name: "Jammu and Kashmir", kind: "union_territory" },
  { code: "IN-KA", name: "Karnataka", kind: "state" },
  { code: "IN-KL", name: "Kerala", kind: "state" },
  { code: "IN-LA", name: "Ladakh", kind: "union_territory" },
  { code: "IN-LD", name: "Lakshadweep", kind: "union_territory" },
  { code: "IN-MH", name: "Maharashtra", kind: "state" },
  { code: "IN-ML", name: "Meghalaya", kind: "state" },
  { code: "IN-MN", name: "Manipur", kind: "state" },
  { code: "IN-MP", name: "Madhya Pradesh", kind: "state" },
  { code: "IN-MZ", name: "Mizoram", kind: "state" },
  { code: "IN-NL", name: "Nagaland", kind: "state" },
  { code: "IN-OR", name: "Odisha", kind: "state" },
  { code: "IN-PB", name: "Punjab", kind: "state" },
  { code: "IN-PY", name: "Puducherry", kind: "union_territory" },
  { code: "IN-RJ", name: "Rajasthan", kind: "state" },
  { code: "IN-SK", name: "Sikkim", kind: "state" },
  { code: "IN-TG", name: "Telangana", kind: "state" },
  { code: "IN-TN", name: "Tamil Nadu", kind: "state" },
  { code: "IN-TR", name: "Tripura", kind: "state" },
  { code: "IN-UP", name: "Uttar Pradesh", kind: "state" },
  { code: "IN-UT", name: "Uttarakhand", kind: "state" },
  { code: "IN-WB", name: "West Bengal", kind: "state" },
]);

const BY_CODE: ReadonlyMap<string, IndiaSubdivision> = new Map(
  INDIA_SUBDIVISIONS.map((entry) => [entry.code, entry]),
);

export const INDIA_SUBDIVISION_CODES: readonly IndiaSubdivisionCode[] =
  Object.freeze(INDIA_SUBDIVISIONS.map((entry) => entry.code));

export function isIndiaSubdivisionCode(
  value: unknown,
): value is IndiaSubdivisionCode {
  return typeof value === "string" && BY_CODE.has(value);
}

export function getIndiaSubdivision(
  code: string,
): IndiaSubdivision | undefined {
  return BY_CODE.get(code);
}

export function getIndiaSubdivisionName(code: string): string | undefined {
  return BY_CODE.get(code)?.name;
}
