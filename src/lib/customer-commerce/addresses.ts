/**
 * Address transport wrappers needed for Checkout destination (IMP-025).
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CommerceAddress, CommerceAddressCreateInput } from "./types";

export async function listOwnAddresses(): Promise<
  CommerceHttpResult<{ addresses: readonly CommerceAddress[] }>
> {
  return commerceRequest("/api/v1/me/addresses", { method: "GET" });
}

export async function createOwnAddress(
  input: CommerceAddressCreateInput,
): Promise<CommerceHttpResult<{ address: CommerceAddress }>> {
  return commerceRequest("/api/v1/me/addresses", {
    method: "POST",
    body: input,
  });
}
