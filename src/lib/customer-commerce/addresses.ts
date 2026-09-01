/**
 * Address transport wrappers (IMP-025 / IMP-036B).
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type {
  CommerceAddress,
  CommerceAddressCreateInput,
  CommerceAddressUpdateInput,
} from "./types";

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

export async function getOwnAddress(
  addressId: string,
): Promise<CommerceHttpResult<{ address: CommerceAddress }>> {
  return commerceRequest(`/api/v1/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "GET",
  });
}

export async function updateOwnAddress(
  addressId: string,
  input: CommerceAddressUpdateInput,
): Promise<CommerceHttpResult<{ address: CommerceAddress }>> {
  return commerceRequest(`/api/v1/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteOwnAddress(addressId: string): Promise<CommerceHttpResult<undefined>> {
  return commerceRequest(`/api/v1/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
  });
}

export async function setDefaultOwnAddress(
  addressId: string,
): Promise<CommerceHttpResult<{ address: CommerceAddress }>> {
  return commerceRequest(
    `/api/v1/me/addresses/${encodeURIComponent(addressId)}/default`,
    { method: "POST" },
  );
}
