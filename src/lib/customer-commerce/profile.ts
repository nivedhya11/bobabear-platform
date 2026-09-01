/**
 * Customer Profile transport wrappers (IMP-036B).
 */
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CommerceProfile, CommerceProfileCreateInput, CommerceProfileUpdateInput } from "./types";

export async function getOwnProfile(): Promise<
  CommerceHttpResult<{ profile: CommerceProfile | null }>
> {
  return commerceRequest("/api/v1/me/profile", { method: "GET" });
}

export async function createOwnProfile(
  input: CommerceProfileCreateInput,
): Promise<CommerceHttpResult<{ profile: CommerceProfile }>> {
  return commerceRequest("/api/v1/me/profile", {
    method: "POST",
    body: input,
  });
}

export async function updateOwnProfile(
  input: CommerceProfileUpdateInput,
): Promise<CommerceHttpResult<{ profile: CommerceProfile }>> {
  return commerceRequest("/api/v1/me/profile", {
    method: "PATCH",
    body: input,
  });
}

export async function deleteOwnProfile(): Promise<CommerceHttpResult<undefined>> {
  return commerceRequest("/api/v1/me/profile", { method: "DELETE" });
}
