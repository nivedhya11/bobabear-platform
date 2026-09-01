import { randomUUID } from "node:crypto";

/** Server-issued request correlation identifier; never trust caller input. */
export function generateRequestId(): string {
  return randomUUID();
}
