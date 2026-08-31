/**
 * Template variable validation (IMP-033).
 *
 * A notification body leaves the platform's trust boundary, so variables are
 * restricted to customer-safe presentation values. Secret-shaped and
 * internal-identifier-shaped material is rejected before it can reach a
 * template, not redacted afterwards.
 */
import { NotificationError } from "./errors";

/** Variable names that would carry credentials or internal identity. */
const FORBIDDEN_VARIABLE_NAME_PATTERN = /secret|password|token|cvv|pin|internal/i;

/** Values shaped like credentials or opaque internal identifiers. */
const SECRET_SHAPED_VALUE_PATTERNS: readonly RegExp[] = Object.freeze([
  // Provider key prefixes (rzp_live_…, sk_test_…, whsec_…, Bearer …).
  /\b(?:rzp|sk|pk|api|whsec)_[a-z]*_?[A-Za-z0-9]{8,}/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
  // JWT.
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  // "password: hunter2" / "token=abc123…" style embedded secrets.
  /\b(?:secret|password|token|api[_-]?key)\b\s*[:=]\s*\S+/i,
  // Long unbroken high-entropy-ish blobs (hex digests, base64 keys).
  /\b[0-9a-f]{32,}\b/i,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/,
]);

export const NOTIFICATION_TEMPLATE_VARIABLE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
export const NOTIFICATION_TEMPLATE_VARIABLE_VALUE_MAX_LENGTH = 512 as const;

function reject(message: string, field: string): never {
  throw new NotificationError(
    "NOTIFICATION_TEMPLATE_VARIABLES_INVALID",
    message,
    { field },
  );
}

/**
 * Validate a variable map against the template's declared schema.
 *
 * Returns a frozen copy on success. Throws
 * `NOTIFICATION_TEMPLATE_VARIABLES_INVALID` otherwise — the caller must not
 * fall back to sending a partially validated body.
 */
export function validateTemplateVariables(
  variables: Readonly<Record<string, string>>,
  declaredSchema?: readonly string[],
): Readonly<Record<string, string>> {
  if (typeof variables !== "object" || variables === null) {
    reject("Template variables must be an object.", "variables");
  }

  const validated: Record<string, string> = {};

  for (const [name, value] of Object.entries(variables)) {
    if (!NOTIFICATION_TEMPLATE_VARIABLE_NAME_PATTERN.test(name)) {
      reject(
        `Template variable name "${name}" is not a valid identifier.`,
        "variables",
      );
    }
    if (FORBIDDEN_VARIABLE_NAME_PATTERN.test(name)) {
      reject(
        `Template variable "${name}" names forbidden secret or internal material.`,
        "variables",
      );
    }
    if (typeof value !== "string") {
      reject(`Template variable "${name}" must be a string.`, "variables");
    }
    if (value.length > NOTIFICATION_TEMPLATE_VARIABLE_VALUE_MAX_LENGTH) {
      reject(
        `Template variable "${name}" exceeds ${NOTIFICATION_TEMPLATE_VARIABLE_VALUE_MAX_LENGTH} characters.`,
        "variables",
      );
    }
    for (const pattern of SECRET_SHAPED_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        reject(
          `Template variable "${name}" contains secret-shaped material.`,
          "variables",
        );
      }
    }
    validated[name] = value;
  }

  if (declaredSchema) {
    const declared = new Set(declaredSchema);
    for (const required of declared) {
      if (!(required in validated)) {
        reject(`Template variable "${required}" is required.`, "variables");
      }
    }
    for (const provided of Object.keys(validated)) {
      if (!declared.has(provided)) {
        reject(
          `Template variable "${provided}" is not declared by the template.`,
          "variables",
        );
      }
    }
  }

  return Object.freeze(validated);
}

export function parseTemplateVariableSchema(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  const names = value.filter((entry): entry is string => typeof entry === "string");
  return Object.freeze([...names]);
}
