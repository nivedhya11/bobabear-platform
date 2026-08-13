/**
 * Display helper for wire paise decimal strings. Not commercial authority.
 */

export function formatPaise(paise: string | number | bigint | undefined): string {
  if (paise === undefined || paise === null) return "—";
  try {
    const value = typeof paise === "bigint" ? paise : BigInt(String(paise));
    const zero = BigInt(0);
    const hundred = BigInt(100);
    const negative = value < zero;
    const abs = negative ? -value : value;
    const rupees = abs / hundred;
    const fraction = abs % hundred;
    return `${negative ? "-" : ""}₹${rupees.toString()}.${fraction.toString().padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

export function formatRupees(rupees: number): string {
  return `₹${rupees}`;
}
