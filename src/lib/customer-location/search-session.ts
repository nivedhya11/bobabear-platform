/**
 * Client-side Places Autocomplete session lifecycle (IMP-036B).
 *
 * One UUID v4 per search-selection session. Autocomplete and the subsequent
 * Place Details share the token. Completing a selection retires it.
 */
import { createLocationSearchSessionToken } from "@/shared/customer-location/session-token";

export type LocationSearchSession = Readonly<{
  token: string;
  completed: boolean;
}>;

export function startLocationSearchSession(): LocationSearchSession {
  return Object.freeze({
    token: createLocationSearchSessionToken(),
    completed: false,
  });
}

export function completeLocationSearchSession(
  session: LocationSearchSession,
): LocationSearchSession {
  return Object.freeze({ token: session.token, completed: true });
}

export function sessionTokenForAutocomplete(session: LocationSearchSession | null): string | null {
  if (!session || session.completed) return null;
  return session.token;
}

export function sessionTokenForPlaceDetails(session: LocationSearchSession | null): string | null {
  if (!session || session.completed) return null;
  return session.token;
}
