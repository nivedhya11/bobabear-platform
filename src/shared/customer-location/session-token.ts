/**
 * Google Places Autocomplete (New) session-token helpers.
 *
 * Session tokens are billing grouping identifiers, not credentials.
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLocationSearchSessionToken(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

export function createLocationSearchSessionToken(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  const token = randomUuid();
  if (!isLocationSearchSessionToken(token)) {
    throw new Error("Location search session token must be UUID v4.");
  }
  return token;
}
