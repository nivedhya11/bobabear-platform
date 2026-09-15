/**
 * Display helpers for INR ↔ paise. Authoritative money remains integer paise on the server.
 * Do not use floating-point for conversion.
 */

const PAISE_PER_RUPEE = BigInt(100);

export function formatInrFromPaise(paise: string | number | bigint | null | undefined): string {
  if (paise === null || paise === undefined || paise === "") return "—";
  let value: bigint;
  try {
    value = typeof paise === "bigint" ? paise : BigInt(String(paise));
  } catch {
    return "—";
  }
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const rupees = abs / PAISE_PER_RUPEE;
  const fraction = abs % PAISE_PER_RUPEE;
  const formatted = `${rupees.toString()}.${fraction.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}₹${formatted}`;
}

/** Parse an INR amount typed as rupees (optional decimal) into a paise decimal string. */
export function parseInrToPaise(input: string): string | null {
  const trimmed = input.trim().replace(/^₹/, "").replace(/,/g, "");
  if (!trimmed) return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const sign = match[1] === "-" ? BigInt(-1) : BigInt(1);
  const whole = BigInt(match[2]!);
  const fractionRaw = match[3] ?? "0";
  const fraction = BigInt(fractionRaw.padEnd(2, "0"));
  return (sign * (whole * PAISE_PER_RUPEE + fraction)).toString();
}
