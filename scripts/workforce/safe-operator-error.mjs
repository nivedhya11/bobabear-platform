/**
 * Stable, non-secret workforce operator CLI error classifications.
 * Shared by CLI support and focused regression tests.
 */

export const WORKFORCE_OPERATOR_SAFE_ERROR_CODES = Object.freeze({
  INVALID_PASSWORD_INPUT: "INVALID_PASSWORD_INPUT",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  PERSISTENCE_OR_AUTH_OPERATION_FAILED: "PERSISTENCE_OR_AUTH_OPERATION_FAILED",
});

const KNOWN_MESSAGE_TO_CODE = Object.freeze({
  "Invalid --password value (must be 15–128 characters).":
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  "Invalid password input.": WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  [WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT]:
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  "A workforce user with that email already exists.":
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.USER_ALREADY_EXISTS,
  [WORKFORCE_OPERATOR_SAFE_ERROR_CODES.USER_ALREADY_EXISTS]:
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.USER_ALREADY_EXISTS,
  [WORKFORCE_OPERATOR_SAFE_ERROR_CODES.CONFIGURATION_ERROR]:
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.CONFIGURATION_ERROR,
  [WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED]:
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED,
});

/**
 * Map an operator error message to a stable safe classification.
 * Never returns raw driver/query/secret text.
 */
export function classifyWorkforceOperatorSafeError(message) {
  if (typeof message !== "string" || message.length === 0) {
    return WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED;
  }
  const known = KNOWN_MESSAGE_TO_CODE[message];
  if (known) return known;
  if (/failed query|postgresql:\/\//i.test(message) || /secret/i.test(message)) {
    return WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED;
  }
  if (/password/i.test(message)) {
    // Length/input guidance is mapped above; any other password-bearing text is unsafe.
    return WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED;
  }
  // Preserve short, deterministic operator messages that cannot embed secrets.
  if (/^[A-Za-z0-9 _.:'-]{1,120}$/.test(message)) {
    return message;
  }
  return WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED;
}
