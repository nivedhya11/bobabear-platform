/**
 * Order number generation (IMP-023).
 *
 * Format: ORD- + exactly 12 Crockford Base32 characters from an unbiased
 * 60-bit cryptographic random value. Injectable generator port for tests.
 */

import { randomBytes } from "node:crypto";

import {
  ORDER_NUMBER_BODY_LENGTH,
  ORDER_NUMBER_CROCKFORD_ALPHABET,
  ORDER_NUMBER_PREFIX,
} from "../../shared/order";

export type OrderNumberGenerator = () => string;

const ALPHABET = ORDER_NUMBER_CROCKFORD_ALPHABET;

/**
 * Encode a 60-bit unsigned integer as exactly 12 Crockford Base32 chars.
 * Uses 5 bits per character.
 */
export function encodeCrockford60(value: bigint): string {
  let remaining = value & ((BigInt(1) << BigInt(60)) - BigInt(1));
  const chars: string[] = [];
  for (let i = 0; i < ORDER_NUMBER_BODY_LENGTH; i++) {
    const idx = Number(remaining & BigInt(0x1f));
    chars.push(ALPHABET[idx]!);
    remaining >>= BigInt(5);
  }
  return chars.reverse().join("");
}

/** Unbiased 60-bit value from Node crypto. */
export function random60Bit(): bigint {
  const bytes = randomBytes(8);
  // Take low 60 bits of a 64-bit random value.
  const full =
    (BigInt(bytes[0]!) << BigInt(56)) |
    (BigInt(bytes[1]!) << BigInt(48)) |
    (BigInt(bytes[2]!) << BigInt(40)) |
    (BigInt(bytes[3]!) << BigInt(32)) |
    (BigInt(bytes[4]!) << BigInt(24)) |
    (BigInt(bytes[5]!) << BigInt(16)) |
    (BigInt(bytes[6]!) << BigInt(8)) |
    BigInt(bytes[7]!);
  return full & ((BigInt(1) << BigInt(60)) - BigInt(1));
}

export function generateOrderNumber(): string {
  return `${ORDER_NUMBER_PREFIX}${encodeCrockford60(random60Bit())}`;
}

export const cryptoOrderNumberGenerator: OrderNumberGenerator =
  generateOrderNumber;

export function fixedOrderNumberGenerator(
  numbers: readonly string[],
): OrderNumberGenerator {
  let i = 0;
  return () => {
    const next = numbers[i];
    if (next === undefined) {
      throw new Error("fixedOrderNumberGenerator exhausted");
    }
    i += 1;
    return next;
  };
}
